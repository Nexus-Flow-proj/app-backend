import { Expose, Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { TaskUserDto } from './task.dto';

export class CreateTimeLogDto {
  @IsInt()
  @Min(1)
  durationMin!: number;

  @IsDateString()
  loggedDate!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class TimeLogResponseDto {
  @Expose()
  id!: string;

  @Expose()
  durationMin!: number;

  @Expose()
  loggedDate!: Date;

  @Expose()
  note!: string | null;

  @Expose()
  @Type(() => TaskUserDto)
  user!: TaskUserDto;

  @Expose()
  created_at!: Date;
}

export class PaginatedTimeLogsDto {
  @Expose()
  @Type(() => TimeLogResponseDto)
  timeLogs!: TimeLogResponseDto[];

  @Expose()
  total!: number;

  @Expose()
  page!: number;

  @Expose()
  limit!: number;
}
