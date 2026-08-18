import { Expose, Type } from 'class-transformer';

export class NotificationActorDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  avatar?: string;
}

export class NotificationMetadataDto {
  @Expose()
  projectId?: string;

  @Expose()
  taskId?: string;

  @Expose()
  commentId?: string;

  @Expose()
  invitationId?: string;

  @Expose()
  inviteToken?: string;
}

export class NotificationResponseDto {
  @Expose()
  id!: string;

  @Expose()
  userId!: string;

  @Expose()
  type!: string;

  @Expose()
  title!: string;

  @Expose()
  message!: string;

  @Expose()
  @Type(() => NotificationActorDto)
  actor?: NotificationActorDto;

  @Expose()
  @Type(() => NotificationMetadataDto)
  metadata?: NotificationMetadataDto;

  @Expose()
  isRead!: boolean;

  @Expose()
  createdAt!: string;
}

export class NotificationsPaginationDto {
  @Expose()
  page!: number;

  @Expose()
  limit!: number;

  @Expose()
  total!: number;

  @Expose()
  totalPages!: number;
}

export class NotificationsListResponseDto {
  @Expose()
  @Type(() => NotificationResponseDto)
  notifications!: NotificationResponseDto[];

  @Expose()
  unreadCount!: number;

  @Expose()
  page!: number;

  @Expose()
  limit!: number;

  @Expose()
  total!: number;

  @Expose()
  totalPages!: number;
}
