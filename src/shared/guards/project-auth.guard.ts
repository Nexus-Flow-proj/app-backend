import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { ProjectMember } from '@modules/projects/entities/project-member.entity';
import { ProjectRole } from '@modules/projects/entities/project-role.entity';
import { ActivityLog } from '@modules/activities/entities/activity-log.entity';
import { Task } from '@modules/tasks/entities/task.entity';
import { Board } from '@modules/boards/entities/board.entity';
import { SubTask } from '@modules/tasks/entities/subtask.entity';
import { TaskComment } from '@modules/tasks/entities/task-comment.entity';
import { TimeLog } from '@modules/tasks/entities/time-log.entity';
import {
  REQUIRE_PERMISSION_KEY,
  RequiredPermissionInfo,
} from '../decorators/require-permission.decorator';
import { ProjectAuthEvaluator } from '@modules/projects/utils/project-auth.evaluator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ProjectAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {}

  get projectMemberRepo() {
    return this.dataSource.getRepository(ProjectMember);
  }

  get projectRoleRepo() {
    return this.dataSource.getRepository(ProjectRole);
  }

  get taskRepo() {
    return this.dataSource.getRepository(Task);
  }

  get boardRepo() {
    return this.dataSource.getRepository(Board);
  }

  get subtaskRepo() {
    return this.dataSource.getRepository(SubTask);
  }

  get taskCommentRepo() {
    return this.dataSource.getRepository(TaskComment);
  }

  get timeLogRepo() {
    return this.dataSource.getRepository(TimeLog);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    const requiredPermission =
      this.reflector.getAllAndOverride<RequiredPermissionInfo>(
        REQUIRE_PERMISSION_KEY,
        [context.getHandler(), context.getClass()],
      );

    const projectId = await this.resolveProjectId(request);

    if (!projectId) {
      if (requiredPermission) {
        throw new BadRequestException(
          'Project context is required for this route',
        );
      }
      return true;
    }

    const actor = await this.projectMemberRepo.findOne({
      where: { project: { id: projectId }, user: { id: user.id } },
      relations: { project: true, role: true, user: true },
    });

    if (!actor) {
      throw new ForbiddenException('You do not have access to this project');
    }

    request.projectMember = actor;

    if (requiredPermission) {
      const isAllowed = ProjectAuthEvaluator.hasPermission(
        actor,
        requiredPermission.category as any,
        requiredPermission.operation as any,
      );
      if (!isAllowed) {
        throw new ForbiddenException(
          `You do not have permission to perform this action (${requiredPermission.category}.${requiredPermission.operation})`,
        );
      }
    }

    const { params, body, method } = request;

    if (params.memberId && request.route.path.includes('/members/:memberId')) {
      const target = await this.projectMemberRepo.findOne({
        where: { id: params.memberId, project: { id: projectId } },
        relations: { role: true, user: true, project: { admin: true } },
      });
      if (!target) {
        throw new NotFoundException('Project member not found');
      }

      const isTargetOwner = target.project.admin?.id === target.user?.id;

      if (method === 'PATCH') {
        if (isTargetOwner && target.role.level !== 100) {
          throw new BadRequestException(
            'Project owner cannot be downgraded here',
          );
        }

        const actorIsAdmin = actor.role.level === 100;
        const targetIsAdmin = target.role.level === 100;
        const isSelfUpdate = actor.id === target.id;

        if (actorIsAdmin && targetIsAdmin && !isSelfUpdate) {
          throw new ForbiddenException(
            'Admins cannot change the role of another admin',
          );
        }

        const canModify = ProjectAuthEvaluator.canModifyMember(actor, target);
        if (!canModify) {
          throw new ForbiddenException(
            'You cannot modify members with an equal or higher role level hierarchy',
          );
        }

        if (body.roleId) {
          const targetRole = await this.projectRoleRepo.findOne({
            where: { id: body.roleId, project: { id: projectId } },
          });
          if (!targetRole) {
            throw new NotFoundException(
              'Target role not found in this project',
            );
          }
          if (
            actor.role.level !== 100 &&
            targetRole.level >= actor.role.level
          ) {
            throw new ForbiddenException(
              'You cannot assign a role level equal to or higher than your own',
            );
          }

          if (isSelfUpdate && actorIsAdmin && targetRole.level < 100) {
            const adminCount = await this.projectMemberRepo
              .createQueryBuilder('pm')
              .innerJoin('pm.role', 'role')
              .where('pm.project_id = :projectId', { projectId })
              .andWhere('role.level = 100')
              .getCount();

            if (adminCount < 2) {
              throw new BadRequestException(
                'You are the only admin of this project. At least 2 admins must exist before you can change your own role.',
              );
            }
          }
        }
      } else if (method === 'DELETE') {
        if (isTargetOwner) {
          throw new BadRequestException('Project owner cannot be removed');
        }

        const canModify = ProjectAuthEvaluator.canModifyMember(actor, target);
        if (!canModify) {
          throw new ForbiddenException(
            'You cannot modify members with an equal or higher role level hierarchy',
          );
        }
      }
    }

    if (params.cid && request.route.path.includes('/comments/:cid')) {
      const comment = await this.taskCommentRepo.findOne({
        where: { id: params.cid },
        relations: { user: true },
      });
      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      if (method === 'PATCH') {
        if (comment.user.id !== user.id) {
          throw new ForbiddenException('You can only modify your own comments');
        }
      } else if (method === 'DELETE') {
        if (comment.user.id !== user.id) {
          const hasTasksDelete = ProjectAuthEvaluator.hasPermission(
            actor,
            'tasks',
            'delete',
          );
          if (!hasTasksDelete) {
            throw new ForbiddenException(
              'You can only delete your own comments unless you have task deletion rights',
            );
          }
        }
      }
    }

    if (params.lid && request.route.path.includes('/time-logs/:lid')) {
      const timeLog = await this.timeLogRepo.findOne({
        where: { id: params.lid },
        relations: { user: true },
      });
      if (!timeLog) {
        throw new NotFoundException('Time log not found');
      }
      if (timeLog.user.id !== user.id) {
        throw new ForbiddenException('You can only delete your own time logs');
      }
    }

    return true;
  }

  private async resolveProjectId(request: any): Promise<string | null> {
    const { params = {}, query = {}, body = {}, route } = request;
    const path = route?.path || '';

    if (params.projectId) return params.projectId;
    if (body.projectId) return body.projectId;
    if (query.projectId) return query.projectId;

    if (path.includes('/boards/:id') && params.id) {
      const board = await this.boardRepo.findOne({
        where: { id: params.id },
        relations: { project: true },
      });
      return board?.project?.id || null;
    }
    if (path.includes('/boards/:columnId/tasks') && params.columnId) {
      const board = await this.boardRepo.findOne({
        where: { id: params.columnId },
        relations: { project: true },
      });
      return board?.project?.id || null;
    }

    if (path.includes('/tasks/:id') && params.id) {
      const task = await this.taskRepo.findOne({
        where: { id: params.id },
        relations: { project: true },
      });
      return task?.project?.id || null;
    }

    const subtaskId = params.sid;
    if (subtaskId) {
      const subtask = await this.subtaskRepo.findOne({
        where: { id: subtaskId },
        relations: { task: { project: true } },
      });
      return subtask?.task?.project?.id || null;
    }

    if (params.cid) {
      const comment = await this.taskCommentRepo.findOne({
        where: { id: params.cid },
        relations: { task: { project: true } },
      });
      return comment?.task?.project?.id || null;
    }

    if (params.lid) {
      const timeLog = await this.timeLogRepo.findOne({
        where: { id: params.lid },
        relations: { task: { project: true } },
      });
      return timeLog?.task?.project?.id || null;
    }

    if (path.includes('/activity-logs/:id') && params.id) {
      const activityRepo = this.dataSource.getRepository(ActivityLog);
      const activity = await activityRepo.findOne({
        where: { id: params.id },
        relations: { project: true },
      });
      return activity?.project?.id || null;
    }

    return null;
  }
}
