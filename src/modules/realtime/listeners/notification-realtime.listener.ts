import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { RealtimeService } from '../services/realtime.service';
import { SOCKET_EVENTS } from '../constants/socket-events';
import { NotificationCreatedEvent } from '@modules/notifications/domain-events/notification-created.event';
import { NOTIFICATION_DOMAIN_EVENTS } from '@modules/notifications/constants/notification-domain-events';
import { mapNotificationToApiNotification } from '@modules/notifications/mappers/notification.mapper';

@Injectable()
export class NotificationRealtimeListener {
  constructor(private readonly realtimeService: RealtimeService) {}

  @OnEvent(NOTIFICATION_DOMAIN_EVENTS.CREATED)
  handleNotificationCreated(event: NotificationCreatedEvent) {
    this.realtimeService.emitToUser(
      event.payload.recipientId,
      SOCKET_EVENTS.NOTIFICATION.NEW,
      {
        notification: mapNotificationToApiNotification(event.payload.notification),
      },
    );
  }
}
