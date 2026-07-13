import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';

import { Notification } from './entities/notification.entity';
import { CreateNotificationInput } from './inputs/create-notification.input';
import { NOTIFICATION_DOMAIN_EVENTS } from './constants/notification-domain-events';
import { NotificationCreatedEvent } from './domain-events/notification-created.event';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    input: CreateNotificationInput,
  ): Promise<Notification | null> {
    if (input.actorId && input.actorId === input.recipientId) {
      return null;
    }

    const notification = this.notificationRepo.create({
      recipientId: input.recipientId,
      actorId: input.actorId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      projectId: input.projectId ?? null,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      isRead: false,
      readAt: null,
    });

    const savedNotification = await this.notificationRepo.save(notification);

    this.eventEmitter.emit(
      NOTIFICATION_DOMAIN_EVENTS.CREATED,
      new NotificationCreatedEvent({
        recipientId: savedNotification.recipientId,
        notification: savedNotification,
      }),
    );

    return savedNotification;
  }
}
