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
  @MaxLength(255)
  taskId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  featureId?: string;

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

  @IsOptional()
  @IsString()
  @MaxLength(50)
  priority?: string;
}
