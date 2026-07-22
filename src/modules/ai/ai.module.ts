import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AIController } from './ai.controller';
import { AIService } from './services/ai.service';
import { GeminiService } from './services/gemini.service';
import { AIGenerationJob } from './entities/ai-generation-job.entity';
import { User } from '../users/entities/user.entity';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AIGenerationJob, User]),
    ConfigModule,
    RealtimeModule,
  ],
  controllers: [AIController],
  providers: [AIService, GeminiService],
  exports: [AIService],
})
export class AIModule {}
