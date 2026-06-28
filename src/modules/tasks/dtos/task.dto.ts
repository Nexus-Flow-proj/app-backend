import { Expose, Transform, Type } from 'class-transformer';
import { TaskType } from '../enums/task-type.enum';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { TaskAttachment } from '../entities/task.entity';

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
  created_at: Date;

  @Expose()
  updated_at: Date;
}
