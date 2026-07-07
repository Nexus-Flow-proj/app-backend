import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '@modules/auth/auth.module';
import { User } from '@modules/users/entities/user.entity';
import { SocketAuthService } from './services/socket-auth.service';
import { RealtimeGateway } from './gateways/realtime.gateway';
import { RealtimeService } from './services/realtime.service';
import { ProjectsModule } from '@modules/projects/projects.module';

@Module({
  imports: [AuthModule, ProjectsModule, TypeOrmModule.forFeature([User])],
  providers: [SocketAuthService, RealtimeGateway, RealtimeService],
})
export class RealtimeModule {}
