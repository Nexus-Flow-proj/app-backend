import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AIController } from './ai.controller';
import { KnowledgeController } from './knowledge.controller';
import { AIService } from './services/ai.service';
import { GeminiService } from './services/gemini.service';
import { EmbeddingService } from './services/embedding.service';
import { KnowledgeService } from './services/knowledge.service';
import { AIGenerationJob } from './entities/ai-generation-job.entity';
import { AIChatMessage } from './entities/ai-chat-message.entity';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity';
import { User } from '../users/entities/user.entity';
import { OnboardingDraft } from '../projects/entities/onboarding-draft.entity';
import { Workshop } from '../canvas/entities/workshop.entity';
import { WorkshopObject } from '../canvas/entities/workshop-object.entity';
import { WorkshopConnection } from '../canvas/entities/workshop-connection.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { CanvasModule } from '../canvas/canvas.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { Task } from '@modules/tasks/entities/task.entity';
import { Project } from '@modules/projects/entities/project.entity';
import { ProjectMember } from '@modules/projects/entities/project-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AIGenerationJob,
      AIChatMessage,
      KnowledgeChunk,
      User,
      OnboardingDraft,
      Workshop,
      WorkshopObject,
      WorkshopConnection,
      Task,
      Project,
      ProjectMember,
    ]),
    ConfigModule,
    RealtimeModule,
    CanvasModule,
    SubscriptionsModule,
  ],
  controllers: [AIController, KnowledgeController],
  providers: [AIService, GeminiService, EmbeddingService, KnowledgeService],
  exports: [AIService, KnowledgeService, EmbeddingService],
})
export class AIModule {}
