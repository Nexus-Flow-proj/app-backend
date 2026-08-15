import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerOptions } from 'socket.io';

export class SocketIoAdapter extends IoAdapter {
  private readonly frontendUrl: string;
  private readonly allowedOrigins: string[];

  constructor(app: INestApplication) {
    super(app);
    const configService = app.get(ConfigService);
    this.frontendUrl = configService.get<string>('env.frontendUrl')!;
    this.allowedOrigins = [this.frontendUrl, 'http://localhost:3000'];
  }

  createIOServer(port: number, options?: Partial<ServerOptions>) {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: this.allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST'],
      },
    });

    return server;
  }
}
