import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { ProjectRole as ProjectRoleEntity } from './entities/project-role.entity';
import { OnboardingDraft } from './entities/onboarding-draft.entity';
import { User } from '../users/entities/user.entity';
import { Board } from '../boards/entities/board.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskStatus } from '../tasks/enums/task-status.enum';
import { TaskPriority } from '../tasks/enums/task-priority.enum';
import { TaskType } from '../tasks/enums/task-type.enum';
import { TaskSource } from '../tasks/enums/task-source.enum';
import { DraftStatus } from './enums/draft-status.enum';
import { Workshop } from '@modules/canvas/entities/workshop.entity';
import { WorkshopObject } from '@modules/canvas/entities/workshop-object.entity';
import { CanvasObjectType } from '@modules/canvas/enums/canvas-object-type.enum';
import {
  SaveOnboardingDraftDto,
  UpdateOnboardingDraftDto,
} from './dtos/save-onboarding-draft.dto';
import { SubmitOnboardingDto } from './dtos/submit-onboarding.dto';
import { DEFAULT_ROLE_PRESETS } from './projects.service';
import { ActivitiesService } from '@modules/activities/activities.service';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(OnboardingDraft)
    private readonly draftRepo: Repository<OnboardingDraft>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly activitiesService: ActivitiesService,
  ) {}

  async saveDraft(
    userId: string,
    dto: SaveOnboardingDraftDto,
  ): Promise<OnboardingDraft> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const draft = this.draftRepo.create({
      userId,
      status: DraftStatus.DRAFT,
      projectInfo: dto.projectInfo,
    });

    return this.draftRepo.save(draft);
  }

  async getDrafts(userId: string): Promise<OnboardingDraft[]> {
    return this.draftRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getDraft(draftId: string, userId: string): Promise<OnboardingDraft> {
    const draft = await this.draftRepo.findOne({
      where: { id: draftId, userId },
    });
    if (!draft) {
      throw new NotFoundException('Onboarding draft not found');
    }
    return draft;
  }

  async updateDraft(
    draftId: string,
    userId: string,
    dto: UpdateOnboardingDraftDto,
  ): Promise<OnboardingDraft> {
    const draft = await this.draftRepo.findOne({
      where: { id: draftId, userId },
    });
    if (!draft) {
      throw new NotFoundException('Onboarding draft not found');
    }

    if (draft.submittedAt || draft.status === DraftStatus.SUBMITTED) {
      throw new ForbiddenException(
        'Submitted onboarding draft is read-only and cannot be modified',
      );
    }

    if (dto.projectInfo) {
      draft.projectInfo = {
        ...draft.projectInfo,
        ...dto.projectInfo,
      };
    }

    return this.draftRepo.save(draft);
  }

  async deleteDraft(draftId: string, userId: string): Promise<void> {
    const draft = await this.draftRepo.findOne({ where: { id: draftId, userId } });
    if (!draft) {
      throw new NotFoundException('Onboarding draft not found');
    }

    if (draft.submittedAt || draft.status === DraftStatus.SUBMITTED) {
      throw new ForbiddenException(
        'Submitted onboarding draft is read-only and cannot be deleted',
      );
    }

    await this.draftRepo.delete({ id: draftId, userId });
  }

  async submitOnboarding(
    userId: string,
    dto: SubmitOnboardingDto,
  ): Promise<any> {
    const owner = await this.userRepo.findOne({ where: { id: userId } });
    if (!owner) {
      throw new UnauthorizedException('User not found');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      // 1. Fetch and validate draft
      const draft = await manager.findOne(OnboardingDraft, {
        where: { id: dto.draftId, userId },
      });

      if (!draft) {
        throw new NotFoundException('Onboarding draft not found');
      }

      if (draft.submittedAt || draft.status === DraftStatus.SUBMITTED) {
        throw new ConflictException(
          'This onboarding draft has already been submitted',
        );
      }

      // 2. Fetch DB-persisted Workshop & objects
      const workshop = await manager.findOne(Workshop, {
        where: { draftId: draft.id },
      });

      const workshopObjects = workshop
        ? await manager.find(WorkshopObject, {
            where: { workshopId: workshop.id },
            order: { zIndex: 'ASC', createdAt: 'ASC' },
          })
        : [];

      // Mark draft as SUBMITTED atomically
      draft.status = DraftStatus.SUBMITTED;
      draft.submittedAt = new Date();
      await manager.save(OnboardingDraft, draft);

      // 3. Create Project (read entirely from the persisted draft — single source of truth)
      const project = manager.create(Project, {
        name: draft.projectInfo.name,
        description: draft.projectInfo.description ?? null,
        color: draft.projectInfo.color,
        admin: owner,
        draftId: draft.id,
      });
      const savedProject = await manager.save(Project, project);

      // 4. Create Default Role Presets
      const rolesToCreate = DEFAULT_ROLE_PRESETS.map((preset) =>
        manager.create(ProjectRoleEntity, {
          ...preset,
          project: savedProject,
        }),
      );
      const savedRoles = await manager.save(ProjectRoleEntity, rolesToCreate);
      const adminRole = savedRoles.find((role) => role.level === 100);

      if (!adminRole) {
        throw new NotFoundException('Default admin role could not be created');
      }

      // 5. Create Project Member (Admin)
      await manager.save(
        manager.create(ProjectMember, {
          project: savedProject,
          user: owner,
          role: adminRole,
        }),
      );

      // 6. Compile Workshop state into Board columns and Task items
      let totalTasks = 0;
      const boardColumnInfo: Array<{
        id: string;
        name: string;
        color: string;
      }> = [];

      const sectionFrames = workshopObjects.filter(
        (obj) => obj.type === CanvasObjectType.SECTION_FRAME,
      );
      const taskCards = workshopObjects.filter(
        (obj) => obj.type === CanvasObjectType.TASK_CARD,
      );

      // ── Phase 1 setup: maps shared across ALL features for cross-feature dep resolution
      // Key: lowercased+trimmed task title  Value: saved Task UUID
      const taskTitleToId = new Map<string, string>();
      // Key: saved Task UUID  Value: dependency title strings from AI plan
      const taskDependencyNames = new Map<string, string[]>();

      let sortOrderCounter = 0;
      for (const frame of sectionFrames) {
        const frameData = (frame.data ?? {}) as Record<string, any>;
        const columnTitle = frameData.title || 'Untitled Feature';
        const columnColor = frameData.borderColor || '#3b82f6';

        const savedColumn = await manager.save(
          manager.create(Board, {
            project: savedProject,
            name: columnTitle,
            color: columnColor,
            sortOrder: sortOrderCounter++,
            isProtected: false,
          }),
        );

        boardColumnInfo.push({
          id: savedColumn.id,
          name: savedColumn.name,
          color: savedColumn.color,
        });

        // Find task cards inside this section frame
        const childTasks = taskCards.filter((task) => {
          const taskData = (task.data ?? {}) as Record<string, any>;
          return taskData.featureId === frame.id;
        });

        let taskOrderCounter = 0;
        for (const taskObj of childTasks) {
          const taskData = (taskObj.data ?? {}) as Record<string, any>;
          const rawPriority = String(
            taskData.priority || 'MEDIUM',
          ).toUpperCase();
          const priority = Object.values(TaskPriority).includes(
            rawPriority as TaskPriority,
          )
            ? (rawPriority as TaskPriority)
            : TaskPriority.MEDIUM;

          const taskEntity = manager.create(Task, {
            project: savedProject,
            createdBy: owner,
            title: taskData.title || 'Untitled Task',
            description: taskData.description || undefined,
            priority,
            type: TaskType.FEATURE,
            status: TaskStatus.TODO,
            boardColumn: savedColumn,
            columnOrder: taskOrderCounter++,
            source: TaskSource.AI,
          });
          const savedTask = await manager.save(Task, taskEntity);
          totalTasks++;

          // Register in lookup (normalised for fuzzy name matching)
          taskTitleToId.set(savedTask.title.trim().toLowerCase(), savedTask.id);

          // Capture raw dependency names to resolve after all tasks are saved
          const depNames: string[] = Array.isArray(taskData.dependencies)
            ? taskData.dependencies
            : [];
          if (depNames.length > 0) {
            taskDependencyNames.set(savedTask.id, depNames);
          }
        }
      }

      // ── Phase 2: Bulk-insert task dependencies ─────────────────────────────
      // All tasks are now saved, so we can resolve name strings → real UUIDs.
      // Unresolvable names (AI hallucinations / cross-feature mismatches) are
      // silently skipped to avoid blocking the whole onboarding submission.
      if (taskDependencyNames.size > 0) {
        const depRows: { task_id: string; dependency_id: string }[] = [];

        for (const [taskId, depNames] of taskDependencyNames) {
          for (const rawName of depNames) {
            const depId = taskTitleToId.get(rawName.trim().toLowerCase());
            if (depId && depId !== taskId) {
              depRows.push({ task_id: taskId, dependency_id: depId });
            }
          }
        }

        if (depRows.length > 0) {
          await manager
            .createQueryBuilder()
            .insert()
            .into('task_dependencies')
            .values(depRows)
            .orIgnore() // skip duplicates safely
            .execute();
        }
      }

      // If no section frames exist, create default TODO column
      if (sectionFrames.length === 0) {
        const defaultColumn = await manager.save(
          manager.create(Board, {
            project: savedProject,
            name: 'TODO',
            color: '#3b82f6',
            sortOrder: 0,
            isProtected: false,
          }),
        );
        boardColumnInfo.push({
          id: defaultColumn.id,
          name: defaultColumn.name,
          color: defaultColumn.color,
        });
      }

      return {
        projectId: savedProject.id,
        projectName: savedProject.name,
        draftId: draft.id,
        boardColumns: boardColumnInfo,
        taskCount: totalTasks,
      };
    });

    // 7. Log project creation activity
    await this.activitiesService.logActivity(
      userId,
      result.projectId,
      `created project via onboarding: ${result.projectName}`,
      'project',
      result.projectId,
    );

    return result;
  }
}
