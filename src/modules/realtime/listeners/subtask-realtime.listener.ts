import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { DOMAIN_EVENTS } from '../constants/domain-events';
import { SOCKET_EVENTS } from '../constants/socket-events';
import { RealtimeService } from '../services/realtime.service';
import { SubtaskCreatedEvent } from '../domain-events/subtask-created.event';
import { SubtaskUpdatedEvent } from '../domain-events/subtask-updated.event';
import { SubtaskDeletedEvent } from '../domain-events/subtask-deleted.event';

@Injectable()
export class SubtaskRealtimeListener {
  constructor(private readonly realtimeService: RealtimeService) {}

  @OnEvent(DOMAIN_EVENTS.SUBTASK.CREATED)
  handleSubtaskCreated(event: SubtaskCreatedEvent) {
    this.realtimeService.emitToProject(
      event.payload.projectId,
      SOCKET_EVENTS.SUBTASK.CREATED,
      event.payload,
    );
  }

  @OnEvent(DOMAIN_EVENTS.SUBTASK.UPDATED)
  handleSubtaskUpdated(event: SubtaskUpdatedEvent) {
    this.realtimeService.emitToProject(
      event.payload.projectId,
      SOCKET_EVENTS.SUBTASK.UPDATED,
      event.payload,
    );
  }

  @OnEvent(DOMAIN_EVENTS.SUBTASK.DELETED)
  handleSubtaskDeleted(event: SubtaskDeletedEvent) {
    this.realtimeService.emitToProject(
      event.payload.projectId,
      SOCKET_EVENTS.SUBTASK.DELETED,
      event.payload,
    );
  }
}
