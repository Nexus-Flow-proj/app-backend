import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  DeepPartial,
  In,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { Canvas } from '../entities/canvas.entity';
import { Project } from '@modules/projects/entities/project.entity';
import { CanvasType } from '../enums/canvas-type.enum';
import { WorkshopCanvasResponseDto } from '../dtos/workshop/workshop-canvas-response.dto';
import { toWorkshopCanvasResponse } from '../mappers/workshop-canvas.mapper';
import { CanvasObject } from '../entities/canvas-object.entity';
import { CanvasConnection } from '../entities/canvas-connection.entity';
import { WorkshopCanvasValidator } from '../validators/workshop-canvas.validator';
import { SaveWorkshopCanvasDto } from '../dtos/workshop/save-workshop-canvas.dto';
import { SaveWorkshopCanvasObjectDto } from '../dtos/workshop/save-workshop-canvas-object.dto';
import { SaveWorkshopCanvasConnectionDto } from '../dtos/workshop/save-workshop-canvas-connection.dto';
import { SaveWorkshopFeatureDataDto } from '../dtos/workshop/save-workshop-feature-data.dto';
import { SaveWorkshopTaskDataDto } from '../dtos/workshop/save-workshop-task-data.dto';
import { SaveWorkshopStickyNoteDataDto } from '../dtos/workshop/save-workshop-sticky-note-data.dto';
import { CanvasObjectType } from '../enums/canvas-object-type.enum';
import { CanvasConnectionType } from '../enums/canvas-connection-type.enum';
import { Board } from '@modules/boards/entities/board.entity';
import { Task } from '@modules/tasks/entities/task.entity';

type ProjectWithAdmin = Project & {
  admin: Project['admin'];
};

const WORKSHOP_OBJECT_TYPES: CanvasObjectType[] = [
  CanvasObjectType.SECTION_FRAME,
  CanvasObjectType.TASK_CARD,
  CanvasObjectType.STICKY_NOTE,
];

@Injectable()
export class WorkshopCanvasService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Canvas)
    private readonly canvasRepo: Repository<Canvas>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Board)
    private readonly boardRepo: Repository<Board>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(CanvasObject)
    private readonly canvasObjectRepo: Repository<CanvasObject>,
    @InjectRepository(CanvasConnection)
    private readonly canvasConnectionRepo: Repository<CanvasConnection>,
    private readonly workshopCanvasValidator: WorkshopCanvasValidator,
  ) {}

  async getWorkshopCanvas(
    projectId: string,
  ): Promise<WorkshopCanvasResponseDto> {
    const project = await this.findProjectWithAdminOrFail(projectId);
    const canvas = await this.findOrCreateWorkshopCanvas(project, {
      lockForUpdate: false,
    });
    return toWorkshopCanvasResponse(await this.loadWorkshopCanvas(canvas.id));
  }

  async saveWorkshopCanvas(
    projectId: string,
    dto: SaveWorkshopCanvasDto,
  ): Promise<WorkshopCanvasResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const project = await this.findProjectWithAdminOrFail(projectId, manager);
      const canvas = await this.findOrCreateWorkshopCanvas(project, {
        manager,
        lockForUpdate: true,
      });

      await this.workshopCanvasValidator.validateDocumentOrThrow({
        dto,
        projectId,
        manager,
        canvasId: canvas.id,
      });

      await this.persistWorkshopDocument({
        canvasId: canvas.id,
        projectId,
        dto,
        manager,
      });

      const hydratedCanvas = await this.loadWorkshopCanvas(canvas.id, manager);
      return toWorkshopCanvasResponse(hydratedCanvas);
    });
  }

  private async findProjectWithAdminOrFail(
    projectId: string,
    manager: DataSource['manager'] = this.dataSource.manager,
  ): Promise<ProjectWithAdmin> {
    const project = await manager.getRepository(Project).findOne({
      where: { id: projectId },
      relations: {
        admin: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.admin) {
      throw new InternalServerErrorException('Project admin is missing');
    }

    return project as ProjectWithAdmin;
  }

  private async findOrCreateWorkshopCanvas(
    project: ProjectWithAdmin,
    options: {
      manager?: DataSource['manager'];
      lockForUpdate: boolean;
    } = {
      lockForUpdate: false,
    },
  ): Promise<Canvas> {
    const manager = options.manager ?? this.dataSource.manager;
    const canvasRepo = manager.getRepository(Canvas);
    const lock = options.lockForUpdate
      ? { lock: { mode: 'pessimistic_write' as const } }
      : {};
    const existingCanvas = await canvasRepo.findOne({
      where: {
        projectId: project.id,
        type: CanvasType.PROJECT,
      },
      ...lock,
    });

    if (existingCanvas) {
      return existingCanvas;
    }

    try {
      const canvas = canvasRepo.create({
        projectId: project.id,
        ownerId: project.admin!.id,
        type: CanvasType.PROJECT,
        name: 'Project Canvas',
        description: null as unknown as string,
        viewportX: 24,
        viewportY: 24,
        viewportZoom: 0.82,
      } as DeepPartial<Canvas>);

      const savedCanvas = await canvasRepo.save(canvas);

      return (await canvasRepo.findOneOrFail({
        where: { id: savedCanvas.id },
      })) as Canvas;
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as { code?: string }).code === '23505'
      ) {
        const existingAfterConflict = await canvasRepo.findOne({
          where: {
            projectId: project.id,
            type: CanvasType.PROJECT,
          },
          ...(options.lockForUpdate
            ? { lock: { mode: 'pessimistic_write' as const } }
            : {}),
        });

        if (existingAfterConflict) {
          return existingAfterConflict;
        }
      }

      throw error;
    }
  }

  private async persistWorkshopDocument(params: {
    canvasId: string;
    projectId: string;
    dto: SaveWorkshopCanvasDto;
    manager: DataSource['manager'];
  }): Promise<void> {
    const { canvasId, dto, manager } = params;
    const canvasRepo = manager.getRepository(Canvas);
    const objectRepo = manager.getRepository(CanvasObject);
    const connectionRepo = manager.getRepository(CanvasConnection);

    const currentObjects = await objectRepo.find({
      where: { canvasId },
      relations: {
        task: true,
        boardColumn: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    const currentConnections = await connectionRepo.find({
      where: { canvasId },
      order: {
        createdAt: 'ASC',
      },
    });

    const currentWorkshopObjects = currentObjects.filter((object) =>
      WORKSHOP_OBJECT_TYPES.includes(object.type),
    );
    const currentGenericObjects = currentObjects.filter(
      (object) => !WORKSHOP_OBJECT_TYPES.includes(object.type),
    );
    const currentWorkshopObjectsById = new Map(
      currentWorkshopObjects.map((object) => [object.id, object]),
    );
    const currentGenericObjectIds = new Set(
      currentGenericObjects.map((object) => object.id),
    );

    const currentWorkshopObjectIds = new Set(
      currentWorkshopObjects.map((object) => object.id),
    );
    const submittedObjectIds = new Set(dto.objects.map((object) => object.id));
    const submittedConnectionIds = new Set(
      dto.connections.map((connection) => connection.id),
    );

    const objectById = new Map(
      currentObjects.map((object) => [object.id, object]),
    );
    const connectionById = new Map(
      currentConnections.map((connection) => [connection.id, connection]),
    );

    for (const object of dto.objects) {
      const existing = objectById.get(object.id);
      if (existing && existing.canvasId !== canvasId) {
        throw new UnprocessableEntityException(
          `Workshop object '${object.id}' belongs to another canvas`,
        );
      }

      if (currentGenericObjectIds.has(object.id)) {
        throw new UnprocessableEntityException(
          `Workshop object '${object.id}' conflicts with an existing generic canvas object`,
        );
      }

      if (existing && !currentWorkshopObjectsById.has(object.id)) {
        throw new UnprocessableEntityException(
          `Workshop object '${object.id}' conflicts with a non-workshop canvas object`,
        );
      }
    }

    for (const connection of dto.connections) {
      const existing = connectionById.get(connection.id);
      if (existing && existing.canvasId !== canvasId) {
        throw new UnprocessableEntityException(
          `Workshop connection '${connection.id}' belongs to another canvas`,
        );
      }
    }

    const workshopConnectionIdsToDelete = currentConnections
      .filter(
        (connection) =>
          currentWorkshopObjectIds.has(connection.sourceObjectId) &&
          currentWorkshopObjectIds.has(connection.targetObjectId) &&
          !submittedConnectionIds.has(connection.id),
      )
      .map((connection) => connection.id);

    const workshopObjectIdsToDelete = currentWorkshopObjects
      .filter((object) => !submittedObjectIds.has(object.id))
      .map((object) => object.id);

    if (workshopConnectionIdsToDelete.length > 0) {
      await connectionRepo.delete({ id: In(workshopConnectionIdsToDelete) });
    }

    if (workshopObjectIdsToDelete.length > 0) {
      await connectionRepo
        .createQueryBuilder()
        .delete()
        .from(CanvasConnection)
        .where('canvas_id = :canvasId', { canvasId })
        .andWhere(
          '(source_object_id = ANY(:objectIds) OR target_object_id = ANY(:objectIds))',
          { objectIds: workshopObjectIdsToDelete },
        )
        .execute();

      await objectRepo.delete({
        id: In(workshopObjectIdsToDelete),
      });
    }

    const nextObjects: CanvasObject[] = [];
    for (const submittedObject of dto.objects) {
      const objectEntity = this.toCanvasObjectEntity(canvasId, submittedObject);
      nextObjects.push(objectEntity);
    }

    await objectRepo.save(nextObjects);

    const nextConnections: CanvasConnection[] = dto.connections.map(
      (connection) => this.toCanvasConnectionEntity(canvasId, connection),
    );
    await connectionRepo.save(nextConnections);

    const canvas = await canvasRepo.findOneOrFail({
      where: { id: canvasId },
      relations: {
        owner: true,
      },
    });

    canvas.viewportX = dto.viewport.x;
    canvas.viewportY = dto.viewport.y;
    canvas.viewportZoom = dto.viewport.scale;

    await canvasRepo.save(canvas);

    await canvasRepo
      .createQueryBuilder()
      .update(Canvas)
      .set({ updatedAt: () => 'CURRENT_TIMESTAMP' })
      .where('id = :canvasId', { canvasId })
      .execute();
  }

  private async loadWorkshopCanvas(
    canvasId: string,
    manager: DataSource['manager'] = this.dataSource.manager,
  ): Promise<Canvas> {
    const canvasRepo = manager.getRepository(Canvas);
    const objectRepo = manager.getRepository(CanvasObject);
    const connectionRepo = manager.getRepository(CanvasConnection);

    const canvas = await canvasRepo.findOne({
      where: { id: canvasId },
      relations: {
        owner: true,
      },
    });

    if (!canvas) {
      throw new NotFoundException('Canvas not found');
    }

    const hydratedCanvas = canvas as Canvas & {
      objects?: CanvasObject[];
      connections?: CanvasConnection[];
    };

    const objects = await objectRepo.find({
      where: {
        canvasId,
      },
      relations: {
        task: true,
        boardColumn: true,
      },
      order: {
        zIndex: 'ASC',
        createdAt: 'ASC',
      },
    });

    const workshopObjects = objects.filter((object) =>
      WORKSHOP_OBJECT_TYPES.includes(object.type),
    );
    const reconciledObjects = await this.reconcileWorkshopObjects(
      canvas.projectId,
      workshopObjects,
      manager,
    );

    hydratedCanvas.objects = reconciledObjects;
    hydratedCanvas.connections = (
      await connectionRepo.find({
        where: {
          canvasId,
        },
        order: {
          createdAt: 'ASC',
        },
      })
    ).filter((connection) => {
      const source = reconciledObjects.find(
        (object) => object.id === connection.sourceObjectId,
      );
      const target = reconciledObjects.find(
        (object) => object.id === connection.targetObjectId,
      );
      return Boolean(source && target);
    });

    return hydratedCanvas;
  }

  private async reconcileWorkshopObjects(
    projectId: string,
    workshopObjects: CanvasObject[],
    manager: DataSource['manager'],
  ): Promise<CanvasObject[]> {
    const boardColumnIds = Array.from(
      new Set(
        workshopObjects
          .filter((object) => object.type === CanvasObjectType.SECTION_FRAME)
          .map((object) => object.boardColumnId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const taskIds = Array.from(
      new Set(
        workshopObjects
          .filter((object) => object.type === CanvasObjectType.TASK_CARD)
          .map((object) => object.taskId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const boardColumns = boardColumnIds.length
      ? await manager.getRepository(Board).find({
          where: { id: In(boardColumnIds) },
          relations: { project: true },
        })
      : [];
    const boardById = new Map(boardColumns.map((board) => [board.id, board]));

    const tasks = taskIds.length
      ? await manager.getRepository(Task).find({
          where: { id: In(taskIds) },
          relations: {
            project: true,
            boardColumn: true,
          },
        })
      : [];
    const taskById = new Map(tasks.map((task) => [task.id, task]));

    const featureByBoardId = new Map<string, CanvasObject>();
    for (const object of workshopObjects) {
      if (object.type === CanvasObjectType.SECTION_FRAME) {
        featureByBoardId.set(object.boardColumnId ?? '', object);
      }
    }

    const reconciledObjects: CanvasObject[] = [];
    for (const object of workshopObjects) {
      if (object.type === CanvasObjectType.SECTION_FRAME) {
        const boardColumnId = object.boardColumnId;
        if (!boardColumnId) {
          reconciledObjects.push(object);
          continue;
        }

        const board = boardById.get(boardColumnId);
        if (!board || board.project.id !== projectId) {
          continue;
        }

        reconciledObjects.push({
          ...object,
          data: {
            ...(object.data ?? {}),
            title: board.name,
            borderColor: board.color,
          },
        });
        continue;
      }

      const taskId = object.taskId;
      if (!taskId) {
        reconciledObjects.push(object);
        continue;
      }

      const task = taskById.get(taskId);
      if (!task || task.project.id !== projectId) {
        continue;
      }

      const boardColumn = task.boardColumn;
      const dueDate =
        task.deadline instanceof Date
          ? task.deadline.toISOString().slice(0, 10)
          : task.deadline
            ? new Date(task.deadline).toISOString().slice(0, 10)
            : undefined;

      if (!boardColumn || boardColumn.project.id !== projectId) {
        reconciledObjects.push({
          ...object,
          data: {
            ...(object.data ?? {}),
            title: task.title,
            description: task.description ?? undefined,
            dueDate,
          },
        });
        continue;
      }

      const feature = featureByBoardId.get(boardColumn.id);
      if (!feature) {
        reconciledObjects.push({
          ...object,
          data: {
            ...(object.data ?? {}),
            title: task.title,
            description: task.description ?? undefined,
            dueDate,
          },
        });
        continue;
      }

      reconciledObjects.push({
        ...object,
        data: {
          ...(object.data ?? {}),
          title: task.title,
          description: task.description ?? undefined,
          dueDate,
          featureId: feature.id,
        },
      });
    }

    return reconciledObjects;
  }

  private toCanvasObjectEntity(
    canvasId: string,
    object: SaveWorkshopCanvasObjectDto,
  ): CanvasObject {
    const base = {
      id: object.id,
      canvasId,
      x: object.x,
      y: object.y,
      width: object.width,
      height: object.height,
      rotation: object.rotation,
      zIndex: object.zIndex,
      data: null,
      taskId: null,
      boardColumnId: null,
    } as DeepPartial<CanvasObject>;

    if (object.type === 'SECTION_FRAME') {
      const data = object.data as SaveWorkshopFeatureDataDto;
      return Object.assign(base, {
        type: CanvasObjectType.SECTION_FRAME,
        taskId: null,
        boardColumnId: data.boardColumnId ?? null,
        data: {
          kind: 'Feature',
          title: data.title,
          description: data.description ?? undefined,
          backgroundColor: data.backgroundColor,
          borderColor: data.borderColor,
        },
      }) as CanvasObject;
    }

    if (object.type === 'TASK_CARD') {
      const data = object.data as SaveWorkshopTaskDataDto;
      return Object.assign(base, {
        type: CanvasObjectType.TASK_CARD,
        taskId: data.taskId ?? null,
        boardColumnId: null,
        data: {
          kind: 'Task',
          featureId: data.featureId,
          title: data.title,
          description: data.description ?? undefined,
          dueDate: data.dueDate ?? undefined,
        },
      }) as CanvasObject;
    }

    const data = object.data as SaveWorkshopStickyNoteDataDto;
    return Object.assign(base, {
      type: CanvasObjectType.STICKY_NOTE,
      taskId: null,
      boardColumnId: null,
      data: {
        kind: 'Note',
        content: data.content,
        color: data.color,
        fontSize: data.fontSize,
      },
    }) as CanvasObject;
  }

  private toCanvasConnectionEntity(
    canvasId: string,
    connection: SaveWorkshopCanvasConnectionDto,
  ): CanvasConnection {
    return {
      id: connection.id,
      canvasId,
      sourceObjectId: connection.fromObjectId,
      targetObjectId: connection.toObjectId,
      type: connection.style.type as CanvasConnectionType,
      data: {
        label: connection.label ?? undefined,
        style: {
          color: connection.style.color,
          strokeWidth: connection.style.strokeWidth,
        },
      },
    } as unknown as CanvasConnection;
  }
}
