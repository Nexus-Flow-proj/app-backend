import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectMember } from '@modules/projects/entities/project-member.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatMessageAttachment } from './entities/chat-message-attachment.entity';
import { ChatMessageReaction } from './entities/chat-message-reaction.entity';
import { ChatReadState } from './entities/chat-read-state.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatMessage,
      ChatMessageAttachment,
      ChatMessageReaction,
      ChatReadState,
      ProjectMember,
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
