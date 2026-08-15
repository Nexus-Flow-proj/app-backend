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
import { PresenceTrackerService } from '../services/presence-tracker.service';

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
    private readonly presenceTrackerService: PresenceTrackerService,
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
      authenticatedClient.data.activeProjectId = undefined;

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
    const authenticatedClient = client as AuthenticatedSocket;
    const userId = authenticatedClient.data.user?.id;
    const activeProjectId = authenticatedClient.data.activeProjectId;

    if (userId && activeProjectId) {
      const { userId: trackedUserId, wasLastForProject } =
        this.presenceTrackerService.removeSocket(client.id, activeProjectId);

      if (trackedUserId && wasLastForProject) {
        this.realtimeService.emitToProject(
          activeProjectId,
          SOCKET_EVENTS.PRESENCE.USER_OFFLINE,
          { userId: trackedUserId },
        );
      }
    } else {
      this.presenceTrackerService.clearSocket(client.id);
    }

    authenticatedClient.data.activeProjectId = undefined;
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

      const activeProjectId = client.data.activeProjectId;
      if (activeProjectId === payload.projectId) {
        return { success: true };
      }

      if (activeProjectId && activeProjectId !== payload.projectId) {
        const previousProjectId = activeProjectId;
        const previousProjectRoom = SOCKET_ROOMS.project(previousProjectId);
        const { userId: trackedUserId, wasLastForProject } =
          this.presenceTrackerService.removeSocket(client.id, previousProjectId);

        if (trackedUserId && wasLastForProject) {
          this.realtimeService.emitToProject(
            previousProjectId,
            SOCKET_EVENTS.PRESENCE.USER_OFFLINE,
            { userId: trackedUserId },
          );
        }

        await client.leave(previousProjectRoom);
        client.data.activeProjectId = undefined;
      }

      const projectRoom = SOCKET_ROOMS.project(payload.projectId);
      await client.join(projectRoom);

      const { isFirstForProject } = this.presenceTrackerService.addSocket(
        client.id,
        user.id,
        payload.projectId,
      );
      client.data.activeProjectId = payload.projectId;

      if (isFirstForProject) {
        this.realtimeService.emitToProject(
          payload.projectId,
          SOCKET_EVENTS.PRESENCE.USER_ONLINE,
          { userId: user.id },
        );
      }

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

    if (client.data.activeProjectId !== payload.projectId) {
      return { success: true };
    }

    const { userId, wasLastForProject } = this.presenceTrackerService.removeSocket(
      client.id,
      payload.projectId,
    );

    const projectRoom = SOCKET_ROOMS.project(payload.projectId);
    await client.leave(projectRoom);

    client.data.activeProjectId = undefined;

    if (userId && wasLastForProject) {
      this.realtimeService.emitToProject(
        payload.projectId,
        SOCKET_EVENTS.PRESENCE.USER_OFFLINE,
        { userId },
      );
    }

    this.logger.log(
      `User left project room: socketId=${client.id}, userId=${user.id}, room=${projectRoom}`,
    );

    return { success: true };
  }
}
