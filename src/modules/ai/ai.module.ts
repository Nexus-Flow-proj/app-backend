import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AIController } from './ai.controller';
import { AIService } from './services/ai.service';
import { GeminiService } from './services/gemini.service';
import { AIGenerationJob } from './entities/ai-generation-job.entity';
import { AIChatMessage } from './entities/ai-chat-message.entity';
import { User } from '../users/entities/user.entity';
import { OnboardingDraft } from '../projects/entities/onboarding-draft.entity';
import { Workshop } from '../canvas/entities/workshop.entity';
import { WorkshopObject } from '../canvas/entities/workshop-object.entity';
import { WorkshopConnection } from '../canvas/entities/workshop-connection.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { CanvasModule } from '../canvas/canvas.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AIGenerationJob,
      AIChatMessage,
      User,
      OnboardingDraft,
      Workshop,
      WorkshopObject,
      WorkshopConnection,
    ]),
    ConfigModule,
    RealtimeModule,
    CanvasModule,
  ],
  controllers: [AIController],
  providers: [AIService, GeminiService],
  exports: [AIService],
})
export class AIModule {}
