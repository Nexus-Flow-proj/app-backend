import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskType } from '../enums/task-type.enum';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { TaskSource } from '../enums/task-source.enum';

export class ApiUserSummaryInputDto {
  @IsUUID()
  id!: string;

  @IsString()
  email!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;
}

export class ApiAttachmentInputDto {
  @IsUUID()
  id!: string;

  @IsString()
  fileName!: string;

  @IsString()
  fileUrl!: string;

  @IsString()
  mimeType!: string;

  @IsNumber()
  size!: number;

  @ValidateNested()
  @Type(() => ApiUserSummaryInputDto)
  uploadedBy!: ApiUserSummaryInputDto;

  @IsString()
  created_at!: string;
}

export class CreateTaskDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsNumber()
  columnOrder?: number;

  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @IsOptional()
  @IsUUID()
  assignee?: string | null;

  @IsOptional()
  @IsEnum(TaskSource)
  source?: TaskSource;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApiAttachmentInputDto)
  attachments?: ApiAttachmentInputDto[];
}
