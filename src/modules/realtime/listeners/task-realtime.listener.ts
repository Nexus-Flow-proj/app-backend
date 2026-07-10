import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { DOMAIN_EVENTS } from '../constants/domain-events';
import { SOCKET_EVENTS } from '../constants/socket-events';
import { RealtimeService } from '../services/realtime.service';
import { TaskCreatedEvent } from '../domain-events/task-created.event';
import { TaskUpdatedEvent } from '../domain-events/task-updated.event';
import { TaskDeletedEvent } from '../domain-events/task-deleted.event';

@Injectable()
export class TaskRealtimeListener {
  constructor(private readonly realtimeService: RealtimeService) {}

  @OnEvent(DOMAIN_EVENTS.TASK.CREATED)
  handleTaskCreated(event: TaskCreatedEvent) {
    this.realtimeService.emitToProject(
      event.payload.projectId,
      SOCKET_EVENTS.TASK.CREATED,
      event.payload,
    );
  }

  @OnEvent(DOMAIN_EVENTS.TASK.UPDATED)
  handleTaskUpdated(event: TaskUpdatedEvent) {
    this.realtimeService.emitToProject(
      event.payload.projectId,
      SOCKET_EVENTS.TASK.UPDATED,
      event.payload,
    );
  }

  @OnEvent(DOMAIN_EVENTS.TASK.DELETED)
  handleTaskDeleted(event: TaskDeletedEvent) {
    this.realtimeService.emitToProject(
      event.payload.projectId,
      SOCKET_EVENTS.TASK.DELETED,
      event.payload,
    );
  }
}