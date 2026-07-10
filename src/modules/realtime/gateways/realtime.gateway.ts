import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  OnGatewayInit,
  WebSocketServer,
  MessageBody,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';

import { SocketAuthService } from '../services/socket-auth.service';
import { AuthenticatedSocket } from '../interfaces/authenticated-socket.interface';
import { SOCKET_ROOMS } from '../constants/socket-rooms';
import { RealtimeService } from '../services/realtime.service';
import { ProjectsService } from '@modules/projects/projects.service';
import { ProjectRoomDto } from '../dtos/project-room.dto';
import { SOCKET_EVENTS } from '../constants/socket-events';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly socketAuthService: SocketAuthService,
    private readonly realtimeService: RealtimeService,
    private readonly projectsService: ProjectsService,
  ) {}

  afterInit() {
    this.realtimeService.setServer(this.server);
    this.logger.log('Realtime gateway initialized');
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Socket connection attempt: ${client.id}`);

    try {
      const user = await this.socketAuthService.authenticate(client);

      const authenticatedClient = client as AuthenticatedSocket;
      authenticatedClient.data.user = user;

      const userRoom = SOCKET_ROOMS.user(user.id);
      await authenticatedClient.join(userRoom);

      this.logger.log(
        `Socket authenticated: socketId=${client.id}, userId=${user.id}, room=${userRoom}`,
      );
    } catch (error) {
      this.logger.warn(
        `Socket authentication failed: socketId=${client.id}, reason=${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket disconnected: socketId=${client.id}`);
  }

  @SubscribeMessage(SOCKET_EVENTS.PROJECT.JOIN)
  async handleProjectJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ProjectRoomDto,
  ) {
    try {
      const user = client.data.user;

      if (!user) {
        return {
          success: false,
          code: 'UNAUTHORIZED',
          message: 'Socket is not authenticated',
        };
      }

      await this.projectsService.getProjectMember(payload.projectId, user.id);

      const projectRoom = SOCKET_ROOMS.project(payload.projectId);
      await client.join(projectRoom);

      this.logger.log(
        `User joined project room: socketId=${client.id}, userId=${user.id}, room=${projectRoom}`,
      );

      return { success: true };
    } catch (error) {
      this.logger.warn(
        `Project join failed: socketId=${client.id}, projectId=${payload.projectId}, reason=${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      return {
        success: false,
        code: 'FORBIDDEN',
        message:
          error instanceof Error ? error.message : 'Failed to join project',
      };
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.PROJECT.LEAVE)
  async handleProjectLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ProjectRoomDto,
  ) {
    const user = client.data.user;

    if (!user) {
      return {
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Socket is not authenticated',
      };
    }

    const projectRoom = SOCKET_ROOMS.project(payload.projectId);
    await client.leave(projectRoom);

    this.logger.log(
      `User left project room: socketId=${client.id}, userId=${user.id}, room=${projectRoom}`,
    );

    return { success: true };
  }
}