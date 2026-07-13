import { Notification } from '../entities/notification.entity';

export interface NotificationCreatedPayload {
  recipientId: string;
  notification: Notification;
}

export class NotificationCreatedEvent {
  constructor(public readonly payload: NotificationCreatedPayload) {}
}
