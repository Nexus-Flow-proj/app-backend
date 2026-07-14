import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';

import { User } from '@modules/users/entities/user.entity';
import { Notification } from './entities/notification.entity';
import { CreateNotificationInput } from './inputs/create-notification.input';
import { NOTIFICATION_DOMAIN_EVENTS } from './constants/notification-domain-events';
import { NotificationCreatedEvent } from './domain-events/notification-created.event';
import { mapNotificationToApiNotification } from './mappers/notification.mapper';
import { ApiNotification } from './interfaces/api-notification.interface';

export interface NotificationsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface NotificationsListResult {
  items: ApiNotification[];
  unreadCount: number;
  pagination: NotificationsPagination;
}

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

  async getMyNotifications(
    userId: string,
    page = 1,
    limit = 50,
  ): Promise<NotificationsListResult> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationRepo
        .createQueryBuilder('notification')
        .leftJoinAndMapOne(
          'notification.actor',
          User,
          'actor',
          'actor.id = notification.actor_id',
        )
        .where('notification.recipient_id = :userId', { userId })
        .orderBy('notification.created_at', 'DESC')
        .skip(skip)
        .take(safeLimit)
        .getMany(),
      this.notificationRepo.count({
        where: { recipientId: userId },
      }),
      this.notificationRepo.count({
        where: { recipientId: userId, isRead: false },
      }),
    ]);

    const items = notifications.map((notification) =>
      mapNotificationToApiNotification(notification as Notification & {
        actor?: {
          id: string;
          firstName: string;
          lastName: string;
          avatarUrl: string | null;
        } | null;
      }),
    );

    return {
      items,
      unreadCount,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
      },
    };
  }

  async markNotificationAsRead(
    notificationId: string,
    userId: string,
  ): Promise<boolean> {
    const result = await this.notificationRepo.update(
      {
        id: notificationId,
        recipientId: userId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );

    return (result.affected ?? 0) > 0;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepo.update(
      {
        recipientId: userId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );
  }
}
