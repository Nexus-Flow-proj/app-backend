import { Expose, Transform, Type } from 'class-transformer';

export class ActivityActorDto {
  @Expose()
  id!: string;

  @Expose()
  email!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  avatarUrl!: string | null;
}

export class ActivityLogDto {
  @Expose()
  id!: string;

  @Expose()
  @Type(() => ActivityActorDto)
  actor!: ActivityActorDto;

  @Expose()
  message!: string;

  @Expose()
  @Transform(({ obj }) => obj.project?.id || null)
  projectId!: string | null;

  @Expose()
  projectName!: string | null;

  @Expose()
  entityType!: string | null;

  @Expose()
  entityId!: string | null;

  @Expose()
  @Transform(({ obj }) => obj.createdAt)
  created_at!: Date;
}

export class PaginatedActivityLogsDto {
  @Expose()
  @Type(() => ActivityLogDto)
  activities!: ActivityLogDto[];

  @Expose()
  total!: number;

  @Expose()
  page!: number;

  @Expose()
  limit!: number;
}
