import {
  Injectable,
  NotFoundException,
  ForbiddenException,
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
import { CreateCommentDto } from './dtos/comment.dto';
import { CreateTimeLogDto } from './dtos/time-log.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private taskRepo: Repository<Task>,
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(SubTask) private subtaskRepo: Repository<SubTask>,
    @InjectRepository(TimeLog) private timeLogRepo: Repository<TimeLog>,
    @InjectRepository(ProjectMember)
    private projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(TaskComment)
    private taskCommentRepo: Repository<TaskComment>,
    @InjectRepository(Board) private boardRepo: Repository<Board>,
  ) {}

  private async checkProjectAccess(projectId: string, userId: string) {
    const count = await this.projectMemberRepo.count({
      where: { project: { id: projectId }, user: { id: userId } },
    });
    if (count === 0) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  private async assertTaskAccess(taskId: string, userId: string): Promise<Task> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      select: { id: true, project: { id: true } },
      relations: { project: true },
    });
    if (!task) throw new NotFoundException('Task not found');
    await this.checkProjectAccess(task.project.id, userId);
    return task;
  }

  // ─── Tasks ─────────────────────────────────────────────────────────────

  async listTasks(projectId: string, userId: string, page = 1, limit = 50) {
    await this.checkProjectAccess(projectId, userId);
    const [tasks, total] = await this.taskRepo.findAndCount({
      where: { project: { id: projectId } },
      relations: {
        createdBy: true,
        assignee: true,
        boardId: true,
      },
      order: { columnOrder: 'ASC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    tasks.forEach((task) => {
      task.project = { id: projectId } as Project;
    });
    return { tasks, total, page, limit };
  }

  async createTask(projectId: string, dto: CreateTaskDto, userId: string) {
    await this.checkProjectAccess(projectId, userId);

    const { assigneeId, boardId, ...scalarFields } = dto;

    const [assignee, boardColumn] = await Promise.all([
      assigneeId
        ? this.userRepo.findOne({ where: { id: assigneeId } })
        : Promise.resolve(null),
      boardId
        ? this.boardRepo.findOne({ where: { id: boardId } })
        : Promise.resolve(null),
    ]);

    if (assigneeId && !assignee) throw new NotFoundException('Assignee not found');
    if (boardId && !boardColumn) throw new NotFoundException('Board column not found');

    const task = this.taskRepo.create({
      ...scalarFields,
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      columnOrder: dto.columnOrder ?? 0,
      project: { id: projectId } as Project,
      createdBy: { id: userId } as User,
      assignee,
      boardId: boardColumn,
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
        boardId: true,
        subtasks: true,
        comments: {
          user: true,
        },
        timeLogs: {
          user: true,
        },
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
        boardId: true,
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    await this.checkProjectAccess(task.project.id, userId);

    const { assigneeId, boardId, ...scalarFields } = dto;

    const [assignee, board] = await Promise.all([
      assigneeId ? this.userRepo.findOne({ where: { id: assigneeId } }) : Promise.resolve(undefined),
      boardId ? this.boardRepo.findOne({ where: { id: boardId } }) : Promise.resolve(undefined),
    ]);

    if (assigneeId !== undefined) {
      if (assigneeId === null) {
        task.assignee = null;
      } else {
        if (!assignee) throw new NotFoundException('Assignee not found');
        task.assignee = assignee;
      }
    }

    if (boardId !== undefined) {
      if (boardId === null) {
        task.boardId = null;
      } else {
        if (!board) throw new NotFoundException('Board column not found');
        task.boardId = board;
      }
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

    const subtask = this.subtaskRepo.create({
      title: dto.title,
      isCompleted: false,
      task,
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

    await this.getTask(subtask.task.id, userId);

    await this.subtaskRepo.remove(subtask);
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

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.taskCommentRepo.findOne({
      where: { id: commentId },
      select: { id: true, user: { id: true } },
      relations: { user: true },
    });

    if (!comment) throw new NotFoundException('Comment not found');

    if (comment.user.id !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

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
