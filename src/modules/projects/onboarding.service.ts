import {
  ConflictException,
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
import { Canvas } from '../canvas/entities/canvas.entity';
import { CanvasType } from '../canvas/enums/canvas-type.enum';
import { TaskStatus } from '../tasks/enums/task-status.enum';
import {
  SaveOnboardingDraftDto,
  UpdateOnboardingDraftDto,
} from './dtos/save-onboarding-draft.dto';
import { SubmitOnboardingDto } from './dtos/submit-onboarding.dto';
import { DEFAULT_ROLE_PRESETS } from './projects.service';
import { ActivitiesService } from '@modules/activities/activities.service';

const DEFAULT_WORKSHOP_STATE = {
  viewportX: 0,
  viewportY: 0,
  viewportZoom: 1,
  nodes: [],
  connections: [],
};

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
      projectInfo: dto.projectInfo,
      workshopState: dto.workshopState || DEFAULT_WORKSHOP_STATE,
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

    if (dto.projectInfo) {
      draft.projectInfo = {
        ...draft.projectInfo,
        ...dto.projectInfo,
      };
    }
    if (dto.workshopState) {
      draft.workshopState = dto.workshopState;
    }

    return this.draftRepo.save(draft);
  }

  async deleteDraft(draftId: string, userId: string): Promise<void> {
    const result = await this.draftRepo.delete({ id: draftId, userId });
    if (result.affected === 0) {
      throw new NotFoundException('Onboarding draft not found');
    }
  }

  async submitOnboarding(
    userId: string,
    dto: SubmitOnboardingDto,
  ): Promise<any> {
    const owner = await this.userRepo.findOne({ where: { id: userId } });
    if (!owner) {
      throw new UnauthorizedException('User not found');
    }

    // Atomic transaction for project, columns, tasks, roles, canvases, and draft cleanup
    const result = await this.dataSource.transaction(async (manager) => {
      // 1. Double-submit / Idempotency protection check & draft resolution
      if (dto.draftId) {
        const draft = await manager.findOne(OnboardingDraft, {
          where: { id: dto.draftId, userId },
        });
        if (draft) {
          if (draft.submittedAt) {
            throw new ConflictException(
              'This onboarding project creation has already been submitted',
            );
          }
          // Lock the draft session
          draft.submittedAt = new Date();
          await manager.save(OnboardingDraft, draft);
        }
      }

      // 2. Create Project
      const project = manager.create(Project, {
        name: dto.projectInfo.name,
        description: dto.projectInfo.description ?? null,
        color: dto.projectInfo.color,
        admin: owner,
      });
      const savedProject = await manager.save(Project, project);

      // 3. Create Default Role Presets
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

      // 4. Create Project Member (Admin)
      await manager.save(
        manager.create(ProjectMember, {
          project: savedProject,
          user: owner,
          role: adminRole,
        }),
      );

      // 5. Create Board Columns and Tasks
      let totalTasks = 0;
      const boardColumnInfo: Array<{ id: string; name: string; color: string }> =
        [];

      for (const feature of dto.features) {
        const savedColumn = await manager.save(
          manager.create(Board, {
            project: savedProject,
            name: feature.title,
            color: feature.color,
            sortOrder: feature.sortOrder,
            isProtected: false,
          }),
        );

        boardColumnInfo.push({
          id: savedColumn.id,
          name: savedColumn.name,
          color: savedColumn.color,
        });

        if (feature.tasks && feature.tasks.length > 0) {
          for (const taskDto of feature.tasks) {
            let description = taskDto.description ?? '';
            if (
              taskDto.acceptanceCriteria &&
              taskDto.acceptanceCriteria.length > 0
            ) {
              const formattedAc = taskDto.acceptanceCriteria
                .map((ac) => `- ${ac}`)
                .join('\n');
              description =
                `${description}\n\n**Acceptance Criteria:**\n${formattedAc}`.trim();
            }

            const task = manager.create(Task, {
              project: savedProject,
              createdBy: owner,
              title: taskDto.title,
              description: description || undefined,
              priority: taskDto.priority,
              type: taskDto.type,
              status: TaskStatus.TODO,
              boardColumn: savedColumn,
              columnOrder: taskDto.sortOrder,
              source: taskDto.source,
              metadata: taskDto.estimatedComplexity
                ? { complexity: taskDto.estimatedComplexity }
                : null,
            });
            await manager.save(Task, task);
            totalTasks++;
          }
        }
      }

      // 6. Create Personal Canvas
      const canvas = manager.create(Canvas, {
        projectId: savedProject.id,
        ownerId: userId,
        type: CanvasType.PERSONAL,
        name: 'My Canvas',
      });
      await manager.save(Canvas, canvas);

      // 7. Delete the submitted Onboarding Draft row if draftId was provided
      if (dto.draftId) {
        await manager.delete(OnboardingDraft, { id: dto.draftId, userId });
      }

      return {
        projectId: savedProject.id,
        boardColumns: boardColumnInfo,
        taskCount: totalTasks,
      };
    });

    // 8. Log project creation activity outside the transaction to avoid lock escalation
    await this.activitiesService.logActivity(
      userId,
      result.projectId,
      `created project via onboarding: ${dto.projectInfo.name}`,
      'project',
      result.projectId,
    );

    return result;
  }
}
