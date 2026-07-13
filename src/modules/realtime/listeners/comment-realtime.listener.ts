import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { DOMAIN_EVENTS } from '../constants/domain-events';
import { SOCKET_EVENTS } from '../constants/socket-events';
import { RealtimeService } from '../services/realtime.service';
import { CommentCreatedEvent } from '../domain-events/comment-created.event';
import { CommentUpdatedEvent } from '../domain-events/comment-updated.event';
import { CommentDeletedEvent } from '../domain-events/comment-deleted.event';

@Injectable()
export class CommentRealtimeListener {
  constructor(private readonly realtimeService: RealtimeService) {}

  @OnEvent(DOMAIN_EVENTS.COMMENT.CREATED)
  handleCommentCreated(event: CommentCreatedEvent) {
    this.realtimeService.emitToProject(
      event.payload.projectId,
      SOCKET_EVENTS.COMMENT.CREATED,
      event.payload,
    );
  }

  @OnEvent(DOMAIN_EVENTS.COMMENT.UPDATED)
  handleCommentUpdated(event: CommentUpdatedEvent) {
    this.realtimeService.emitToProject(
      event.payload.projectId,
      SOCKET_EVENTS.COMMENT.UPDATED,
      event.payload,
    );
  }

  @OnEvent(DOMAIN_EVENTS.COMMENT.DELETED)
  handleCommentDeleted(event: CommentDeletedEvent) {
    this.realtimeService.emitToProject(
      event.payload.projectId,
      SOCKET_EVENTS.COMMENT.DELETED,
      event.payload,
    );
  }
}
