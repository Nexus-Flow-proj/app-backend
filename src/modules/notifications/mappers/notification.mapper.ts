import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../enums/notification-type.enum';
import {
  ApiNotification,
  ApiNotificationActor,
  ApiNotificationMetadata,
} from '../interfaces/api-notification.interface';

type NotificationMapperInput = Notification & {
  actor?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
};

function buildActor(
  actor: NotificationMapperInput['actor'],
): ApiNotificationActor | undefined {
  if (!actor) {
    return undefined;
  }

  const name = [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim();

  return {
    id: actor.id,
    name: name || actor.id,
    ...(actor.avatarUrl ? { avatar: actor.avatarUrl } : {}),
  };
}

function buildMetadata(
  notification: Notification,
): ApiNotificationMetadata | undefined {
  const metadata: ApiNotificationMetadata = {};

  if (notification.projectId) {
    metadata.projectId = notification.projectId;
  }

  switch (notification.resourceType?.toUpperCase()) {
    case 'TASK':
      if (notification.resourceId) metadata.taskId = notification.resourceId;
      break;
    case 'COMMENT':
      if (notification.resourceId) metadata.commentId = notification.resourceId;
      break;
    case 'INVITATION':
      if (notification.resourceId) {
        metadata.invitationId = notification.resourceId;
      }
      if (
        notification.type === NotificationType.INVITATION_RECEIVED &&
        notification.inviteToken
      ) {
        metadata.inviteToken = notification.inviteToken;
      }
      break;
    default:
      break;
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

export function mapNotificationToApiNotification(
  notification: NotificationMapperInput,
): ApiNotification {
  const actor = buildActor(notification.actor);
  const metadata = buildMetadata(notification);

  let createdAt: string;
  if (notification.createdAt instanceof Date) {
    createdAt = notification.createdAt.toISOString();
  } else if (notification.createdAt) {
    createdAt = new Date(notification.createdAt).toISOString();
  } else {
    createdAt = new Date().toISOString();
  }

  return {
    id: notification.id,
    userId: notification.recipientId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    ...(actor ? { actor } : {}),
    ...(metadata ? { metadata } : {}),
    isRead: notification.isRead,
    createdAt,
  };
}
