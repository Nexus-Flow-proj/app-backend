import { Expose, Transform, Type } from 'class-transformer';
import { TaskType } from '../enums/task-type.enum';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { TaskAttachment } from '../entities/task.entity';

// 💡 Mini DTO to expose only safe, essential user details for assignee and creator
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
  attachments: TaskAttachment[];

  // 💡 Safely flattens the loaded Project entity down to just its UUID string
  @Expose()
  @Transform(({ obj }) => obj.project?.id || null)
  projectId: string;

  // 💡 Safely flattens the loaded BoardColumn entity down to its UUID string
  @Expose()
  @Transform(({ obj }) => obj.boardId?.id || null)
  boardColumnId: string | null;

  // 💡 Serializes creator details using the safe nested TaskUserDto layout
  @Expose()
  @Type(() => TaskUserDto)
  createdBy: TaskUserDto;

  // 💡 Serializes assignee details safely, returning null if unassigned
  @Expose()
  @Type(() => TaskUserDto)
  assignee: TaskUserDto | null;

  @Expose()
  created_at: Date;

  @Expose()
  updated_at: Date;
}

export class PaginatedTasksDto {
  @Expose()
  @Type(() => TaskDto)
  tasks!: TaskDto[];

  @Expose()
  total!: number;

  @Expose()
  page!: number;

  @Expose()
  limit!: number;
}
