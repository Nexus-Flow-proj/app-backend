import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class SaveWorkshopTaskDataDto {
  @IsOptional()
  @IsString()
  @MaxLength(36)
  taskId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  featureId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  kind!: 'Task';

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dueDate?: string;
}
