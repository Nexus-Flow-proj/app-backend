import { Expose, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSubTaskItemDto {
  @IsString()
  title!: string;

  @IsInt()
  @Min(1)
  sortOrder!: number;
}

export class CreateSubTaskDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSubTaskItemDto)
  subtasks!: CreateSubTaskItemDto[];
}

export class UpdateSubTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

export class SubTaskResponseDto {
  @Expose()
  id!: string;

  @Expose()
  title!: string;

  @Expose()
  isCompleted!: boolean;

  @Expose()
  sortOrder!: number;

  @Expose()
  @Transform(({ obj }) => obj.createdAt)
  created_at!: Date;

  @Expose()
  @Transform(({ obj }) => obj.updatedAt)
  updated_at!: Date;
}
