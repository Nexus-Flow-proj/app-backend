import { NotificationType } from '../enums/notification-type.enum';

export interface CreateNotificationInput {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  projectId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  inviteToken?: string | null;
  deduplicationKey?: string | null;
}
