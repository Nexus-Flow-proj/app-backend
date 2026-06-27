import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Canvas } from '../entities/canvas.entity';
import { Project } from '../../projects/entities/project.entity';
import { CanvasType } from '../enums/canvas-type.enum';
import { toCanvasResponse } from '../mappers/canvas.mapper';
import { UpdateCanvasViewportDto } from '../dtos/canvas/update-canvas-viewport.dto';
import { CanvasResponseDto } from './../dtos/canvas/canvas-response.dto';
import { CanvasObject } from '../entities/canvas-object.entity';
import { CanvasObjectResponseDto } from '../dtos/object/canvas-object-response.dto';
import {
  toCanvasObjectResponse,
  toCanvasObjectResponseList,
} from '../mappers/canvas-object.mapper';
import { CreateCanvasObjectDto } from '../dtos/object/create-canvas-object.dto';
import { UpdateCanvasObjectDto } from '../dtos/object/update-canvas-object.dto';
import { Task } from '@modules/tasks/entities/task.entity';
import { CanvasObjectType } from '../enums/canvas-object-type.enum';
import { CanvasConnection } from '../entities/canvas-connection.entity';
import { CanvasConnectionResponseDto } from '../dtos/connections/canvas-connection.response.dto';
import {
  toCanvasConnectionResponse,
  toCanvasConnectionResponseList,
} from '../mappers/canvas-connection.mapper';
import { CreateCanvasConnectionDto } from '../dtos/connections/create.canvas-connection.dto';
import { CanvasConnectionType } from '../enums/canvas-connection-type.enum';

@Injectable()
export class CanvasService {
  constructor(
    @InjectRepository(Canvas)
    private readonly canvasRepo: Repository<Canvas>,

    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    @InjectRepository(CanvasObject)
    private readonly canvasObjectRepo: Repository<CanvasObject>,

    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,

    @InjectRepository(CanvasConnection)
    private readonly canvasConnectionRepo: Repository<CanvasConnection>,
  ) {}

  // Canvas Endpoints
  async getProjectCanvas(
    projectId: string,
    userId: string,
  ): Promise<CanvasResponseDto> {
    const project = await this.findProjectAndEnsureUserCanAccess(
      projectId,
      userId,
    );

    const canvas = await this.findOrCreateCanvas({
      project,
      ownerId: project.admin!.id,
      type: CanvasType.PROJECT,
      name: 'Project Canvas',
    });

    return toCanvasResponse(canvas);
  }

  async getMyCanvas(
    projectId: string,
    userId: string,
  ): Promise<CanvasResponseDto> {
    const project = await this.findProjectAndEnsureUserCanAccess(
      projectId,
      userId,
    );

    const canvas = await this.findOrCreateCanvas({
      project,
      ownerId: userId,
      type: CanvasType.PERSONAL,
      name: 'My Canvas',
    });

    return toCanvasResponse(canvas);
  }

  async updateCanvasViewport(
    canvasId: string,
    userId: string,
    dto: UpdateCanvasViewportDto,
  ): Promise<CanvasResponseDto> {
    const canvas = await this.findCanvasAndEnsureUserCanAccess(
      canvasId,
      userId,
    );

    canvas.viewportX = dto.viewportX;
    canvas.viewportY = dto.viewportY;
    canvas.viewportZoom = dto.viewportZoom;

    const savedCanvas = await this.canvasRepo.save(canvas);

    const canvasWithOwner = await this.canvasRepo.findOneOrFail({
      where: { id: savedCanvas.id },
      relations: {
        owner: true,
      },
    });

    return toCanvasResponse(canvasWithOwner);
  }

  // Object Endpoints
  async getCanvasObjects(
    canvasId: string,
    userId: string,
  ): Promise<CanvasObjectResponseDto[]> {
    await this.findCanvasAndEnsureUserCanAccess(canvasId, userId);

    const objects = await this.canvasObjectRepo.find({
      where: { canvasId },
      relations: {
        task: true,
      },
      order: {
        zIndex: 'ASC',
        createdAt: 'ASC',
      },
    });

    return toCanvasObjectResponseList(objects);
  }

  async createCanvasObject(
    canvasId: string,
    userId: string,
    dto: CreateCanvasObjectDto,
  ): Promise<CanvasObjectResponseDto> {
    const canvas = await this.findCanvasAndEnsureUserCanAccess(
      canvasId,
      userId,
    );

    let taskId: string | null = null;

    if (dto.type === CanvasObjectType.TASK) {
      if (!dto.taskId) {
        throw new BadRequestException('taskId is required for TASK objects');
      }

      const task = await this.validateTaskCanBeAddedToCanvas({
        taskId: dto.taskId,
        canvas,
        userId,
      });

      taskId = task.id;
    }

    if (dto.type !== CanvasObjectType.TASK && dto.taskId) {
      throw new BadRequestException(
        'taskId can only be provided for TASK objects',
      );
    }

    const object = this.canvasObjectRepo.create({
      canvasId,
      taskId,
      type: dto.type,
      x: dto.x,
      y: dto.y,
      width: dto.width ?? 200,
      height: dto.height ?? 120,
      zIndex: dto.zIndex ?? 0,
      data: dto.data ?? null,
    });

    const savedObject = await this.canvasObjectRepo.save(object);

    const objectWithTask = await this.canvasObjectRepo.findOneOrFail({
      where: { id: savedObject.id },
      relations: {
        task: true,
      },
    });

    return toCanvasObjectResponse(objectWithTask);
  }

  async updateCanvasObject(
    objectId: string,
    userId: string,
    dto: UpdateCanvasObjectDto,
  ): Promise<CanvasObjectResponseDto> {
    const object = await this.canvasObjectRepo.findOne({
      where: { id: objectId },
    });

    if (!object) {
      throw new NotFoundException('Canvas object not found');
    }

    await this.findCanvasAndEnsureUserCanAccess(object.canvasId, userId);

    this.applyCanvasObjectUpdates(object, dto);

    const savedObject = await this.canvasObjectRepo.save(object);

    const objectWithTask = await this.canvasObjectRepo.findOneOrFail({
      where: { id: savedObject.id },
      relations: {
        task: true,
      },
    });

    return toCanvasObjectResponse(objectWithTask);
  }

  async deleteCanvasObject(
    objectId: string,
    userId: string,
  ): Promise<{ deleted: true }> {
    const object = await this.canvasObjectRepo.findOne({
      where: { id: objectId },
    });

    if (!object) {
      throw new NotFoundException('Canvas object not found');
    }

    await this.findCanvasAndEnsureUserCanAccess(object.canvasId, userId);

    await this.canvasObjectRepo.remove(object);

    return { deleted: true };
  }

  // connection Endpoints
  async getCanvasConnections(
    canvasId: string,
    userId: string,
  ): Promise<CanvasConnectionResponseDto[]> {
    await this.findCanvasAndEnsureUserCanAccess(canvasId, userId);

    const connections = await this.canvasConnectionRepo.find({
      where: { canvasId },
      order: {
        createdAt: 'ASC',
      },
    });

    return toCanvasConnectionResponseList(connections);
  }

  async createCanvasConnection(
    canvasId: string,
    userId: string,
    dto: CreateCanvasConnectionDto,
  ): Promise<CanvasConnectionResponseDto> {
    await this.findCanvasAndEnsureUserCanAccess(canvasId, userId);

    await this.validateConnectionObjects({
      canvasId,
      sourceObjectId: dto.sourceObjectId,
      targetObjectId: dto.targetObjectId,
    });

    const connection = this.canvasConnectionRepo.create({
      canvasId,
      sourceObjectId: dto.sourceObjectId,
      targetObjectId: dto.targetObjectId,
      type: dto.type ?? CanvasConnectionType.ARROW,
      data: dto.data ?? null,
    });

    const savedConnection = await this.canvasConnectionRepo.save(connection);

    return toCanvasConnectionResponse(savedConnection);
  }

  async deleteCanvasConnection(
    connectionId: string,
    userId: string,
  ): Promise<{ deleted: true }> {
    const connection = await this.canvasConnectionRepo.findOne({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new NotFoundException('Canvas connection not found');
    }

    await this.findCanvasAndEnsureUserCanAccess(connection.canvasId, userId);

    await this.canvasConnectionRepo.remove(connection);

    return { deleted: true };
  }

  private async findProjectAndEnsureUserCanAccess(
    projectId: string,
    userId: string,
  ): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: {
        admin: true,
        members: {
          user: true,
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.admin) {
      throw new InternalServerErrorException('Project admin is missing');
    }

    const isProjectAdmin = project.admin.id === userId;

    const isProjectMember = project.members.some(
      (member) => member.user.id === userId,
    );

    if (!isProjectAdmin && !isProjectMember) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  private async findOrCreateCanvas(params: {
    project: Project;
    ownerId: string;
    type: CanvasType;
    name: string;
  }): Promise<Canvas> {
    let canvas = await this.canvasRepo.findOne({
      where: {
        projectId: params.project.id,
        ownerId: params.ownerId,
        type: params.type,
      },
    });

    if (!canvas) {
      try {
        canvas = this.canvasRepo.create({
          projectId: params.project.id,
          ownerId: params.ownerId,
          type: params.type,
          name: params.name,
        });

        await this.canvasRepo.save(canvas);
      } catch (error) {
        if (
          error instanceof QueryFailedError &&
          (error as { code?: string }).code === '23505'
        ) {
          return this.canvasRepo.findOneOrFail({
            where: {
              projectId: params.project.id,
              ownerId: params.ownerId,
              type: params.type,
            },
            relations: {
              owner: true,
            },
          });
        }

        throw error;
      }
    }

    return this.canvasRepo.findOneOrFail({
      where: {
        projectId: params.project.id,
        ownerId: params.ownerId,
        type: params.type,
      },
      relations: {
        owner: true,
      },
    });
  }

  private async findCanvasAndEnsureUserCanAccess(
    canvasId: string,
    userId: string,
  ): Promise<Canvas> {
    const canvas = await this.canvasRepo.findOne({
      where: { id: canvasId },
      relations: {
        project: {
          admin: true,
          members: {
            user: true,
          },
        },
        owner: true,
      },
    });

    if (!canvas) {
      throw new NotFoundException('Canvas not found');
    }

    if (!canvas.project.admin) {
      throw new InternalServerErrorException('Project admin is missing');
    }

    const isProjectAdmin = canvas.project.admin.id === userId;

    const isProjectMember = canvas.project.members.some(
      (member) => member.user.id === userId,
    );

    if (!isProjectAdmin && !isProjectMember) {
      throw new ForbiddenException('You do not have access to this canvas');
    }

    if (canvas.type === CanvasType.PERSONAL && canvas.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this personal canvas',
      );
    }

    return canvas;
  }

  private applyCanvasObjectUpdates(
    object: CanvasObject,
    dto: UpdateCanvasObjectDto,
  ): void {
    const allowedUpdates: Partial<CanvasObject> = {
      x: dto.x,
      y: dto.y,
      width: dto.width,
      height: dto.height,
      zIndex: dto.zIndex,
      data: dto.data,
    };

    Object.entries(allowedUpdates).forEach(([key, value]) => {
      if (value !== undefined) {
        object[key as keyof CanvasObject] = value as never;
      }
    });
  }

  private async validateTaskCanBeAddedToCanvas(params: {
    taskId: string;
    canvas: Canvas;
    userId: string;
  }): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id: params.taskId },
      relations: {
        project: true,
        assignee: true,
        createdBy: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.project.id !== params.canvas.projectId) {
      throw new ForbiddenException(
        'Task does not belong to this canvas project',
      );
    }

    const isTaskCreator = task.createdBy.id === params.userId;
    const isTaskAssignee = task.assignee?.id === params.userId;

    if (!isTaskCreator && !isTaskAssignee) {
      throw new ForbiddenException(
        'You can only add tasks assigned to you or created by you',
      );
    }

    return task;
  }

  private async validateConnectionObjects(params: {
    canvasId: string;
    sourceObjectId: string;
    targetObjectId: string;
  }): Promise<void> {
    if (params.sourceObjectId === params.targetObjectId) {
      throw new BadRequestException(
        'sourceObjectId and targetObjectId cannot be the same',
      );
    }

    const sourceObject = await this.canvasObjectRepo.findOne({
      where: { id: params.sourceObjectId },
    });

    if (!sourceObject) {
      throw new NotFoundException('Source canvas object not found');
    }

    const targetObject = await this.canvasObjectRepo.findOne({
      where: { id: params.targetObjectId },
    });

    if (!targetObject) {
      throw new NotFoundException('Target canvas object not found');
    }

    if (
      sourceObject.canvasId !== params.canvasId ||
      targetObject.canvasId !== params.canvasId
    ) {
      throw new BadRequestException(
        'Source and target objects must belong to the same canvas',
      );
    }
  }
}
