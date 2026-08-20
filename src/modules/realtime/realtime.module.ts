import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '@modules/auth/auth.module';
import { User } from '@modules/users/entities/user.entity';
import { SocketAuthService } from './services/socket-auth.service';
import { RealtimeGateway } from './gateways/realtime.gateway';
import { RealtimeService } from './services/realtime.service';
import { ProjectsModule } from '@modules/projects/projects.module';
import { TaskRealtimeListener } from './listeners/task-realtime.listener';
import { ColumnRealtimeListener } from './listeners/column-realtime.listener';
import { CommentRealtimeListener } from './listeners/comment-realtime.listener';
import { SubtaskRealtimeListener } from './listeners/subtask-realtime.listener';
import { PresenceTrackerService } from './services/presence-tracker.service';
import { NotificationRealtimeListener } from './listeners/notification-realtime.listener';
import { ChatRealtimeListener } from './listeners/chat-realtime.listener';

@Module({
  imports: [AuthModule, ProjectsModule, TypeOrmModule.forFeature([User])],
  providers: [
    SocketAuthService,
    RealtimeGateway,
    RealtimeService,
    TaskRealtimeListener,
    ColumnRealtimeListener,
    CommentRealtimeListener,
    SubtaskRealtimeListener,
    PresenceTrackerService,
    NotificationRealtimeListener,
    ChatRealtimeListener,
  ],
  exports: [RealtimeService],
})
export class RealtimeModule {}
