import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLog } from './entities/activity-log.entity';
import { Project } from '@modules/projects/entities/project.entity';
import { ACTIVITY_EVENTS } from './constants/activity-events';
import { ActivityLoggedEvent } from './events/activity-logged.event';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    @InjectRepository(ActivityLog)
    private activityLogRepo: Repository<ActivityLog>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
  ) {}

  @OnEvent(ACTIVITY_EVENTS.LOGGED, { async: true })
  async handleActivityLogged(event: ActivityLoggedEvent) {
    try {
      await this.logActivity(
        event.actorId,
        event.projectId,
        event.message,
        event.entityType,
        event.entityId,
        event.projectName,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process activity log event: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  async listProjectActivities(projectId: string, page = 1, limit = 50) {
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safePage = Math.max(1, page);

    const [activities, total] = await this.activityLogRepo.findAndCount({
      where: { project: { id: projectId } },
      relations: { actor: true, project: true },
      select: {
        id: true,
        message: true,
        projectName: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        project: {
          id: true,
        },
        actor: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
      order: { createdAt: 'DESC' },
      take: safeLimit,
      skip: (safePage - 1) * safeLimit,
    });
    return { activities, total, page: safePage, limit: safeLimit };
  }

  async deleteActivity(id: string) {
    const result = await this.activityLogRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Activity log not found');
    }
  }

  async logActivity(
    actorId: string,
    projectId: string | null,
    message: string,
    entityType?: string,
    entityId?: string,
    projectName?: string,
  ) {
    let resolvedProjectName = projectName || null;

    if (projectId && !resolvedProjectName) {
      const project = await this.projectRepo.findOne({
        where: { id: projectId },
        select: { id: true, name: true },
      });
      resolvedProjectName = project ? project.name : null;
    }

    await this.activityLogRepo.insert({
      actor: { id: actorId },
      project: projectId ? { id: projectId } : null,
      projectName: resolvedProjectName,
      message,
      entityType: entityType || null,
      entityId: entityId || null,
    } as any);
  }
}
