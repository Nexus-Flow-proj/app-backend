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
import { ChatTypingDto } from '../dtos/chat-typing.dto';
import { SOCKET_EVENTS } from '../constants/socket-events';
import { PresenceTrackerService } from '../services/presence-tracker.service';

const TYPING_THROTTLE_MS = 800;

@WebSocketGateway()
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly lastTypingEmit = new Map<string, number>();

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
      const {
        userId: trackedUserId,
        projectMemberId,
        wasLastForProject,
      } = this.presenceTrackerService.removeSocket(client.id, activeProjectId);

      if (trackedUserId && projectMemberId && wasLastForProject) {
        this.realtimeService.emitToProject(
          activeProjectId,
          SOCKET_EVENTS.PRESENCE.USER_OFFLINE,
          { userId: trackedUserId, projectMemberId },
        );
      }
    } else {
      this.presenceTrackerService.clearSocket(client.id);
    }

    authenticatedClient.data.activeProjectId = undefined;
    this.lastTypingEmit.delete(client.id);
    this.logger.log(`Socket disconnected: socketId=${client.id}`);
  }

  @SubscribeMessage(SOCKET_EVENTS.CHAT.TYPING)
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ChatTypingDto,
  ) {
    const user = client.data.user;

    if (!user) {
      return {
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Socket is not authenticated',
      };
    }

    const throttleKey = `${client.id}:${payload.projectId}`;
    const now = Date.now();
    const lastEmit = this.lastTypingEmit.get(throttleKey) ?? 0;
    if (now - lastEmit < TYPING_THROTTLE_MS) {
      return { success: true };
    }

    try {
      const member = await this.projectsService.getProjectMember(
        payload.projectId,
        user.id,
      );

      const memberUser = member.user;
      const userName = [memberUser.firstName, memberUser.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();

      client
        .to(SOCKET_ROOMS.project(payload.projectId))
        .emit(SOCKET_EVENTS.CHAT.USER_TYPING, {
          projectId: payload.projectId,
          userId: user.id,
          userName: userName || memberUser.email,
          avatarUrl: memberUser.avatarUrl ?? null,
          isTyping: payload.isTyping,
        });

      this.lastTypingEmit.set(throttleKey, now);

      return { success: true };
    } catch (error) {
      this.logger.warn(
        `Chat typing broadcast failed: socketId=${client.id}, projectId=${payload.projectId}, reason=${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );

      return {
        success: false,
        code: 'FORBIDDEN',
        message:
          error instanceof Error ? error.message : 'Failed to broadcast typing',
      };
    }
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

      const member = await this.projectsService.getProjectMember(
        payload.projectId,
        user.id,
      );

      const activeProjectId = client.data.activeProjectId;
      if (activeProjectId === payload.projectId) {
        return { success: true };
      }

      if (activeProjectId && activeProjectId !== payload.projectId) {
        const previousProjectId = activeProjectId;
        const previousProjectRoom = SOCKET_ROOMS.project(previousProjectId);
        const {
          userId: trackedUserId,
          projectMemberId,
          wasLastForProject,
        } = this.presenceTrackerService.removeSocket(
          client.id,
          previousProjectId,
        );

        if (trackedUserId && projectMemberId && wasLastForProject) {
          this.realtimeService.emitToProject(
            previousProjectId,
            SOCKET_EVENTS.PRESENCE.USER_OFFLINE,
            { userId: trackedUserId, projectMemberId },
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
        member.id,
      );
      client.data.activeProjectId = payload.projectId;

      if (isFirstForProject) {
        this.realtimeService.emitToProject(
          payload.projectId,
          SOCKET_EVENTS.PRESENCE.USER_ONLINE,
          { userId: user.id, projectMemberId: member.id },
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

    const { userId, projectMemberId, wasLastForProject } =
      this.presenceTrackerService.removeSocket(client.id, payload.projectId);

    const projectRoom = SOCKET_ROOMS.project(payload.projectId);
    await client.leave(projectRoom);

    client.data.activeProjectId = undefined;

    if (userId && projectMemberId && wasLastForProject) {
      this.realtimeService.emitToProject(
        payload.projectId,
        SOCKET_EVENTS.PRESENCE.USER_OFFLINE,
        { userId, projectMemberId },
      );
    }

    this.logger.log(
      `User left project room: socketId=${client.id}, userId=${user.id}, room=${projectRoom}`,
    );

    return { success: true };
  }
}
