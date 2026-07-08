import { Expose } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class FocusItemDto {
  @Expose()
  id!: string;

  @Expose()
  taskId!: string;

  @Expose()
  title!: string;

  @Expose()
  projectName!: string;

  @Expose()
  time!: string;

  @Expose()
  completed!: boolean;
}

export class ToggleFocusItemDto {
  @IsBoolean()
  completed!: boolean;
}
