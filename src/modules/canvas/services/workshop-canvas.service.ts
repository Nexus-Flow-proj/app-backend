import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, In, Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { Workshop } from '../entities/workshop.entity';
import { WorkshopObject } from '../entities/workshop-object.entity';
import { WorkshopConnection } from '../entities/workshop-connection.entity';
import { OnboardingDraft } from '@modules/projects/entities/onboarding-draft.entity';
import { WorkshopCanvasResponseDto } from '../dtos/workshop/workshop-canvas-response.dto';
import { toWorkshopCanvasResponse } from '../mappers/workshop-canvas.mapper';
import { WorkshopCanvasValidator } from '../validators/workshop-canvas.validator';
import { SaveWorkshopCanvasDto } from '../dtos/workshop/save-workshop-canvas.dto';
import { SaveWorkshopCanvasObjectDto } from '../dtos/workshop/save-workshop-canvas-object.dto';
import { SaveWorkshopCanvasConnectionDto } from '../dtos/workshop/save-workshop-canvas-connection.dto';
import { SaveWorkshopFeatureDataDto } from '../dtos/workshop/save-workshop-feature-data.dto';
import { SaveWorkshopTaskDataDto } from '../dtos/workshop/save-workshop-task-data.dto';
import { SaveWorkshopStickyNoteDataDto } from '../dtos/workshop/save-workshop-sticky-note-data.dto';
import { CanvasObjectType } from '../enums/canvas-object-type.enum';
import { CanvasConnectionType } from '../enums/canvas-connection-type.enum';

@Injectable()
export class WorkshopCanvasService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(OnboardingDraft)
    private readonly draftRepo: Repository<OnboardingDraft>,
    private readonly workshopCanvasValidator: WorkshopCanvasValidator,
  ) {}

  // ─── Public CRUD ───────────────────────────────────────────────────────────

  async getDraftWorkshop(
    draftId: string,
    userId: string,
  ): Promise<WorkshopCanvasResponseDto> {
    await this.findDraftOrFail(draftId, userId);
    const workshop = await this.findOrCreateDraftWorkshop(draftId);
    const loadedWorkshop = await this.loadWorkshop(workshop.id);
    return toWorkshopCanvasResponse(loadedWorkshop);
  }

  async saveDraftWorkshop(
    draftId: string,
    userId: string,
    dto: SaveWorkshopCanvasDto,
  ): Promise<WorkshopCanvasResponseDto> {
    await this.findDraftOrFail(draftId, userId);

    return this.dataSource.transaction(async (manager) => {
      const workshop = await this.findOrCreateDraftWorkshop(draftId, manager);

      await this.workshopCanvasValidator.validateDocumentOrThrow({
        dto,
        projectId: '', // Draft workshop has no live project context
        manager,
      });

      await this.persistWorkshopDocument({
        workshopId: workshop.id,
        dto,
        manager,
      });

      const loadedWorkshop = await this.loadWorkshop(workshop.id, manager);
      return toWorkshopCanvasResponse(loadedWorkshop);
    });
  }

  // ─── AI Plan Auto-Application ──────────────────────────────────────────────

  /**
   * Receives a normalized onboarding AI plan and persists it as WorkshopObject
   * rows in the draft's Workshop using a default grid layout.
   *
   * Called automatically by AIService after generation completes — the frontend
   * does NOT need to post coordinates; it simply reads the workshop state via
   * GET /workshop/:draftId after receiving the `ai.generation.completed` event.
   *
   * Layout algorithm:
   *  • Each Feature (SECTION_FRAME) is placed horizontally:
   *      x = index * FRAME_X_GAP + 60, y = 80
   *  • Frame height grows to fit its task cards (min 300px)
   *  • Each Task Card is stacked vertically inside its parent frame:
   *      x = frameX + FRAME_PADDING_SIDE, y = frameY + FRAME_PADDING_TOP + taskIndex * (TASK_CARD_HEIGHT + 16)
   *  • The existing workshop is cleared first so the AI result is always canonical.
   *  • A color palette of 6 is cycled for variety.
   */
  async applyAIPlanToWorkshop(
    draftId: string,
    normalizedPlan: Record<string, any>,
  ): Promise<WorkshopCanvasResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const workshop = await this.findOrCreateDraftWorkshop(draftId, manager);
      const objectRepo = manager.getRepository(WorkshopObject);
      const connectionRepo = manager.getRepository(WorkshopConnection);

      // Clear the existing workshop so the AI plan is always canonical
      await connectionRepo.delete({ workshopId: workshop.id });
      await objectRepo.delete({ workshopId: workshop.id });

      const features: any[] = Array.isArray(normalizedPlan.features)
        ? normalizedPlan.features
        : [];

      const framesToSave: WorkshopObject[] = [];
      const tasksToSave: WorkshopObject[] = [];

      // Color palette — cycles for more than 6 features
      const FRAME_COLORS = [
        { bg: '#eff6ff', border: '#3b82f6' }, // blue
        { bg: '#f0fdf4', border: '#22c55e' }, // green
        { bg: '#fff7ed', border: '#f97316' }, // orange
        { bg: '#faf5ff', border: '#a855f7' }, // purple
        { bg: '#fdf2f8', border: '#ec4899' }, // pink
        { bg: '#ecfeff', border: '#06b6d4' }, // cyan
      ];

      const FRAME_WIDTH = 520;
      const FRAME_X_GAP = 620;
      const TASK_CARD_HEIGHT = 110;
      const TASK_CARD_WIDTH = 472;
      const FRAME_PADDING_TOP = 96;
      const FRAME_PADDING_SIDE = 24;
      const FRAME_PADDING_BOTTOM = 32;
      const TASK_GAP = 16;
      const MIN_FRAME_HEIGHT = 300;

      for (let fi = 0; fi < features.length; fi++) {
        const feature = features[fi];
        const tasks: any[] = Array.isArray(feature.tasks) ? feature.tasks : [];

        const frameId = randomUUID();
        const frameX = fi * FRAME_X_GAP + 60;
        const frameY = 80;
        const frameHeight = Math.max(
          MIN_FRAME_HEIGHT,
          FRAME_PADDING_TOP +
            tasks.length * TASK_CARD_HEIGHT +
            (tasks.length > 0 ? (tasks.length - 1) * TASK_GAP : 0) +
            FRAME_PADDING_BOTTOM,
        );
        const color = FRAME_COLORS[fi % FRAME_COLORS.length];

        framesToSave.push(
          objectRepo.create({
            id: frameId,
            workshopId: workshop.id,
            type: CanvasObjectType.SECTION_FRAME,
            x: frameX,
            y: frameY,
            width: FRAME_WIDTH,
            height: frameHeight,
            rotation: 0,
            zIndex: fi + 1,
            data: {
              kind: 'Feature',
              title: feature.feature_name || `Feature ${fi + 1}`,
              description: feature.feature_description || '',
              backgroundColor: color.bg,
              borderColor: color.border,
            },
          }),
        );

        for (let ti = 0; ti < tasks.length; ti++) {
          const task = tasks[ti];
          tasksToSave.push(
            objectRepo.create({
              workshopId: workshop.id,
              type: CanvasObjectType.TASK_CARD,
              x: frameX + FRAME_PADDING_SIDE,
              y: frameY + FRAME_PADDING_TOP + ti * (TASK_CARD_HEIGHT + TASK_GAP),
              width: TASK_CARD_WIDTH,
              height: TASK_CARD_HEIGHT,
              rotation: 0,
              zIndex: (fi + 1) * 100 + ti,
              data: {
                kind: 'Task',
                featureId: frameId,
                title: task.task_name || `Task ${ti + 1}`,
                description: task.task_description || '',
                priority: task.priority || 'MEDIUM',
              },
            }),
          );
        }
      }

      // Persist frames first (tasks reference frame IDs)
      await objectRepo.save(framesToSave);
      await objectRepo.save(tasksToSave);

      const loadedWorkshop = await this.loadWorkshop(workshop.id, manager);
      return toWorkshopCanvasResponse(loadedWorkshop);
    });
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private async findDraftOrFail(
    draftId: string,
    userId: string,
  ): Promise<OnboardingDraft> {
    const draft = await this.draftRepo.findOne({
      where: { id: draftId, userId },
    });
    if (!draft) {
      throw new NotFoundException('Onboarding draft not found');
    }
    return draft;
  }

  private async findOrCreateDraftWorkshop(
    draftId: string,
    manager: DataSource['manager'] = this.dataSource.manager,
  ): Promise<Workshop> {
    const workshopRepo = manager.getRepository(Workshop);
    let workshop = await workshopRepo.findOne({ where: { draftId } });

    if (!workshop) {
      workshop = workshopRepo.create({
        draftId,
        viewportX: 24,
        viewportY: 24,
        viewportZoom: 0.82,
      });
      workshop = await workshopRepo.save(workshop);
    }

    return workshop;
  }

  private async persistWorkshopDocument(params: {
    workshopId: string;
    dto: SaveWorkshopCanvasDto;
    manager: DataSource['manager'];
  }): Promise<void> {
    const { workshopId, dto, manager } = params;
    const workshopRepo = manager.getRepository(Workshop);
    const objectRepo = manager.getRepository(WorkshopObject);
    const connectionRepo = manager.getRepository(WorkshopConnection);

    const currentObjects = await objectRepo.find({ where: { workshopId } });
    const currentConnections = await connectionRepo.find({
      where: { workshopId },
    });

    const submittedObjectIds = new Set(dto.objects.map((o) => o.id));
    const submittedConnectionIds = new Set(dto.connections.map((c) => c.id));

    // Delete removed connections & objects
    const connectionsToDelete = currentConnections
      .filter((c) => !submittedConnectionIds.has(c.id))
      .map((c) => c.id);

    const objectsToDelete = currentObjects
      .filter((o) => !submittedObjectIds.has(o.id))
      .map((o) => o.id);

    if (connectionsToDelete.length > 0) {
      await connectionRepo.delete({ id: In(connectionsToDelete) });
    }

    if (objectsToDelete.length > 0) {
      await connectionRepo
        .createQueryBuilder()
        .delete()
        .from(WorkshopConnection)
        .where('workshop_id = :workshopId', { workshopId })
        .andWhere(
          '(source_object_id = ANY(:objectIds) OR target_object_id = ANY(:objectIds))',
          { objectIds: objectsToDelete },
        )
        .execute();

      await objectRepo.delete({ id: In(objectsToDelete) });
    }

    // Upsert objects & connections from client payload
    const nextObjects: WorkshopObject[] = dto.objects.map((obj) =>
      this.toWorkshopObjectEntity(workshopId, obj),
    );
    await objectRepo.save(nextObjects);

    const nextConnections: WorkshopConnection[] = dto.connections.map((conn) =>
      this.toWorkshopConnectionEntity(workshopId, conn),
    );
    await connectionRepo.save(nextConnections);

    // Update viewport
    const workshop = await workshopRepo.findOneOrFail({
      where: { id: workshopId },
    });
    workshop.viewportX = dto.viewport.x;
    workshop.viewportY = dto.viewport.y;
    workshop.viewportZoom = dto.viewport.scale;
    await workshopRepo.save(workshop);
  }

  private async loadWorkshop(
    workshopId: string,
    manager: DataSource['manager'] = this.dataSource.manager,
  ): Promise<Workshop> {
    const workshopRepo = manager.getRepository(Workshop);
    const objectRepo = manager.getRepository(WorkshopObject);
    const connectionRepo = manager.getRepository(WorkshopConnection);

    const workshop = await workshopRepo.findOne({ where: { id: workshopId } });
    if (!workshop) {
      throw new NotFoundException('Workshop not found');
    }

    workshop.objects = await objectRepo.find({
      where: { workshopId },
      order: { zIndex: 'ASC', createdAt: 'ASC' },
    });

    workshop.connections = await connectionRepo.find({
      where: { workshopId },
      order: { createdAt: 'ASC' },
    });

    return workshop;
  }

  private toWorkshopObjectEntity(
    workshopId: string,
    object: SaveWorkshopCanvasObjectDto,
  ): WorkshopObject {
    const base = {
      id: object.id,
      workshopId,
      x: object.x,
      y: object.y,
      width: object.width,
      height: object.height,
      rotation: object.rotation,
      zIndex: object.zIndex,
      data: null,
    } as DeepPartial<WorkshopObject>;

    if (object.type === 'SECTION_FRAME') {
      const data = object.data as SaveWorkshopFeatureDataDto;
      return Object.assign(base, {
        type: CanvasObjectType.SECTION_FRAME,
        data: {
          kind: 'Feature',
          title: data.title,
          description: data.description ?? undefined,
          backgroundColor: data.backgroundColor,
          borderColor: data.borderColor,
        },
      }) as WorkshopObject;
    }

    if (object.type === 'TASK_CARD') {
      const data = object.data as SaveWorkshopTaskDataDto;
      return Object.assign(base, {
        type: CanvasObjectType.TASK_CARD,
        data: {
          kind: 'Task',
          featureId: data.featureId,
          title: data.title,
          description: data.description ?? undefined,
          dueDate: data.dueDate ?? undefined,
        },
      }) as WorkshopObject;
    }

    const data = object.data as SaveWorkshopStickyNoteDataDto;
    return Object.assign(base, {
      type: CanvasObjectType.STICKY_NOTE,
      data: {
        kind: 'Note',
        content: data.content,
        color: data.color,
        fontSize: data.fontSize,
      },
    }) as WorkshopObject;
  }

  private toWorkshopConnectionEntity(
    workshopId: string,
    connection: SaveWorkshopCanvasConnectionDto,
  ): WorkshopConnection {
    return {
      id: connection.id,
      workshopId,
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
    } as unknown as WorkshopConnection;
  }
}
