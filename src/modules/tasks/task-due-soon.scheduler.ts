import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { NotificationsService } from '@modules/notifications/notifications.service';
import { NotificationType } from '@modules/notifications/enums/notification-type.enum';
import { TasksService } from './tasks.service';

@Injectable()
export class TaskDueSoonScheduler {
  private readonly logger = new Logger(TaskDueSoonScheduler.name);

  constructor(
    private readonly tasksService: TasksService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(' * * * * *')
  async handleTaskDueSoonNotifications(): Promise<void> {
    let tasks;

    try {
      tasks = await this.tasksService.findTasksDueTomorrow();
    } catch (error) {
      this.logger.error(
        'Failed to retrieve tasks due tomorrow',
        error instanceof Error ? error.stack : undefined,
      );
      return;
    }

    for (const task of tasks) {
      try {
        const deadline = task.deadline.slice(0, 10);
        const deduplicationKey =
          'TASK_DUE_SOON:' +
          task.id +
          ':' +
          deadline +
          ':' +
          task.assigneeId;

        await this.notificationsService.create({
          recipientId: task.assigneeId,
          actorId: null,
          type: NotificationType.TASK_DUE_SOON,
          title: 'Task due soon',
          message: task.title + ' is due tomorrow',
          projectId: task.projectId,
          resourceType: 'TASK',
          resourceId: task.id,
          deduplicationKey,
        });
      } catch (error) {
        this.logger.error(
          'Failed to create TASK_DUE_SOON notification for taskId=' +
            task.id +
            ', recipientId=' +
            task.assigneeId,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}
