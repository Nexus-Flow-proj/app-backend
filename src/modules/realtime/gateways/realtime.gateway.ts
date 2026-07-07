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
  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly socketAuthService: SocketAuthService,
    private readonly realtimeService: RealtimeService,
    private readonly projectsService: ProjectsService,
  ) {}
  afterInit() {
    this.realtimeService.setServer(this.server);
    console.log('Realtime gateway initialized');
  }

  async handleConnection(client: Socket) {
    console.log('Socket connection attempt:', client.id);
    try {
      const user = await this.socketAuthService.authenticate(client);

      (client as AuthenticatedSocket).data.user = user;

      await client.join(SOCKET_ROOMS.user(user.id));

      console.log('Socket authenticated and joined user room:', {
        socketId: client.id,
        userId: user.id,
        room: SOCKET_ROOMS.user(user.id),
      });
    } catch (error) {
      console.error('Socket authentication failed:', error);
      client.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log('Socket disconnected:', client.id);
  }

  @SubscribeMessage(SOCKET_EVENTS.PROJECT.JOIN)
  async handleProjectJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ProjectRoomDto,
  ) {
    try {
      await this.projectsService.getProjectMember(
        payload.projectId,
        client.data.user.id,
      );

      await client.join(SOCKET_ROOMS.project(payload.projectId));
      console.log(
        `User ${client.data.user.id} joined ${SOCKET_ROOMS.project(payload.projectId)}`,
      );

      return { success: true };
    } catch (error) {
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
    await client.leave(SOCKET_ROOMS.project(payload.projectId));

    console.log(
      `User ${client.data.user.id} left ${SOCKET_ROOMS.project(payload.projectId)}`,
    );
    return { success: true };
  }
}
