import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

import { SOCKET_ROOMS } from '../constants/socket-rooms';

@Injectable()
export class RealtimeService {
  private server!: Server;

  setServer(server: Server) {
    this.server = server;
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(SOCKET_ROOMS.user(userId)).emit(event, payload);
  }

  emitToProject(projectId: string, event: string, payload: unknown) {
    this.server.to(SOCKET_ROOMS.project(projectId)).emit(event, payload);
  }
}