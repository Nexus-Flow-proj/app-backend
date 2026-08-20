import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { DOMAIN_EVENTS } from '../constants/domain-events';
import { SOCKET_EVENTS } from '../constants/socket-events';
import { RealtimeService } from '../services/realtime.service';

export interface ChatRealtimeEvent {
  projectId: string;
  [key: string]: unknown;
}

@Injectable()
export class ChatRealtimeListener {
  constructor(private readonly realtimeService: RealtimeService) {}

  @OnEvent(DOMAIN_EVENTS.CHAT.MESSAGE_CREATED)
  handleMessageCreated(event: ChatRealtimeEvent) {
    this.emitToProject(event, SOCKET_EVENTS.CHAT.MESSAGE_CREATED);
  }

  @OnEvent(DOMAIN_EVENTS.CHAT.MESSAGE_UPDATED)
  handleMessageUpdated(event: ChatRealtimeEvent) {
    this.emitToProject(event, SOCKET_EVENTS.CHAT.MESSAGE_UPDATED);
  }

  @OnEvent(DOMAIN_EVENTS.CHAT.MESSAGE_DELETED)
  handleMessageDeleted(event: ChatRealtimeEvent) {
    this.emitToProject(event, SOCKET_EVENTS.CHAT.MESSAGE_DELETED);
  }

  @OnEvent(DOMAIN_EVENTS.CHAT.MESSAGE_PINNED)
  handleMessagePinned(event: ChatRealtimeEvent) {
    this.emitToProject(event, SOCKET_EVENTS.CHAT.MESSAGE_PINNED);
  }

  @OnEvent(DOMAIN_EVENTS.CHAT.MESSAGE_UNPINNED)
  handleMessageUnpinned(event: ChatRealtimeEvent) {
    this.emitToProject(event, SOCKET_EVENTS.CHAT.MESSAGE_UNPINNED);
  }

  @OnEvent(DOMAIN_EVENTS.CHAT.REACTION_ADDED)
  handleReactionAdded(event: ChatRealtimeEvent) {
    this.emitToProject(event, SOCKET_EVENTS.CHAT.REACTION_ADDED);
  }

  @OnEvent(DOMAIN_EVENTS.CHAT.REACTION_REMOVED)
  handleReactionRemoved(event: ChatRealtimeEvent) {
    this.emitToProject(event, SOCKET_EVENTS.CHAT.REACTION_REMOVED);
  }

  @OnEvent(DOMAIN_EVENTS.CHAT.READ)
  handleRead(event: ChatRealtimeEvent) {
    this.emitToProject(event, SOCKET_EVENTS.CHAT.READ);
  }

  private emitToProject(event: ChatRealtimeEvent, socketEvent: string) {
    this.realtimeService.emitToProject(event.projectId, socketEvent, event);
  }
}
