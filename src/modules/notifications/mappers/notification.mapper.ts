import { Notification } from '../entities/notification.entity';
import { ApiNotification } from '../interfaces/api-notification.interface';

export function mapNotificationToApiNotification(
  notification: Notification,
): ApiNotification {
  return {
    id: notification.id,
    recipientId: notification.recipientId,
    actorId: notification.actorId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    projectId: notification.projectId,
    resourceType: notification.resourceType,
    resourceId: notification.resourceId,
    isRead: notification.isRead,
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    createdAt: notification.createdAt.toISOString(),
    updatedAt: notification.updatedAt.toISOString(),
  };
}
