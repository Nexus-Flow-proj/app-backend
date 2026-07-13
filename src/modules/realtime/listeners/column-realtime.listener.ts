import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { DOMAIN_EVENTS } from '../constants/domain-events';
import { SOCKET_EVENTS } from '../constants/socket-events';
import { RealtimeService } from '../services/realtime.service';
import { ColumnCreatedEvent } from '../domain-events/column-created.event';
import { ColumnUpdatedEvent } from '../domain-events/column-updated.event';
import { ColumnDeletedEvent } from '../domain-events/column-deleted.event';
import { ColumnReorderedEvent } from '../domain-events/column-reordered.event';

@Injectable()
export class ColumnRealtimeListener {
  constructor(private readonly realtimeService: RealtimeService) {}

  @OnEvent(DOMAIN_EVENTS.COLUMN.CREATED)
  handleColumnCreated(event: ColumnCreatedEvent) {
    this.realtimeService.emitToProject(
      event.payload.projectId,
      SOCKET_EVENTS.COLUMN.CREATED,
      event.payload,
    );
  }

  @OnEvent(DOMAIN_EVENTS.COLUMN.UPDATED)
  handleColumnUpdated(event: ColumnUpdatedEvent) {
    this.realtimeService.emitToProject(
      event.payload.projectId,
      SOCKET_EVENTS.COLUMN.UPDATED,
      event.payload,
    );
  }

  @OnEvent(DOMAIN_EVENTS.COLUMN.DELETED)
  handleColumnDeleted(event: ColumnDeletedEvent) {
    this.realtimeService.emitToProject(
      event.payload.projectId,
      SOCKET_EVENTS.COLUMN.DELETED,
      event.payload,
    );
  }

  @OnEvent(DOMAIN_EVENTS.COLUMN.REORDERED)
  handleColumnReordered(event: ColumnReorderedEvent) {
    this.realtimeService.emitToProject(
      event.payload.projectId,
      SOCKET_EVENTS.COLUMN.REORDERED,
      event.payload,
    );
  }
}
