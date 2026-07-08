import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';
import { Project } from '@modules/projects/entities/project.entity';
import { User } from '@modules/users/entities/user.entity';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(ActivityLog)
    private activityLogRepo: Repository<ActivityLog>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async listProjectActivities(projectId: string, page = 1, limit = 50) {
    const [activities, total] = await this.activityLogRepo.findAndCount({
      where: { project: { id: projectId } },
      relations: { actor: true, project: true },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { activities, total, page, limit };
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
  ) {
    const actor = await this.userRepo.findOne({
      where: { id: actorId },
      select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
    });
    if (!actor) return;

    let project: Project | null = null;
    let projectName: string | null = null;

    if (projectId) {
      project = await this.projectRepo.findOne({ where: { id: projectId } });
      projectName = project ? project.name : null;
    }

    const activity = this.activityLogRepo.create({
      actor,
      project,
      projectName,
      message,
      entityType: entityType || null,
      entityId: entityId || null,
    });

    await this.activityLogRepo.save(activity);
  }
}
