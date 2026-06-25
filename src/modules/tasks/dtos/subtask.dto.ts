import { Expose } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateSubTaskDto {
  @IsString()
  title!: string;
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
  created_at!: Date;
}
