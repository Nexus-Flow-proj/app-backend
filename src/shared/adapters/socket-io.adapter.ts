import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerOptions } from 'socket.io';

export class SocketIoAdapter extends IoAdapter {
  private readonly frontendUrl: string;

  constructor(app: INestApplication) {
    super(app);
    const configService = app.get(ConfigService);
    this.frontendUrl = configService.get<string>('env.frontendUrl')!;
  }

  createIOServer(port: number, options?: Partial<ServerOptions>) {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: this.frontendUrl,
        credentials: true,
        methods: ['GET', 'POST'],
      },
    });
    return server;
  }
}
