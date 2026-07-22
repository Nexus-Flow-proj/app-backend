import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskPriority } from '@modules/tasks/enums/task-priority.enum';
import { TaskType } from '@modules/tasks/enums/task-type.enum';
import { TaskSource } from '@modules/tasks/enums/task-source.enum';
import { OnboardingProjectInfoDto } from './save-onboarding-draft.dto';

export class OnboardingTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(TaskPriority)
  priority!: TaskPriority;

  @IsEnum(TaskType)
  type!: TaskType;

  @IsEnum(TaskSource)
  source!: TaskSource;

  @IsNumber()
  sortOrder!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptanceCriteria?: string[];

  @IsOptional()
  estimatedComplexity?: 'S' | 'M' | 'L' | 'XL';
}

export class OnboardingFeatureDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  color!: string;

  @IsNumber()
  sortOrder!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingTaskDto)
  tasks!: OnboardingTaskDto[];
}

export class SubmitOnboardingDto {
  @ValidateNested()
  @Type(() => OnboardingProjectInfoDto)
  projectInfo!: OnboardingProjectInfoDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingFeatureDto)
  features!: OnboardingFeatureDto[];

  @IsOptional()
  @IsUUID()
  draftId?: string;
}
