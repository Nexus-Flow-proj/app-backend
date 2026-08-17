import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { randomUUID } from 'crypto';
import { Task, ApiAttachment, ApiUserSummary } from './entities/task.entity';
import { SubTask } from './entities/subtask.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TimeLog } from './entities/time-log.entity';
import { ActivitiesService } from '@modules/activities/activities.service';
import { StorageService } from '@shared/providers/storage/storage.service';
import { TaskStatus } from './enums/task-status.enum';
import { Project } from '@modules/projects/entities/project.entity';
import { ProjectMember } from '@modules/projects/entities/project-member.entity';
import { User } from '@modules/users/entities/user.entity';
import { Board } from '@modules/boards/entities/board.entity';

import { CreateTaskDto } from './dtos/create-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { CreateSubTaskDto, UpdateSubTaskDto } from './dtos/subtask.dto';
import { CreateCommentDto, UpdateCommentDto } from './dtos/comment.dto';
import { CreateTimeLogDto } from './dtos/time-log.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '@modules/realtime/constants/domain-events';
import { TaskCreatedEvent } from '@modules/realtime/domain-events/task-created.event';
import { TaskUpdatedEvent } from '@modules/realtime/domain-events/task-updated.event';
import { TaskDeletedEvent } from '@modules/realtime/domain-events/task-deleted.event';
import {
  TaskCreatedPayload,
  TaskDeletedPayload,
  TaskUpdatedPayload,
  CommentCreatedPayload,
  CommentUpdatedPayload,
  CommentDeletedPayload,
  SubtaskCreatedPayload,
  SubtaskUpdatedPayload,
  SubtaskDeletedPayload,
} from '@modules/realtime/interfaces/socket-payloads.interface';
import { CommentCreatedEvent } from '@modules/realtime/domain-events/comment-created.event';
import { CommentUpdatedEvent } from '@modules/realtime/domain-events/comment-updated.event';
import { CommentDeletedEvent } from '@modules/realtime/domain-events/comment-deleted.event';
import { mapTaskToApiTaskSummary } from '@modules/realtime/mappers/task-socket.mapper';
import { mapCommentToApiComment } from '@modules/realtime/mappers/comment-socket.mapper';
import { mapSubtaskToApiSubtask } from '@modules/realtime/mappers/subtask-socket.mapper';
import { SubtaskCreatedEvent } from '@modules/realtime/domain-events/subtask-created.event';
import { SubtaskUpdatedEvent } from '@modules/realtime/domain-events/subtask-updated.event';
import { SubtaskDeletedEvent } from '@modules/realtime/domain-events/subtask-deleted.event';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { NotificationType } from '@modules/notifications/enums/notification-type.enum';

export interface TaskDueTomorrow {
  id: string;
  title: string;
  deadline: string;
  projectId: string;
  assigneeId: string;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  /** Only the 5 user fields the DTOs / socket mappers actually expose */
  private static readonly USER_SUMMARY_SELECT = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    avatarUrl: true,
  } as const;

  /** Shared select for boardColumn — covers DTO + socket mapper fields */
  private static readonly BOARD_COLUMN_SELECT = {
    id: true,
    name: true,
    sortOrder: true,
    isProtected: true,
    color: true,
    createdAt: true,
  } as const;

  constructor(
    @InjectRepository(Task) private taskRepo: Repository<Task>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(SubTask) private subtaskRepo: Repository<SubTask>,
    @InjectRepository(TimeLog) private timeLogRepo: Repository<TimeLog>,
    @InjectRepository(ProjectMember)
    private projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(TaskComment)
    private taskCommentRepo: Repository<TaskComment>,
    @InjectRepository(Board) private boardRepo: Repository<Board>,
    private activitiesService: ActivitiesService,
    private readonly notificationsService: NotificationsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly storageService: StorageService,
  ) {}

  async findTasksDueTomorrow(): Promise<TaskDueTomorrow[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = [
      tomorrow.getFullYear(),
      String(tomorrow.getMonth() + 1).padStart(2, '0'),
      String(tomorrow.getDate()).padStart(2, '0'),
    ].join('-');
    this.logger.log(
      `[TASK_DUE_SOON DEBUG] Tomorrow date: ${tomorrowDate}`,
    );

    return this.taskRepo
      .createQueryBuilder('task')
      .innerJoin('task.project', 'project')
      .innerJoin('task.assignee', 'assignee')
      .select('task.id', 'id')
      .addSelect('task.title', 'title')
      .addSelect('task.deadline', 'deadline')
      .addSelect('project.id', 'projectId')
      .addSelect('assignee.id', 'assigneeId')
      .where('task.deadline = :tomorrowDate', { tomorrowDate })
      .andWhere('task.status != :doneStatus', {
        doneStatus: TaskStatus.DONE,
      })
      .andWhere('task.assignee_id IS NOT NULL')
      .getRawMany<TaskDueTomorrow>();
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private async assertAssigneeMembership(
    projectId: string,
    assigneeId: string,
  ): Promise<void> {
    const isAssigneeMember = await this.projectMemberRepo.findOne({
      where: { project: { id: projectId }, user: { id: assigneeId } },
      select: { id: true },
    });

    if (!isAssigneeMember) {
      throw new BadRequestException(
        'Assigned user is not a member of this project',
      );
    }
  }

  private async resolveBoardColumn(
    boardColumnId: string,
    projectId: string,
  ): Promise<Board> {
    const column = await this.boardRepo.findOne({
      where: { id: boardColumnId },
      relations: { project: true },
      select: {
        id: true,
        name: true,
        sortOrder: true,
        isProtected: true,
        color: true,
        createdAt: true,
        updatedAt: true,
        project: { id: true },
      },
    });
    if (!column) throw new NotFoundException('Board column not found');
    if (column.project.id !== projectId) {
      throw new BadRequestException(
        'The board column does not belong to this project',
      );
    }
    return column;
  }

  private async getTaskOrFail(taskId: string): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: { project: true },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private async createTaskNotification(input: {
    taskId: string;
    recipientId: string;
    actorId?: string | null;
    type: NotificationType;
    title: string;
    message: string;
    projectId: string;
    resourceType: string;
    resourceId: string;
    logMessage: string;
  }): Promise<void> {
    if (input.actorId && input.recipientId === input.actorId) {
      return;
    }

    try {
      await this.notificationsService.create({
        recipientId: input.recipientId,
        actorId: input.actorId,
        type: input.type,
        title: input.title,
        message: input.message,
        projectId: input.projectId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
      });
    } catch (error) {
      this.logger.error(
        input.logMessage,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  // ─── Tasks ─────────────────────────────────────────────────────────────

  async listTasks(projectId: string, userId: string, page = 1, limit = 50) {
    const [tasks, total] = await this.taskRepo.findAndCount({
      where: { project: { id: projectId } },
      relations: {
        project: true,
        createdBy: true,
        assignee: true,
        boardColumn: true,
        dependencies: true,
        subtasks: true,
        comments: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        label: true,
        deadline: true,
        type: true,
        status: true,
        priority: true,
        columnOrder: true,
        source: true,
        attachments: true,
        createdAt: true,
        updatedAt: true,
        project: { id: true },
        createdBy: TasksService.USER_SUMMARY_SELECT,
        assignee: TasksService.USER_SUMMARY_SELECT,
        boardColumn: TasksService.BOARD_COLUMN_SELECT,
        dependencies: { id: true, title: true },
        subtasks: {
          id: true,
          title: true,
          isCompleted: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
        comments: { id: true },
      },
      order: {
        columnOrder: 'ASC',
        subtasks: { sortOrder: 'ASC', createdAt: 'ASC' },
      },
      take: limit,
      skip: (page - 1) * limit,
    });

    return { tasks, total, page, limit };
  }

  async listTasksByColumn(columnId: string, userId: string) {
    const column = await this.boardRepo.findOne({
      where: { id: columnId },
      select: { id: true },
    });

    if (!column) throw new NotFoundException('Board column not found');

    return this.taskRepo.find({
      where: { boardColumn: { id: columnId } },
      relations: {
        project: true,
        createdBy: true,
        assignee: true,
        boardColumn: true,
        dependencies: true,
        subtasks: true,
        comments: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        label: true,
        deadline: true,
        type: true,
        status: true,
        priority: true,
        columnOrder: true,
        source: true,
        attachments: true,
        createdAt: true,
        updatedAt: true,
        project: { id: true },
        createdBy: TasksService.USER_SUMMARY_SELECT,
        assignee: TasksService.USER_SUMMARY_SELECT,
        boardColumn: TasksService.BOARD_COLUMN_SELECT,
        dependencies: { id: true, title: true },
        subtasks: {
          id: true,
          title: true,
          isCompleted: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
        comments: { id: true },
      },
      order: {
        columnOrder: 'ASC',
        subtasks: { sortOrder: 'ASC', createdAt: 'ASC' },
      },
    });
  }

  async createTask(
    projectId: string,
    boardColumnId: string,
    dto: CreateTaskDto,
    userId: string,
  ) {
    const {
      assigneeId,
      assignee: assigneeInput,
      dependencyIds,
      ...scalarFields
    } = dto;
    const resolvedAssigneeId =
      assigneeInput !== undefined ? assigneeInput : assigneeId;
    const creatorId = userId;

    const [currentUser, assignee, boardColumn] = await Promise.all([
      this.userRepo.findOne({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      }),
      resolvedAssigneeId
        ? this.userRepo.findOne({ where: { id: resolvedAssigneeId } })
        : Promise.resolve(null),
      this.boardRepo.findOne({
        where: { id: boardColumnId },
        relations: { project: true },
      }),
    ]);

    if (resolvedAssigneeId && !assignee) {
      throw new NotFoundException('Assignee not found');
    }
    if (resolvedAssigneeId) {
      await this.assertAssigneeMembership(projectId, resolvedAssigneeId);
    }
    if (!boardColumn) {
      throw new NotFoundException('Board column not found');
    }
    if (boardColumn.project.id !== projectId) {
      throw new BadRequestException(
        'The board column does not belong to this project',
      );
    }

    let dependencies: Task[] = [];
    if (dependencyIds && dependencyIds.length > 0) {
      const uniqueDepIds = Array.from(new Set(dependencyIds));
      dependencies = await this.taskRepo.find({
        where: uniqueDepIds.map((id) => ({ id, project: { id: projectId } })),
      });
      if (dependencies.length !== uniqueDepIds.length) {
        throw new BadRequestException(
          'One or more dependency tasks were not found in this project',
        );
      }
    }

    const task = this.taskRepo.create({
      ...scalarFields,
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      columnOrder: dto.columnOrder ?? 0,
      project: { id: projectId } as Project,
      createdBy: currentUser!,
      assignee,
      boardColumn,
      dependencies,
      assignedBy: assignee ? currentUser : null,
      subtasks: [],
      comments: [],
      timeLogs: [],
    });

    const savedTask = await this.taskRepo.save(task);

    // Fire side-effects in parallel — they are independent
    const sideEffects: Promise<void>[] = [];
    if (assignee && assignee.id !== creatorId) {
      sideEffects.push(
        this.createTaskNotification({
          taskId: savedTask.id,
          recipientId: assignee.id,
          actorId: creatorId,
          type: NotificationType.TASK_ASSIGNED,
          title: 'Task assigned',
          message: `You were assigned to task: ${savedTask.title}`,
          projectId,
          resourceType: 'TASK',
          resourceId: savedTask.id,
          logMessage: `Failed to create TASK_ASSIGNED notification for taskId=${savedTask.id}, recipientId=${assignee.id}`,
        }),
      );
    }
    sideEffects.push(
      this.activitiesService.logActivity(
        userId,
        projectId,
        `created task: ${savedTask.title}`,
        'task',
        savedTask.id,
      ),
    );
    await Promise.all(sideEffects);

    const payload: TaskCreatedPayload = {
      projectId: task.project.id,
      task: mapTaskToApiTaskSummary(savedTask),
    };

    this.eventEmitter.emit(
      DOMAIN_EVENTS.TASK.CREATED,
      new TaskCreatedEvent(payload),
    );
    return savedTask;
  }

  async getTask(taskId: string, userId: string) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: {
        project: true,
        createdBy: true,
        assignee: true,
        boardColumn: true,
        dependencies: true,
        subtasks: true,
        comments: {
          user: true,
        },
        timeLogs: {
          user: true,
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        label: true,
        deadline: true,
        type: true,
        status: true,
        priority: true,
        columnOrder: true,
        source: true,
        attachments: true,
        metadata: true,
        generationJobId: true,
        createdAt: true,
        updatedAt: true,
        project: { id: true },
        createdBy: TasksService.USER_SUMMARY_SELECT,
        assignee: TasksService.USER_SUMMARY_SELECT,
        boardColumn: TasksService.BOARD_COLUMN_SELECT,
        dependencies: { id: true, title: true },
        subtasks: {
          id: true,
          title: true,
          isCompleted: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
        comments: {
          id: true,
          body: true,
          createdAt: true,
          updatedAt: true,
          user: TasksService.USER_SUMMARY_SELECT,
        },
        timeLogs: {
          id: true,
          durationMin: true,
          loggedDate: true,
          note: true,
          createdAt: true,
          user: TasksService.USER_SUMMARY_SELECT,
        },
      },
      order: {
        subtasks: { sortOrder: 'ASC', createdAt: 'ASC' },
        comments: { createdAt: 'ASC' },
      },
    });

    if (!task) throw new NotFoundException('Task not found');

    return task;
  }

  async updateTask(taskId: string, dto: UpdateTaskDto, currentUser: User) {
  const task = await this.taskRepo.findOne({
    where: { id: taskId },
    relations: {
      project: true,
      createdBy: true,
      assignee: true,
      dependencies: true,
      subtasks: true,
      boardColumn: true,
      comments: { user: true },
    },
    select: {
      id: true,
      title: true,
      description: true,
      label: true,
      deadline: true,
      type: true,
      status: true,
      priority: true,
      columnOrder: true,
      source: true,
      attachments: true,
      metadata: true,
      generationJobId: true,
      createdAt: true,
      updatedAt: true,
      project: { id: true },
      createdBy: TasksService.USER_SUMMARY_SELECT,
      assignee: TasksService.USER_SUMMARY_SELECT,
      boardColumn: TasksService.BOARD_COLUMN_SELECT,
      dependencies: { id: true, title: true },
      subtasks: {
        id: true,
        title: true,
        isCompleted: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
      comments: {
        id: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        user: TasksService.USER_SUMMARY_SELECT,
      },
    },
    order: {
      subtasks: { sortOrder: 'ASC', createdAt: 'ASC' },
      comments: { createdAt: 'ASC' },
    },
  });

  if (!task) throw new NotFoundException('Task not found');

  const oldAssigneeId = task.assignee?.id ?? null;
  const oldTitle = task.title;
  const oldDescription = task.description;
  const oldPriority = task.priority;

  const oldDeadlineTime = task.deadline
    ? new Date(task.deadline).getTime()
    : null;

  const oldLabel = task.label;
  const oldType = task.type;
  const oldBoardColumnId = task.boardColumn?.id ?? null;

  const oldDependencyIds = new Set(
    (task.dependencies ?? []).map((dependency) => dependency.id),
  );

  const {
    assigneeId,
    assignee: assigneeInput,
    boardColumnId,
    dependencyIds,
    ...scalarFields
  } = dto;

  const resolvedAssigneeId =
    assigneeInput !== undefined ? assigneeInput : assigneeId;

  if (resolvedAssigneeId !== undefined) {
    if (resolvedAssigneeId === null) {
      task.assignee = null;
    } else {
      const assignee = await this.userRepo.findOne({
        where: { id: resolvedAssigneeId },
      });

      if (!assignee) {
        throw new NotFoundException('Assignee not found');
      }

      await this.assertAssigneeMembership(
        task.project.id,
        resolvedAssigneeId,
      );

      task.assignee = assignee;
      task.assignedBy = currentUser;
    }
  }

  if (boardColumnId !== undefined) {
    task.boardColumn = await this.resolveBoardColumn(
      boardColumnId,
      task.project.id,
    );
  }

  if (dependencyIds !== undefined) {
    if (dependencyIds.includes(taskId)) {
      throw new BadRequestException('A task cannot depend on itself');
    }

    if (dependencyIds.length === 0) {
      task.dependencies = [];
    } else {
      const uniqueDepIds = Array.from(new Set(dependencyIds));

      const foundDeps = await this.taskRepo.find({
        where: uniqueDepIds.map((id) => ({
          id,
          project: { id: task.project.id },
        })),
      });

      if (foundDeps.length !== uniqueDepIds.length) {
        throw new BadRequestException(
          'One or more dependency tasks were not found in this project',
        );
      }

      task.dependencies = foundDeps;
    }
  }

  if (scalarFields.deadline !== undefined) {
    task.deadline = scalarFields.deadline
      ? new Date(scalarFields.deadline)
      : null;

    delete scalarFields.deadline;
  }

  const oldStatus = task.status;

  Object.assign(task, scalarFields);

  const savedTask = await this.taskRepo.save(task);

  const newStatus = savedTask.status;
  const newAssigneeId = savedTask.assignee?.id ?? null;

  const newDeadlineTime = savedTask.deadline
    ? new Date(savedTask.deadline).getTime()
    : null;

  const newDependencyIds = new Set(
    (savedTask.dependencies ?? []).map((dependency) => dependency.id),
  );

  const dependenciesChanged =
    oldDependencyIds.size !== newDependencyIds.size ||
    Array.from(oldDependencyIds).some(
      (dependencyId) => !newDependencyIds.has(dependencyId),
    );

  const meaningfulTaskChanged =
    oldTitle !== savedTask.title ||
    oldDescription !== savedTask.description ||
    oldPriority !== savedTask.priority ||
    oldDeadlineTime !== newDeadlineTime ||
    oldLabel !== savedTask.label ||
    oldType !== savedTask.type ||
    oldBoardColumnId !== (savedTask.boardColumn?.id ?? null) ||
    dependenciesChanged ||
    (oldStatus !== newStatus && newStatus !== TaskStatus.DONE);

  // Fire all side-effects in parallel — they are independent
  const sideEffects: Promise<void>[] = [];

  if (oldStatus !== TaskStatus.DONE && newStatus === TaskStatus.DONE) {
    const completedRecipientId = savedTask.createdBy?.id;

    if (completedRecipientId) {
      sideEffects.push(
        this.createTaskNotification({
          taskId: savedTask.id,
          recipientId: completedRecipientId,
          actorId: currentUser.id,
          type: NotificationType.TASK_COMPLETED,
          title: 'Task completed',
          message: `Task completed: ${savedTask.title}`,
          projectId: savedTask.project.id,
          resourceType: 'TASK',
          resourceId: savedTask.id,
          logMessage: `Failed to create TASK_COMPLETED notification for taskId=${savedTask.id}, recipientId=${completedRecipientId}`,
        }),
      );
    }
  }

  if (meaningfulTaskChanged && newAssigneeId) {
    sideEffects.push(
      this.createTaskNotification({
        taskId: savedTask.id,
        recipientId: newAssigneeId,
        actorId: currentUser.id,
        type: NotificationType.TASK_UPDATED,
        title: 'Task updated',
        message: `Task updated: ${savedTask.title}`,
        projectId: savedTask.project.id,
        resourceType: 'TASK',
        resourceId: savedTask.id,
        logMessage: `Failed to create TASK_UPDATED notification for taskId=${savedTask.id}, recipientId=${newAssigneeId}`,
      }),
    );
  }

  if (oldAssigneeId !== newAssigneeId) {
    if (oldAssigneeId && !newAssigneeId) {
      sideEffects.push(
        this.createTaskNotification({
          taskId: savedTask.id,
          recipientId: oldAssigneeId,
          actorId: currentUser.id,
          type: NotificationType.TASK_UNASSIGNED,
          title: 'Task unassigned',
          message: `You were unassigned from task: ${savedTask.title}`,
          projectId: savedTask.project.id,
          resourceType: 'TASK',
          resourceId: savedTask.id,
          logMessage: `Failed to create TASK_UNASSIGNED notification for taskId=${savedTask.id}, recipientId=${oldAssigneeId}`,
        }),
      );
    } else if (!oldAssigneeId && newAssigneeId) {
      sideEffects.push(
        this.createTaskNotification({
          taskId: savedTask.id,
          recipientId: newAssigneeId,
          actorId: currentUser.id,
          type: NotificationType.TASK_ASSIGNED,
          title: 'Task assigned',
          message: `You were assigned to task: ${savedTask.title}`,
          projectId: savedTask.project.id,
          resourceType: 'TASK',
          resourceId: savedTask.id,
          logMessage: `Failed to create TASK_ASSIGNED notification for taskId=${savedTask.id}, recipientId=${newAssigneeId}`,
        }),
      );
    } else if (
      oldAssigneeId &&
      newAssigneeId &&
      oldAssigneeId !== newAssigneeId
    ) {
      sideEffects.push(
        this.createTaskNotification({
          taskId: savedTask.id,
          recipientId: oldAssigneeId,
          actorId: currentUser.id,
          type: NotificationType.TASK_UNASSIGNED,
          title: 'Task unassigned',
          message: `You were unassigned from task: ${savedTask.title}`,
          projectId: savedTask.project.id,
          resourceType: 'TASK',
          resourceId: savedTask.id,
          logMessage: `Failed to create TASK_UNASSIGNED notification for taskId=${savedTask.id}, recipientId=${oldAssigneeId}`,
        }),
      );

      sideEffects.push(
        this.createTaskNotification({
          taskId: savedTask.id,
          recipientId: newAssigneeId,
          actorId: currentUser.id,
          type: NotificationType.TASK_ASSIGNED,
          title: 'Task assigned',
          message: `You were assigned to task: ${savedTask.title}`,
          projectId: savedTask.project.id,
          resourceType: 'TASK',
          resourceId: savedTask.id,
          logMessage: `Failed to create TASK_ASSIGNED notification for taskId=${savedTask.id}, recipientId=${newAssigneeId}`,
        }),
      );
    }
  }

  let message = `updated task: ${savedTask.title}`;

  if (dto.status && dto.status !== oldStatus) {
    const action =
      dto.status === TaskStatus.DONE
        ? 'completed'
        : 'updated status of';

    message = `${action} task: ${savedTask.title}`;
  }

  sideEffects.push(
    this.activitiesService.logActivity(
      currentUser.id,
      savedTask.project.id,
      message,
      'task',
      savedTask.id,
    ),
  );

  await Promise.all(sideEffects);

  const payload: TaskUpdatedPayload = {
    projectId: task.project.id,
    task: mapTaskToApiTaskSummary(savedTask),
  };

  this.eventEmitter.emit(
    DOMAIN_EVENTS.TASK.UPDATED,
    new TaskUpdatedEvent(payload),
  );

  return savedTask;
}

  async deleteTask(taskId: string, userId: string) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: { project: true },
      select: { id: true, title: true, project: { id: true } },
    });
    if (!task) throw new NotFoundException('Task not found');

    // Delete and log activity in parallel — activity references title, not the DB row
    await Promise.all([
      this.taskRepo.delete({ id: taskId }),
      this.activitiesService.logActivity(
        userId,
        task.project.id,
        `deleted task: ${task.title}`,
        'task',
        taskId,
      ),
    ]);

    const payload: TaskDeletedPayload = {
      projectId: task.project.id,
      taskId: task.id,
    };

    this.eventEmitter.emit(
      DOMAIN_EVENTS.TASK.DELETED,
      new TaskDeletedEvent(payload),
    );
  }

  // ─── Subtasks ──────────────────────────────────────────────────────────

  async createSubtasks(taskId: string, dto: CreateSubTaskDto, userId: string) {
    const task = await this.getTaskOrFail(taskId);

    const maxQuery = await this.subtaskRepo
      .createQueryBuilder('subtask')
      .select('MAX(subtask.sortOrder)', 'max')
      .where('subtask.task = :taskId', { taskId: task.id })
      .getRawOne();

    let currentMaxSort = maxQuery?.max != null ? Number(maxQuery.max) : 0;

    const subtasksToCreate = dto.subtasks.map((item) => {
      let finalSortOrder: number;

      if (item.sortOrder != null) {
        finalSortOrder = item.sortOrder;
        currentMaxSort = Math.max(currentMaxSort, item.sortOrder);
      } else {
        currentMaxSort += 1;
        finalSortOrder = currentMaxSort;
      }

      return this.subtaskRepo.create({
        title: item.title,
        sortOrder: finalSortOrder,
        isCompleted: false,
        task,
      });
    });

    const savedSubtasks = await this.subtaskRepo.save(subtasksToCreate);

    for (const savedSubtask of savedSubtasks) {
      const payload: SubtaskCreatedPayload = {
        projectId: task.project.id,
        taskId: task.id,
        subtask: mapSubtaskToApiSubtask(savedSubtask),
      };
      this.eventEmitter.emit(
        DOMAIN_EVENTS.SUBTASK.CREATED,
        new SubtaskCreatedEvent(payload),
      );
    }

    return savedSubtasks;
  }

  async updateSubtask(
    taskId: string,
    subtaskId: string,
    dto: UpdateSubTaskDto,
    userId: string,
  ) {
    const subtask = await this.subtaskRepo.findOne({
      where: { id: subtaskId, task: { id: taskId } },
      relations: { task: { project: true } },
    });
    if (!subtask) throw new NotFoundException('Subtask not found');

    if (dto.title !== undefined) subtask.title = dto.title;
    if (dto.completed !== undefined) subtask.isCompleted = dto.completed;
    const savedSubtask = await this.subtaskRepo.save(subtask);

    const payload: SubtaskUpdatedPayload = {
      projectId: subtask.task.project.id,
      taskId: subtask.task.id,
      subtask: mapSubtaskToApiSubtask(savedSubtask),
    };
    this.eventEmitter.emit(
      DOMAIN_EVENTS.SUBTASK.UPDATED,
      new SubtaskUpdatedEvent(payload),
    );
    return savedSubtask;
  }

  async deleteSubtask(subtaskId: string, userId: string) {
    const subtask = await this.subtaskRepo.findOne({
      where: { id: subtaskId },
      relations: { task: { project: true } },
    });

    if (!subtask) {
      throw new NotFoundException('Subtask not found');
    }

    await this.subtaskRepo.delete({ id: subtaskId });

    const payload: SubtaskDeletedPayload = {
      projectId: subtask.task.project.id,
      taskId: subtask.task.id,
      subtaskId: subtask.id,
    };
    this.eventEmitter.emit(
      DOMAIN_EVENTS.SUBTASK.DELETED,
      new SubtaskDeletedEvent(payload),
    );
  }

  // ─── Comments ──────────────────────────────────────────────────────────

  async createComment(taskId: string, dto: CreateCommentDto, userId: string) {
    const [task, currentUser] = await Promise.all([
      this.taskRepo.findOne({
        where: { id: taskId },
        relations: { project: true, assignee: true },
        select: {
          id: true,
          title: true,
          project: { id: true },
          assignee: { id: true },
        },
      }),
      this.userRepo.findOne({
        where: { id: userId },
        select: TasksService.USER_SUMMARY_SELECT,
      }),
    ]);
    if (!task) throw new NotFoundException('Task not found');
    if (!currentUser) throw new NotFoundException('User not found');

    const comment = this.taskCommentRepo.create({
      body: dto.body,
      task,
      user: currentUser,
    });

    const savedComment = await this.taskCommentRepo.save(comment);

    // Fire side-effects in parallel — they are independent
    const sideEffects: Promise<void>[] = [];
    if (task.assignee?.id) {
      sideEffects.push(
        this.createTaskNotification({
          taskId: task.id,
          recipientId: task.assignee.id,
          actorId: userId,
          type: NotificationType.COMMENT_ADDED,
          title: 'New comment added',
          message: `New comment on task: ${task.title}`,
          projectId: task.project.id,
          resourceType: 'COMMENT',
          resourceId: savedComment.id,
          logMessage: `Failed to create COMMENT_ADDED notification for taskId=${task.id}, recipientId=${task.assignee.id}`,
        }),
      );
    }
    sideEffects.push(
      this.activitiesService.logActivity(
        userId,
        task.project.id,
        `added a comment on: ${task.title}`,
        'comment',
        savedComment.id,
      ),
    );
    await Promise.all(sideEffects);

    const payload: CommentCreatedPayload = {
      projectId: task.project.id,
      taskId: task.id,
      comment: mapCommentToApiComment(savedComment),
    };
    this.eventEmitter.emit(
      DOMAIN_EVENTS.COMMENT.CREATED,
      new CommentCreatedEvent(payload),
    );
    return savedComment;
  }

  async listComments(taskId: string, userId: string, page = 1, limit = 50) {
    const [comments, total] = await this.taskCommentRepo.findAndCount({
      where: { task: { id: taskId } },
      relations: {
        user: true,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        user: TasksService.USER_SUMMARY_SELECT,
      },
      order: { createdAt: 'ASC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return { comments, total, page, limit };
  }

  async updateComment(
    commentId: string,
    dto: UpdateCommentDto,
    userId: string,
  ) {
    const comment = await this.taskCommentRepo.findOne({
      where: { id: commentId },
      relations: { user: true, task: { project: true } },
    });

    if (!comment) throw new NotFoundException('Comment not found');

    comment.body = dto.body;
    const savedComment = await this.taskCommentRepo.save(comment);
    const payload: CommentUpdatedPayload = {
      projectId: comment.task.project.id,
      taskId: comment.task.id,
      comment: mapCommentToApiComment(savedComment),
    };
    this.eventEmitter.emit(
      DOMAIN_EVENTS.COMMENT.UPDATED,
      new CommentUpdatedEvent(payload),
    );
    return savedComment;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.taskCommentRepo.findOne({
      where: { id: commentId },
      relations: { task: { project: true } },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    await this.taskCommentRepo.delete({ id: commentId });
    const payload: CommentDeletedPayload = {
      projectId: comment.task.project.id,
      taskId: comment.task.id,
      commentId: comment.id,
    };
    this.eventEmitter.emit(
      DOMAIN_EVENTS.COMMENT.DELETED,
      new CommentDeletedEvent(payload),
    );
  }

  // ─── Time Logs ─────────────────────────────────────────────────────────

  async createTimeLog(taskId: string, dto: CreateTimeLogDto, userId: string) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: { project: true },
      select: { id: true, project: { id: true } },
    });
    if (!task) throw new NotFoundException('Task not found');

    const timeLog = this.timeLogRepo.create({
      durationMin: dto.durationMin,
      loggedDate: new Date(dto.loggedDate),
      note: dto.note,
      task,
      user: { id: userId } as User,
    });

    return this.timeLogRepo.save(timeLog);
  }

  async listTimeLogs(taskId: string, userId: string, page = 1, limit = 50) {
    const [timeLogs, total] = await this.timeLogRepo.findAndCount({
      where: { task: { id: taskId } },
      relations: {
        user: true,
      },
      select: {
        id: true,
        durationMin: true,
        loggedDate: true,
        note: true,
        createdAt: true,
        user: TasksService.USER_SUMMARY_SELECT,
      },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return { timeLogs, total, page, limit };
  }

  async deleteTimeLog(timeLogId: string, userId: string) {
    const timeLog = await this.timeLogRepo.findOne({
      where: { id: timeLogId },
    });
    if (!timeLog) throw new NotFoundException('Time log not found');

    await this.timeLogRepo.delete({ id: timeLogId });
  }

  // ─── Attachments ───────────────────────────────────────────────────────

  async uploadAttachments(
    taskId: string,
    userId: string,
    files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided.');
    }
    if (files.length > 5) {
      throw new BadRequestException(
        'Maximum 5 files can be uploaded at a time.',
      );
    }

    const [task, uploader] = await Promise.all([
      this.taskRepo.findOne({
        where: { id: taskId },
        relations: {
          project: true,
          createdBy: true,
          assignee: true,
          dependencies: true,
          subtasks: true,
          boardColumn: true,
        },
        select: {
          id: true,
          title: true,
          attachments: true,
          columnOrder: true,
          status: true,
          priority: true,
          source: true,
          label: true,
          description: true,
          deadline: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          project: { id: true },
          createdBy: TasksService.USER_SUMMARY_SELECT,
          assignee: TasksService.USER_SUMMARY_SELECT,
          boardColumn: TasksService.BOARD_COLUMN_SELECT,
          dependencies: { id: true, title: true },
          subtasks: { id: true, isCompleted: true },
        },
      }),
      this.userRepo.findOne({
        where: { id: userId },
        select: TasksService.USER_SUMMARY_SELECT,
      }),
    ]);
    if (!task) throw new NotFoundException('Task not found');
    if (!uploader) throw new NotFoundException('User not found');

    const uploaderSummary: ApiUserSummary = {
      id: uploader.id,
      email: uploader.email,
      firstName: uploader.firstName,
      lastName: uploader.lastName,
      avatarUrl: uploader.avatarUrl || null,
    };

    const nowIso = new Date().toISOString();

    const uploadPromises = files.map(async (file) => {
      const { publicUrl } = await this.storageService.uploadAttachment(
        taskId,
        file.buffer,
        file.mimetype,
        file.originalname,
      );

      const attachment: ApiAttachment = {
        id: randomUUID(),
        fileName: file.originalname,
        fileUrl: publicUrl,
        mimeType: file.mimetype,
        size: file.size,
        uploadedBy: uploaderSummary,
        created_at: nowIso,
      };

      return attachment;
    });

    const newAttachments = await Promise.all(uploadPromises);

    task.attachments = [...(task.attachments || []), ...newAttachments];

    const updatedTask = await this.taskRepo.save(task);

    // Fire-and-forget activity logging — non-critical side-effect
    this.activitiesService.logActivity(
      userId,
      task.project.id,
      `added ${newAttachments.length} attachment(s) to task: ${task.title}`,
      'task',
      task.id,
    ).catch((err) =>
      this.logger.error('Failed to log attachment upload activity', err),
    );

    // Realtime event
    const payload: TaskUpdatedPayload = {
      projectId: task.project.id,
      task: mapTaskToApiTaskSummary(updatedTask),
    };
    this.eventEmitter.emit(
      DOMAIN_EVENTS.TASK.UPDATED,
      new TaskUpdatedEvent(payload),
    );

    return {
      newAttachments,
      allAttachments: updatedTask.attachments,
      taskId: updatedTask.id,
      attachmentsCount: updatedTask.attachments.length,
    };
  }

  async deleteAttachment(taskId: string, attachmentId: string, userId: string) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: {
        project: true,
        createdBy: true,
        assignee: true,
        dependencies: true,
        subtasks: true,
        boardColumn: true,
      },
      select: {
        id: true,
        title: true,
        attachments: true,
        columnOrder: true,
        status: true,
        priority: true,
        source: true,
        label: true,
        description: true,
        deadline: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        project: { id: true },
        createdBy: TasksService.USER_SUMMARY_SELECT,
        assignee: TasksService.USER_SUMMARY_SELECT,
        boardColumn: TasksService.BOARD_COLUMN_SELECT,
        dependencies: { id: true, title: true },
        subtasks: { id: true, isCompleted: true },
      },
    });
    if (!task) throw new NotFoundException('Task not found');

    const attachments = task.attachments || [];
    const targetIndex = attachments.findIndex((a) => a.id === attachmentId);

    if (targetIndex === -1) {
      throw new NotFoundException('Attachment not found');
    }

    const [targetAttachment] = attachments.splice(targetIndex, 1);

    // Delete file from Supabase storage
    if (targetAttachment.fileUrl) {
      await this.storageService.deleteAttachment(targetAttachment.fileUrl);
    }

    task.attachments = attachments;
    const updatedTask = await this.taskRepo.save(task);

    // Fire-and-forget activity logging — non-critical side-effect
    this.activitiesService.logActivity(
      userId,
      task.project.id,
      `deleted attachment "${targetAttachment.fileName}" from task: ${task.title}`,
      'task',
      task.id,
    ).catch((err) =>
      this.logger.error('Failed to log attachment delete activity', err),
    );

    // Realtime event
    const payload: TaskUpdatedPayload = {
      projectId: task.project.id,
      task: mapTaskToApiTaskSummary(updatedTask),
    };
    this.eventEmitter.emit(
      DOMAIN_EVENTS.TASK.UPDATED,
      new TaskUpdatedEvent(payload),
    );

    return {
      deletedAttachment: targetAttachment,
      remainingAttachments: updatedTask.attachments,
      taskId: updatedTask.id,
      attachmentsCount: updatedTask.attachments.length,
    };
  }
}
