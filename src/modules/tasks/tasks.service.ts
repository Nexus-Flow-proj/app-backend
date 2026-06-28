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
    const member = await this.projectMemberRepo.findOne({
      where: { project: { id: projectId }, user: { id: userId } },
    });
    if (!member) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  // ─── Tasks ─────────────────────────────────────────────────────────────

  async listTasks(projectId: string, userId: string) {
    await this.checkProjectAccess(projectId, userId);
    return this.taskRepo.find({
      where: { project: { id: projectId } },
      relations: {
        project: true,
        createdBy: true,
        assignee: true,
        boardId: true,
      },
      order: { columnOrder: 'ASC' },
    });
  }

  async createTask(projectId: string, dto: CreateTaskDto, userId: string) {
    await this.checkProjectAccess(projectId, userId);

    const { assigneeId, boardId, ...scalarFields } = dto;

    let assignee: User | null = null;
    if (assigneeId) {
      assignee = await this.userRepo.findOne({ where: { id: assigneeId } });
      if (!assignee) throw new NotFoundException('Assignee not found');
    }

    let boardColumn: Board | null = null;
    if (boardId) {
      boardColumn = await this.boardRepo.findOne({ where: { id: boardId } });
      if (!boardColumn) throw new NotFoundException('Board column not found');
    }

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
    const task = await this.getTask(taskId, userId);

    const { assigneeId, boardId, ...scalarFields } = dto;

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

    if (boardId !== undefined) {
      if (boardId === null) {
        task.boardId = null;
      } else {
        const board = await this.boardRepo.findOne({ where: { id: boardId } });
        if (!board) throw new NotFoundException('Board column not found');
        task.boardId = board;
      }
    }

    Object.assign(task, scalarFields);

    return this.taskRepo.save(task);
  }

  async deleteTask(taskId: string, userId: string) {
    const task = await this.getTask(taskId, userId);
    await this.taskRepo.remove(task);
  }

  // ─── Subtasks ──────────────────────────────────────────────────────────

  async createSubtask(taskId: string, dto: CreateSubTaskDto, userId: string) {
    const task = await this.getTask(taskId, userId);

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
    await this.getTask(taskId, userId); // check access

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
    const task = await this.getTask(taskId, userId);
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) throw new NotFoundException('User not found');

    const comment = this.taskCommentRepo.create({
      body: dto.body,
      task,
      user,
    });

    return this.taskCommentRepo.save(comment);
  }

  async listComments(taskId: string, userId: string) {
    await this.getTask(taskId, userId); // check access

    return this.taskCommentRepo.find({
      where: { task: { id: taskId } },
      relations: {
        user: true,
      },
      order: { created_at: 'ASC' },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.taskCommentRepo.findOne({
      where: { id: commentId },
      relations: {
        user: true,
        task: {
          project: true,
        },
      },
    });

    if (!comment) throw new NotFoundException('Comment not found');

    if (comment.user.id !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.taskCommentRepo.remove(comment);
  }

  // ─── Time Logs ─────────────────────────────────────────────────────────

  async createTimeLog(taskId: string, dto: CreateTimeLogDto, userId: string) {
    const task = await this.getTask(taskId, userId);
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) throw new NotFoundException('User not found');

    const timeLog = this.timeLogRepo.create({
      durationMin: dto.durationMin,
      loggedDate: new Date(dto.loggedDate),
      note: dto.note,
      task,
      user,
    });

    return this.timeLogRepo.save(timeLog);
  }

  async listTimeLogs(taskId: string, userId: string) {
    await this.getTask(taskId, userId); // check access

    return this.timeLogRepo.find({
      where: { task: { id: taskId } },
      relations: {
        user: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteTimeLog(timeLogId: string, userId: string) {
    const timeLog = await this.timeLogRepo.findOne({
      where: { id: timeLogId },
      relations: {
        user: true,
        task: {
          project: true,
        },
      },
    });

    if (!timeLog) throw new NotFoundException('Time log not found');

    if (timeLog.user.id !== userId) {
      throw new ForbiddenException('You can only delete your own time logs');
    }

    await this.timeLogRepo.remove(timeLog);
  }
}
