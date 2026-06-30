import { Expose, Transform, Type } from 'class-transformer';
import { TaskType } from '../enums/task-type.enum';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { TaskSource } from '../enums/task-source.enum';
import { SubTaskResponseDto } from './subtask.dto';
import { CommentResponseDto } from './comment.dto';

export class TaskUserDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  avatarUrl: string | null;
}

export class BoardColumnInfoDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  color: string;
}

export class ApiUserSummaryDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  avatarUrl: string | null;
}

export class ApiAttachmentDto {
  @Expose()
  id: string;

  @Expose()
  fileName: string;

  @Expose()
  fileUrl: string;

  @Expose()
  mimeType: string;

  @Expose()
  size: number;

  @Expose()
  @Type(() => ApiUserSummaryDto)
  uploadedBy: ApiUserSummaryDto;

  @Expose()
  created_at: string;
}

export class TaskDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  description: string | null;

  @Expose()
  label: string;

  @Expose()
  deadline: Date | null;

  @Expose()
  type: TaskType;

  @Expose()
  status: TaskStatus;

  @Expose()
  priority: TaskPriority;

  @Expose()
  columnOrder: number;

  @Expose()
  @Type(() => ApiAttachmentDto)
  attachments: ApiAttachmentDto[];

  @Expose()
  @Transform(({ obj }) => obj.project?.id || null)
  projectId: string;

  @Expose()
  @Type(() => SubTaskResponseDto)
  subtasks!: SubTaskResponseDto[];

  @Expose()
  @Type(() => BoardColumnInfoDto)
  boardColumn: BoardColumnInfoDto;

  @Expose()
  @Type(() => TaskUserDto)
  createdBy: TaskUserDto;

  @Expose()
  @Type(() => CommentResponseDto)
  comments!: CommentResponseDto[];

  @Expose()
  @Type(() => TaskUserDto)
  assignee: TaskUserDto | null;

  @Expose()
  source: TaskSource;

  @Expose()
  @Transform(({ obj }) => obj.subtasks?.length ?? 0)
  subtasksCount: number;

  @Expose()
  @Transform(({ obj }) => obj.comments?.length ?? 0)
  commentsCount: number;

  @Expose()
  @Transform(({ obj }) => obj.attachments?.length ?? 0)
  attachmentsCount: number;

  @Expose()
  @Transform(
    ({ obj }) => obj.subtasks?.filter((s: any) => s.isCompleted).length ?? 0,
  )
  completedSubtasksCount: number;

  @Expose()
  @Transform(({ obj }) => obj.createdAt)
  created_at: Date;

  @Expose()
  @Transform(({ obj }) => obj.updatedAt)
  updated_at: Date;
}

export class TaskListDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  description: string | null;

  @Expose()
  label: string;

  @Expose()
  deadline: Date | null;

  @Expose()
  type: TaskType;

  @Expose()
  status: TaskStatus;

  @Expose()
  priority: TaskPriority;

  @Expose()
  columnOrder: number;

  @Expose()
  @Type(() => ApiAttachmentDto)
  attachments: ApiAttachmentDto[];

  @Expose()
  @Transform(({ obj }) => obj.project?.id || null)
  projectId: string;

  @Expose()
  @Type(() => BoardColumnInfoDto)
  boardColumn: BoardColumnInfoDto;

  @Expose()
  @Type(() => TaskUserDto)
  createdBy: TaskUserDto;

  @Expose()
  @Type(() => TaskUserDto)
  assignee: TaskUserDto | null;

  @Expose()
  source: TaskSource;

  @Expose()
  @Transform(({ obj }) => obj.createdAt)
  created_at: Date;

  @Expose()
  @Transform(({ obj }) => obj.updatedAt)
  updated_at: Date;

  @Expose()
  @Transform(({ obj }) => obj.subtasks?.length ?? 0)
  subtasksCount: number;

  @Expose()
  @Transform(({ obj }) => obj.comments?.length ?? 0)
  commentsCount: number;

  @Expose()
  @Transform(({ obj }) => obj.attachments?.length ?? 0)
  attachmentsCount: number;

  @Expose()
  @Transform(
    ({ obj }) => obj.subtasks?.filter((s: any) => s.isCompleted).length ?? 0,
  )
  completedSubtasksCount: number;
}

export class PaginatedTasksDto {
  @Expose()
  @Type(() => TaskListDto)
  tasks!: TaskListDto[];

  @Expose()
  total!: number;

  @Expose()
  page!: number;

  @Expose()
  limit!: number;
}
