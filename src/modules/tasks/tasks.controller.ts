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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  attachmentFileFilter,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_ATTACHMENT_FILES_COUNT,
} from '@shared/utils/file-validation.util';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CsrfGuard } from '@shared/guards/csrf.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User } from '@modules/users/entities/user.entity';
import { Serialize } from '@shared/interceptors/serialize.interceptor';
import { PaginationQueryDto } from '@shared/dto/pagination-query.dto';

import { CreateTaskDto } from './dtos/create-task.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';
import { TaskDto, PaginatedTasksDto, TaskListDto } from './dtos/task.dto';
import {
  AttachmentUploadResponseDto,
  AttachmentDeleteResponseDto,
} from './dtos/storage-response.dto';
import {
  CreateSubTaskDto,
  SubTaskResponseDto,
  UpdateSubTaskDto,
} from './dtos/subtask.dto';
import {
  CreateCommentDto,
  CommentResponseDto,
  PaginatedCommentsDto,
  UpdateCommentDto,
} from './dtos/comment.dto';
import {
  CreateTimeLogDto,
  TimeLogResponseDto,
  PaginatedTimeLogsDto,
} from './dtos/time-log.dto';
import { ProjectAuthGuard } from '@shared/guards/project-auth.guard';
import { RequirePermission } from '@shared/decorators/require-permission.decorator';

@Controller()
@UseGuards(JwtAuthGuard, ProjectAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // ─── Task Endpoints ────────────────────────────────────

  @Get('projects/:projectId/tasks')
  @RequirePermission('tasks', 'read')
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
  @RequirePermission('tasks', 'read')
  @Serialize(TaskListDto)
  async listTasksByColumn(
    @Param('columnId') columnId: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.tasksService.listTasksByColumn(columnId, user.id);
    return { message: 'Tasks retrieved successfully.', data };
  }

  @Post('projects/:projectId/tasks/:boardColumnId')
  @UseGuards(CsrfGuard)
  @RequirePermission('tasks', 'create')
  @Serialize(TaskDto)
  async createTask(
    @Param('projectId') projectId: string,
    @Param('boardColumnId') boardColumnId: string,
    @Body() body: CreateTaskDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.tasksService.createTask(
      projectId,
      boardColumnId,
      body,
      user.id,
    );
    return { message: 'Task created successfully.', data };
  }

  @Get('tasks/:id')
  @RequirePermission('tasks', 'read')
  @Serialize(TaskDto)
  async getTask(@Param('id') id: string, @CurrentUser() user: User) {
    const data = await this.tasksService.getTask(id, user.id);
    return { message: 'Task retrieved successfully.', data };
  }

  @Patch('tasks/:id')
  @UseGuards(CsrfGuard)
  @RequirePermission('tasks', 'update')
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
  @RequirePermission('tasks', 'delete')
  @HttpCode(HttpStatus.OK)
  async deleteTask(@Param('id') id: string, @CurrentUser() user: User) {
    await this.tasksService.deleteTask(id, user.id);
    return { message: 'Task deleted successfully.' };
  }

  // ─── Subtask Endpoints ─────────────────────────────────

  @Post('tasks/:id/subtasks')
  @UseGuards(CsrfGuard)
  @RequirePermission('tasks', 'update')
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
  @RequirePermission('tasks', 'update')
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
  @RequirePermission('tasks', 'delete')
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
  @RequirePermission('tasks', 'read')
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
  @RequirePermission('tasks', 'read')
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

  @Patch('comments/:cid')
  @UseGuards(CsrfGuard)
  @Serialize(CommentResponseDto)
  async updateComment(
    @Param('cid') commentId: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.tasksService.updateComment(commentId, dto, user.id);
    return { message: 'Comment Updated Successfully', data };
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
  @RequirePermission('tasks', 'read')
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
  @RequirePermission('tasks', 'read')
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

  // ─── Attachment Endpoints ──────────────────────────────

  @Post('tasks/:id/attachments')
  @UseGuards(CsrfGuard)
  @RequirePermission('tasks', 'update')
  @UseInterceptors(
    FilesInterceptor('files', MAX_ATTACHMENT_FILES_COUNT, {
      limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
      fileFilter: attachmentFileFilter,
    }),
  )
  @Serialize(AttachmentUploadResponseDto)
  async uploadAttachments(
    @Param('id') taskId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'Please provide files with form field name "files".',
      );
    }
    const data = await this.tasksService.uploadAttachments(
      taskId,
      user.id,
      files,
    );
    return { message: 'Attachment(s) uploaded successfully.', data };
  }

  @Delete('tasks/:id/attachments/:attachmentId')
  @UseGuards(CsrfGuard)
  @RequirePermission('tasks', 'update')
  @Serialize(AttachmentDeleteResponseDto)
  async deleteAttachment(
    @Param('id') taskId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.tasksService.deleteAttachment(
      taskId,
      attachmentId,
      user.id,
    );
    return { message: 'Attachment deleted successfully.', data };
  }
}
