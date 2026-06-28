import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CsrfGuard } from '@shared/guards/csrf.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User } from '@modules/users/entities/user.entity';
import { Serialize } from '@shared/interceptors/serialize.interceptor';
import { PaginationQueryDto } from '@shared/dto/pagination-query.dto';

import { CreateTaskDto } from './dtos/create-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { TaskDto, PaginatedTasksDto } from './dtos/task.dto';
import {
  CreateSubTaskDto,
  SubTaskResponseDto,
  UpdateSubTaskDto,
} from './dtos/subtask.dto';
import {
  CreateCommentDto,
  CommentResponseDto,
  PaginatedCommentsDto,
} from './dtos/comment.dto';
import {
  CreateTimeLogDto,
  TimeLogResponseDto,
  PaginatedTimeLogsDto,
} from './dtos/time-log.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // ─── Task Endpoints ────────────────────────────────────

  @Get('projects/:projectId/tasks')
  @Serialize(PaginatedTasksDto)
  async listTasks(
    @Param('projectId') projectId: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: User,
  ) {
    const { page = 1, limit = 50 } = query;
    const data = await this.tasksService.listTasks(
      projectId,
      user.id,
      page,
      limit,
    );
    return { message: 'Tasks retrieved successfully.', data };
  }

  @Get('boards/:columnId/tasks')
  @Serialize(TaskDto)
  async listTasksByColumn(
    @Param('columnId') columnId: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.tasksService.listTasksByColumn(columnId, user.id);
    return { message: 'Tasks retrieved successfully.', data };
  }

  @Post('projects/:projectId/tasks')
  @UseGuards(CsrfGuard)
  @Serialize(TaskDto)
  async createTask(
    @Param('projectId') projectId: string,
    @Body() body: CreateTaskDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.tasksService.createTask(projectId, body, user.id);
    return { message: 'Task created successfully.', data };
  }

  @Get('tasks/:id')
  @Serialize(TaskDto)
  async getTask(@Param('id') id: string, @CurrentUser() user: User) {
    const data = await this.tasksService.getTask(id, user.id);
    return { message: 'Task retrieved successfully.', data };
  }

  @Patch('tasks/:id')
  @UseGuards(CsrfGuard)
  @Serialize(TaskDto)
  async updateTask(
    @Param('id') id: string,
    @Body() body: UpdateTaskDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.tasksService.updateTask(id, body, user.id);
    return { message: 'Task updated successfully.', data };
  }

  @Delete('tasks/:id')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async deleteTask(@Param('id') id: string, @CurrentUser() user: User) {
    await this.tasksService.deleteTask(id, user.id);
    return { message: 'Task deleted successfully.' };
  }

  // ─── Subtask Endpoints ─────────────────────────────────

  @Post('tasks/:id/subtasks')
  @UseGuards(CsrfGuard)
  @Serialize(SubTaskResponseDto)
  async createSubtask(
    @Param('id') taskId: string,
    @Body() body: CreateSubTaskDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.tasksService.createSubtask(taskId, body, user.id);
    return { message: 'Subtask created successfully.', data };
  }

  @Patch('tasks/:id/subtasks/:sid')
  @UseGuards(CsrfGuard)
  @Serialize(SubTaskResponseDto)
  async updateSubtask(
    @Param('id') taskId: string,
    @Param('sid') subtaskId: string,
    @Body() body: UpdateSubTaskDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.tasksService.updateSubtask(
      taskId,
      subtaskId,
      body,
      user.id,
    );
    return { message: 'Subtask updated successfully.', data };
  }

  @Delete('tasks/:id/subtasks/:sid')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async deleteSubtask(
    @Param('sid') subtaskId: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.tasksService.deleteSubtask(subtaskId, user.id);
    return { message: 'Subtask deleted successfully', data };
  }

  // ─── Comment Endpoints ─────────────────────────────────
  @Post('tasks/:id/comments')
  @UseGuards(CsrfGuard)
  @Serialize(CommentResponseDto)
  async createComment(
    @Param('id') taskId: string,
    @Body() body: CreateCommentDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.tasksService.createComment(taskId, body, user.id);
    return { message: 'Comment added successfully.', data };
  }

  @Get('tasks/:id/comments')
  @Serialize(PaginatedCommentsDto)
  async listComments(
    @Param('id') taskId: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: User,
  ) {
    const { page = 1, limit = 50 } = query;
    const data = await this.tasksService.listComments(
      taskId,
      user.id,
      page,
      limit,
    );
    return { message: 'Comments retrieved successfully.', data };
  }

  @Delete('comments/:cid')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async deleteComment(
    @Param('cid') commentId: string,
    @CurrentUser() user: User,
  ) {
    await this.tasksService.deleteComment(commentId, user.id);
    return { message: 'Comment deleted successfully.' };
  }

  // ─── TimeLog Endpoints ─────────────────────────────────

  @Post('tasks/:id/time-logs')
  @UseGuards(CsrfGuard)
  @Serialize(TimeLogResponseDto)
  async createTimeLog(
    @Param('id') taskId: string,
    @Body() body: CreateTimeLogDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.tasksService.createTimeLog(taskId, body, user.id);
    return { message: 'Time log recorded successfully.', data };
  }

  @Get('tasks/:id/time-logs')
  @Serialize(PaginatedTimeLogsDto)
  async listTimeLogs(
    @Param('id') taskId: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: User,
  ) {
    const { page = 1, limit = 50 } = query;
    const data = await this.tasksService.listTimeLogs(
      taskId,
      user.id,
      page,
      limit,
    );
    return { message: 'Time logs retrieved successfully.', data };
  }

  @Delete('time-logs/:lid')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async deleteTimeLog(@Param('lid') logId: string, @CurrentUser() user: User) {
    await this.tasksService.deleteTimeLog(logId, user.id);
    return { message: 'Time log deleted successfully.' };
  }
}
