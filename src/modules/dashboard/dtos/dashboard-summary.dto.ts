import { Expose, Type } from 'class-transformer';
import { TaskPriority } from '@modules/tasks/enums/task-priority.enum';

export class DashboardStatTrendDto {
  @Expose()
  direction!: 'up' | 'down' | 'neutral';

  @Expose()
  label!: string;
}

export class DashboardStatDto {
  @Expose()
  id!: string;

  @Expose()
  label!: string;

  @Expose()
  value!: number;

  @Expose()
  icon!: 'folder' | 'list-checks' | 'check-circle' | 'clock';

  @Expose()
  @Type(() => DashboardStatTrendDto)
  trend!: DashboardStatTrendDto;
}

export class UpcomingDeadlineDto {
  @Expose()
  id!: string;

  @Expose()
  taskId!: string;

  @Expose()
  title!: string;

  @Expose()
  projectId!: string;

  @Expose()
  projectName!: string;

  @Expose()
  dueDate!: string;

  @Expose()
  priority!: TaskPriority;
}

export class ActorDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  avatar!: string;
}

export class RecentActivityItemDto {
  @Expose()
  id!: string;

  @Expose()
  @Type(() => ActorDto)
  actor!: ActorDto;

  @Expose()
  message!: string;

  @Expose()
  projectName!: string;

  @Expose()
  createdAt!: string;
}

export class RecentProjectSummaryDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  role!: 'ADMIN' | 'MEMBER';

  @Expose()
  progress!: number;

  @Expose()
  color!: string;
}

export class DashboardSummaryDto {
  @Expose()
  @Type(() => DashboardStatDto)
  stats!: DashboardStatDto[];

  @Expose()
  @Type(() => UpcomingDeadlineDto)
  upcomingDeadlines!: UpcomingDeadlineDto[];

  @Expose()
  @Type(() => RecentActivityItemDto)
  recentActivity!: RecentActivityItemDto[];

  @Expose()
  @Type(() => RecentProjectSummaryDto)
  recentProjects!: RecentProjectSummaryDto[];
}
