import { Expose, Type } from 'class-transformer';

export class TaskProgressPointDto {
  @Expose()
  day!: string;

  @Expose()
  completed!: number;
}

export class TaskProgressDto {
  @Expose()
  range!: 'last_7_days' | 'last_30_days' | 'this_month';

  @Expose()
  @Type(() => TaskProgressPointDto)
  points!: TaskProgressPointDto[];
}
