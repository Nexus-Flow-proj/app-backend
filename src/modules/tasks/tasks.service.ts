import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Task } from './entities/task.entity';
import { SubTask } from './entities/subtask.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TimeLog } from './entities/time-log.entity';
import { Project } from '@modules/projects/entities/project.entity';
import { ProjectMember } from '@modules/projects/entities/project-member.entity';
import { User } from '@modules/users/entities/user.entity';
import { Board } from '@modules/boards/entities/board.entity';

import { CreateTaskDto } from './dtos/create-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { CreateSubTaskDto, UpdateSubTaskDto } from './dtos/subtask.dto';
import { CreateCommentDto, UpdateCommentDto } from './dtos/comment.dto';
import { CreateTimeLogDto } from './dtos/time-log.dto';

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
  ) {}

  private async checkProjectAccess(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const isMember = await this.projectMemberRepo.findOne({
      where: { project: { id: projectId }, user: { id: userId } },
      select: { id: true },
    });
    if (!isMember) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  private async assertTaskAccess(
    taskId: string,
    userId: string,
  ): Promise<Task> {
    const task = await this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndMapOne(
        'task.currentUserMembership',
        ProjectMember,
        'member',
        'member.project.id = project.id AND member.user.id = :userId',
        { userId },
      )
      .where('task.id = :taskId', { taskId })
      .getOne();

    if (!task) throw new NotFoundException('Task not found');
    if (!(task as any).currentUserMembership) {
      throw new ForbiddenException('You do not have access to this project');
    }
    return task;
  }

  private async assertSubtaskAccess(
    subtaskId: string,
    userId: string,
    taskId?: string,
  ): Promise<SubTask> {
    const query = this.subtaskRepo
      .createQueryBuilder('subtask')
      .leftJoinAndSelect('subtask.task', 'task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndMapOne(
        'task.currentUserMembership',
        ProjectMember,
        'member',
        'member.project.id = project.id AND member.user.id = :userId',
        { userId },
      )
      .where('subtask.id = :subtaskId', { subtaskId });

    if (taskId) {
      query.andWhere('task.id = :taskId', { taskId });
    }

    const subtask = await query.getOne();
    if (!subtask) throw new NotFoundException('Subtask not found');
    if (!(subtask.task as any).currentUserMembership) {
      throw new ForbiddenException('You do not have access to this project');
    }
    return subtask;
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

  private async assertCommentAccess(
    commentId: string,
    userId: string,
    options: { requireOwnership: boolean } = { requireOwnership: true },
  ): Promise<TaskComment> {
    const comment = await this.taskCommentRepo
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'author')
      .leftJoinAndSelect('comment.task', 'task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndMapOne(
        'task.currentUserMembership',
        ProjectMember,
        'member',
        'member.project.id = project.id AND member.user.id = :userId',
        { userId },
      )
      .where('comment.id = :commentId', { commentId })
      .getOne();

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const isMember = !!(comment.task as any).currentUserMembership;
    if (!isMember) {
      throw new ForbiddenException('You do not have access to this project');
    }

    if (options.requireOwnership && comment.user.id !== userId) {
      throw new ForbiddenException('You can only modify your own comments');
    }

    return comment;
  }

  private async assertTimeLogAccess(
    timeLogId: string,
    userId: string,
    options: { requireOwnership?: boolean } = {},
  ): Promise<TimeLog> {
    const timeLog = await this.timeLogRepo
      .createQueryBuilder('timeLog')
      .leftJoinAndSelect('timeLog.user', 'author')
      .leftJoinAndSelect('timeLog.task', 'task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndMapOne(
        'task.currentUserMembership',
        ProjectMember,
        'member',
        'member.project.id = project.id AND member.user.id = :userId',
        { userId },
      )
      .where('timeLog.id = :timeLogId', { timeLogId })
      .getOne();

    if (!timeLog) throw new NotFoundException('Time log not found');
    if (!(timeLog.task as any).currentUserMembership) {
      throw new ForbiddenException('You do not have access to this project');
    }
    if (options.requireOwnership && timeLog.user.id !== userId) {
      throw new ForbiddenException('You can only modify your own time logs');
    }
    return timeLog;
  }

  // ─── Tasks ─────────────────────────────────────────────────────────────

  async listTasks(projectId: string, userId: string, page = 1, limit = 50) {
    await this.checkProjectAccess(projectId, userId);

    const [tasks, total] = await this.taskRepo.findAndCount({
      where: { project: { id: projectId } },
      select: {
        id: true,
        title: true,
        columnOrder: true,
        project: {
          id: true,
        },
      },
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
        subtasks: { sortOrder: 'ASC' },
        comments: { created_at: 'ASC' },
      },
      take: limit,
      skip: (page - 1) * limit,
    });

    return { tasks, total, page, limit };
  }

  async listTasksByColumn(columnId: string, userId: string) {
    const column = await this.boardRepo
      .createQueryBuilder('column')
      .leftJoinAndSelect('column.project', 'project')
      .leftJoinAndMapOne(
        'column.currentUserMembership',
        ProjectMember,
        'member',
        'member.project.id = project.id AND member.user.id = :userId',
        { userId },
      )
      .where('column.id = :columnId', { columnId })
      .getOne();

    if (!column) throw new NotFoundException('Board column not found');
    if (!(column as any).currentUserMembership) {
      throw new ForbiddenException('You do not have access to this project');
    }

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
        subtasks: { sortOrder: 'ASC' },
        comments: { created_at: 'ASC' },
      },
    });
  }

  async createTask(
    projectId: string,
    boardColumnId: string,
    dto: CreateTaskDto,
    userId: string,
  ) {
    await this.checkProjectAccess(projectId, userId);

    const { assigneeId, ...scalarFields } = dto;

    const [assignee, boardColumn] = await Promise.all([
      assigneeId
        ? this.userRepo.findOne({ where: { id: assigneeId } })
        : Promise.resolve(null),
      this.boardRepo.findOne({
        where: { id: boardColumnId },
        relations: { project: true },
      }),
    ]);

    if (assigneeId && !assignee)
      throw new NotFoundException('Assignee not found');
    if (!boardColumn) throw new NotFoundException('Board column not found');
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
      createdBy: { id: userId } as User,
      assignee,
      boardColumn,
    });

    return this.taskRepo.save(task);
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
        subtasks: { sortOrder: 'ASC' },
        comments: { created_at: 'ASC' },
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    await this.checkProjectAccess(task.project.id, userId);

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
        subtasks: { sortOrder: 'ASC' },
        comments: { created_at: 'ASC' },
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    await this.checkProjectAccess(task.project.id, userId);

    const { assigneeId, boardColumnId, ...scalarFields } = dto;

    if (assigneeId !== undefined) {
      if (assigneeId === null) {
        task.assignee = null;
      } else {
        const assignee = await this.userRepo.findOne({
          where: { id: assigneeId },
        });
        if (!assignee) throw new NotFoundException('Assignee not found');
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

    Object.assign(task, scalarFields);

    return this.taskRepo.save(task);
  }

  async deleteTask(taskId: string, userId: string) {
    await this.assertTaskAccess(taskId, userId);
    await this.taskRepo.delete({ id: taskId });
  }

  // ─── Subtasks ──────────────────────────────────────────────────────────

  async createSubtask(taskId: string, dto: CreateSubTaskDto, userId: string) {
    const task = await this.assertTaskAccess(taskId, userId);

    const maxQuery = await this.subtaskRepo
      .createQueryBuilder('subtask')
      .select('MAX(subtask.sortOrder)', 'max')
      .where('subtask.task_id = :taskId', { taskId: task.id })
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
    await this.assertTaskAccess(taskId, userId);

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

    await this.assertTaskAccess(subtask.task.id, userId);

    await this.subtaskRepo.delete(subtask);
  }

  // ─── Comments ──────────────────────────────────────────────────────────

  async createComment(taskId: string, dto: CreateCommentDto, userId: string) {
    const task = await this.assertTaskAccess(taskId, userId);

    const comment = this.taskCommentRepo.create({
      body: dto.body,
      task,
      user: { id: userId } as User,
    });

    return this.taskCommentRepo.save(comment);
  }

  async listComments(taskId: string, userId: string, page = 1, limit = 50) {
    await this.assertTaskAccess(taskId, userId);

    const [comments, total] = await this.taskCommentRepo.findAndCount({
      where: { task: { id: taskId } },
      relations: {
        user: true,
      },
      order: { created_at: 'ASC' },
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
    const comment = await this.assertCommentAccess(commentId, userId, {
      requireOwnership: true,
    });

    comment.body = dto.body;

    return this.taskCommentRepo.save(comment);
  }

  async deleteComment(commentId: string, userId: string) {
    await this.assertCommentAccess(commentId, userId, {
      requireOwnership: true,
    });

    await this.taskCommentRepo.delete({ id: commentId });
  }

  // ─── Time Logs ─────────────────────────────────────────────────────────

  async createTimeLog(taskId: string, dto: CreateTimeLogDto, userId: string) {
    const task = await this.assertTaskAccess(taskId, userId);

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
    await this.assertTaskAccess(taskId, userId);

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
      select: { id: true, user: { id: true } },
      relations: { user: true },
    });

    if (!timeLog) throw new NotFoundException('Time log not found');

    if (timeLog.user.id !== userId) {
      throw new ForbiddenException('You can only delete your own time logs');
    }

    await this.timeLogRepo.delete({ id: timeLogId });
  }
}
