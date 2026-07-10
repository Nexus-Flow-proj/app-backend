import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Task } from './entities/task.entity';
import { SubTask } from './entities/subtask.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TimeLog } from './entities/time-log.entity';
import { ActivitiesService } from '@modules/activities/activities.service';
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
import { TaskCreatedPayload, TaskDeletedPayload, TaskUpdatedPayload } from '@modules/realtime/interfaces/socket-payloads.interface';
import { mapTaskToApiTaskSummary } from '@modules/realtime/mappers/task-socket.mapper';

@Injectable()
export class TasksService {
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
    private readonly eventEmitter: EventEmitter2,
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

  // ─── Tasks ─────────────────────────────────────────────────────────────

  async listTasks(projectId: string, userId: string, page = 1, limit = 50) {
    const [tasks, total] = await this.taskRepo.findAndCount({
      where: { project: { id: projectId } },
      relations: {
        project: true,
        createdBy: true,
        assignee: true,
        boardColumn: true,
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
    const { assigneeId, assignee: assigneeInput, ...scalarFields } = dto;
    const resolvedAssigneeId =
      assigneeInput !== undefined ? assigneeInput : assigneeId;

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

    const task = this.taskRepo.create({
      ...scalarFields,
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      columnOrder: dto.columnOrder ?? 0,
      project: { id: projectId } as Project,
      createdBy: currentUser!,
      assignee,
      boardColumn,
      subtasks: [],
      comments: [],
      timeLogs: [],
    });

    const savedTask = await this.taskRepo.save(task);
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

    const {
      assigneeId,
      assignee: assigneeInput,
      boardColumnId,
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

    if (scalarFields.deadline !== undefined) {
      task.deadline = scalarFields.deadline
        ? new Date(scalarFields.deadline)
        : null;
      delete scalarFields.deadline;
    }

    const oldStatus = task.status;
    Object.assign(task, scalarFields);

    const savedTask = await this.taskRepo.save(task);
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

  async createSubtask(taskId: string, dto: CreateSubTaskDto, userId: string) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: { project: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    const maxQuery = await this.subtaskRepo
      .createQueryBuilder('subtask')
      .select('MAX(subtask.sortOrder)', 'max')
      .where('subtask.task = :taskId', { taskId: task.id })
      .getRawOne();

    const nextSortOrder = maxQuery?.max != null ? Number(maxQuery.max) + 1 : 1;

    const subtask = this.subtaskRepo.create({
      title: dto.title,
      isCompleted: false,
      task,
      sortOrder: nextSortOrder,
    });

    return this.subtaskRepo.save(subtask);
  }

  async updateSubtask(
    taskId: string,
    subtaskId: string,
    dto: UpdateSubTaskDto,
    userId: string,
  ) {
    const subtask = await this.subtaskRepo.findOne({
      where: { id: subtaskId, task: { id: taskId } },
    });
    if (!subtask) throw new NotFoundException('Subtask not found');

    if (dto.title !== undefined) subtask.title = dto.title;
    if (dto.completed !== undefined) subtask.isCompleted = dto.completed;

    return this.subtaskRepo.save(subtask);
  }

  async deleteSubtask(subtaskId: string, userId: string) {
    const subtask = await this.subtaskRepo.findOne({
      where: { id: subtaskId },
      relations: { task: true },
    });

    if (!subtask) {
      throw new NotFoundException('Subtask not found');
    }

    await this.subtaskRepo.delete({ id: subtaskId });
  }

  // ─── Comments ──────────────────────────────────────────────────────────

  async createComment(taskId: string, dto: CreateCommentDto, userId: string) {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: { project: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    const comment = this.taskCommentRepo.create({
      body: dto.body,
      task,
      user: { id: userId } as User,
    });

    const savedComment = await this.taskCommentRepo.save(comment);
    await this.activitiesService.logActivity(
      userId,
      task.project.id,
      `added a comment on: ${task.title}`,
      'comment',
      savedComment.id,
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
      relations: { user: true },
    });

    if (!comment) throw new NotFoundException('Comment not found');

    comment.body = dto.body;

    return this.taskCommentRepo.save(comment);
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.taskCommentRepo.findOne({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    await this.taskCommentRepo.delete({ id: commentId });
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

    await this.timeLogRepo.delete({ id: timeLogId });
  }
}
