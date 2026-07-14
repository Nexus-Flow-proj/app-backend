import { NotificationType } from '../enums/notification-type.enum';

export interface ApiNotificationActor {
  id: string;
  name: string;
  avatar?: string;
}

export interface ApiNotificationMetadata {
  projectId?: string;
  taskId?: string;
  commentId?: string;
  invitationId?: string;
}

export interface ApiNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actor?: ApiNotificationActor;
  metadata?: ApiNotificationMetadata;
  isRead: boolean;
  createdAt: string;
}
