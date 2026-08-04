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

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

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

  private async createTaskAssignedNotification(
    taskId: string,
    taskTitle: string,
    projectId: string,
    recipientId: string,
    actorId: string,
  ): Promise<void> {
    if (recipientId === actorId) {
      return;
    }

    try {
      await this.notificationsService.create({
        recipientId,
        actorId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Task assigned',
        message: `You were assigned to task: ${taskTitle}`,
        projectId,
        resourceType: 'TASK',
        resourceId: taskId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create TASK_ASSIGNED notification for taskId=${taskId}, recipientId=${recipientId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async createTaskUnassignedNotification(
    taskId: string,
    taskTitle: string,
    projectId: string,
    recipientId: string,
    actorId: string,
  ): Promise<void> {
    if (recipientId === actorId) {
      return;
    }

    try {
      await this.notificationsService.create({
        recipientId,
        actorId,
        type: NotificationType.TASK_UNASSIGNED,
        title: 'Task unassigned',
        message: `You were unassigned from task: ${taskTitle}`,
        projectId,
        resourceType: 'TASK',
        resourceId: taskId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create TASK_UNASSIGNED notification for taskId=${taskId}, recipientId=${recipientId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async createTaskCompletedNotification(
    taskId: string,
    taskTitle: string,
    projectId: string,
    recipientId: string,
    actorId: string,
  ): Promise<void> {
    if (recipientId === actorId) {
      return;
    }

    try {
      await this.notificationsService.create({
        recipientId,
        actorId,
        type: NotificationType.TASK_COMPLETED,
        title: 'Task completed',
        message: `Task completed: ${taskTitle}`,
        projectId,
        resourceType: 'TASK',
        resourceId: taskId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create TASK_COMPLETED notification for taskId=${taskId}, recipientId=${recipientId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async createCommentAddedNotification(
    taskId: string,
    taskTitle: string,
    commentId: string,
    projectId: string,
    recipientId: string,
    actorId: string,
  ): Promise<void> {
    if (recipientId === actorId) {
      return;
    }

    try {
      await this.notificationsService.create({
        recipientId,
        actorId,
        type: NotificationType.COMMENT_ADDED,
        title: 'New comment added',
        message: `New comment on task: ${taskTitle}`,
        projectId,
        resourceType: 'COMMENT',
        resourceId: commentId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create COMMENT_ADDED notification for taskId=${taskId}, recipientId=${recipientId}`,
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
        comments: { user: true },
      },
      order: {
        columnOrder: 'ASC',
        subtasks: { sortOrder: 'ASC', createdAt: 'ASC' },
        comments: { createdAt: 'ASC' },
      },
      take: limit,
      skip: (page - 1) * limit,
    });

    return { tasks, total, page, limit };
  }

  async listTasksByColumn(columnId: string, userId: string) {
    const column = await this.boardRepo.findOne({
      where: { id: columnId },
      relations: { project: true },
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
        comments: { user: true },
      },
      order: {
        columnOrder: 'ASC',
        subtasks: { sortOrder: 'ASC', createdAt: 'ASC' },
        comments: { createdAt: 'ASC' },
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
      subtasks: [],
      comments: [],
      timeLogs: [],
    });

    const savedTask = await this.taskRepo.save(task);
    if (assignee && assignee.id !== creatorId) {
      await this.createTaskAssignedNotification(
        savedTask.id,
        savedTask.title,
        projectId,
        assignee.id,
        creatorId,
      );
    }
    await this.activitiesService.logActivity(
      userId,
      projectId,
      `created task: ${savedTask.title}`,
      'task',
      savedTask.id,
    );

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
      order: {
        subtasks: { sortOrder: 'ASC', createdAt: 'ASC' },
        comments: { createdAt: 'ASC' },
      },
    });

    if (!task) throw new NotFoundException('Task not found');

    return task;
  }

  async updateTask(taskId: string, dto: UpdateTaskDto, userId: string) {
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
      order: {
        subtasks: { sortOrder: 'ASC', createdAt: 'ASC' },
        comments: { createdAt: 'ASC' },
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    const oldAssigneeId = task.assignee?.id ?? null;

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
        if (!assignee) throw new NotFoundException('Assignee not found');
        await this.assertAssigneeMembership(
          task.project.id,
          resolvedAssigneeId,
        );
        task.assignee = assignee;
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
    if (oldStatus !== TaskStatus.DONE && newStatus === TaskStatus.DONE) {
      const completedRecipientId = savedTask.createdBy?.id;
      if (completedRecipientId) {
        await this.createTaskCompletedNotification(
          savedTask.id,
          savedTask.title,
          savedTask.project.id,
          completedRecipientId,
          userId,
        );
      }
    }
    const newAssigneeId = savedTask.assignee?.id ?? null;
    if (oldAssigneeId !== newAssigneeId) {
      if (oldAssigneeId && !newAssigneeId) {
        await this.createTaskUnassignedNotification(
          savedTask.id,
          savedTask.title,
          savedTask.project.id,
          oldAssigneeId,
          userId,
        );
      } else if (!oldAssigneeId && newAssigneeId) {
        await this.createTaskAssignedNotification(
          savedTask.id,
          savedTask.title,
          savedTask.project.id,
          newAssigneeId,
          userId,
        );
      } else if (
        oldAssigneeId &&
        newAssigneeId &&
        oldAssigneeId !== newAssigneeId
      ) {
        await this.createTaskUnassignedNotification(
          savedTask.id,
          savedTask.title,
          savedTask.project.id,
          oldAssigneeId,
          userId,
        );
        await this.createTaskAssignedNotification(
          savedTask.id,
          savedTask.title,
          savedTask.project.id,
          newAssigneeId,
          userId,
        );
      }
    }
    let message = `updated task: ${savedTask.title}`;
    if (dto.status && dto.status !== oldStatus) {
      const action =
        dto.status === TaskStatus.DONE ? 'completed' : 'updated status of';
      message = `${action} task: ${savedTask.title}`;
    }
    await this.activitiesService.logActivity(
      userId,
      savedTask.project.id,
      message,
      'task',
      savedTask.id,
    );
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
    });
    if (!task) throw new NotFoundException('Task not found');
    await this.taskRepo.delete({ id: taskId });
    await this.activitiesService.logActivity(
      userId,
      task.project.id,
      `deleted task: ${task.title}`,
      'task',
      taskId,
    );

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
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: { project: true, assignee: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    const currentUser = await this.userRepo.findOne({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
      },
    });
    if (!currentUser) throw new NotFoundException('User not found');

    const comment = this.taskCommentRepo.create({
      body: dto.body,
      task,
      user: currentUser,
    });

    const savedComment = await this.taskCommentRepo.save(comment);
    if (task.assignee?.id) {
      await this.createCommentAddedNotification(
        task.id,
        task.title,
        savedComment.id,
        task.project.id,
        task.assignee.id,
        userId,
      );
    }
    await this.activitiesService.logActivity(
      userId,
      task.project.id,
      `added a comment on: ${task.title}`,
      'comment',
      savedComment.id,
    );
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

    await this.taskRepo.delete({ id: timeLogId });
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
    });
    if (!task) throw new NotFoundException('Task not found');

    const uploader = await this.userRepo.findOne({ where: { id: userId } });
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

    // Record activity
    await this.activitiesService.logActivity(
      userId,
      task.project.id,
      `added ${newAttachments.length} attachment(s) to task: ${task.title}`,
      'task',
      task.id,
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

    // Record activity
    await this.activitiesService.logActivity(
      userId,
      task.project.id,
      `deleted attachment "${targetAttachment.fileName}" from task: ${task.title}`,
      'task',
      task.id,
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
