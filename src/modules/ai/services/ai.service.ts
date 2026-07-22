import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIGenerationJob } from '../entities/ai-generation-job.entity';
import { AIGenerationStatus } from '../enums/ai-generation-status.enum';
import { GeminiService } from './gemini.service';
import { RealtimeService } from '../../realtime/services/realtime.service';
import {
  GenerateOnboardingPlanDto,
  BoardAIChatDto,
} from '../dtos/ai-generation.dto';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    @InjectRepository(AIGenerationJob)
    private readonly jobRepo: Repository<AIGenerationJob>,
    private readonly geminiService: GeminiService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async generateOnboardingPlan(
    userId: string,
    dto: GenerateOnboardingPlanDto,
  ): Promise<{ generationId: string; status: AIGenerationStatus }> {
    // 1. Create a pending job record
    const job = this.jobRepo.create({
      requestedBy: userId,
      prompt: dto.prompt,
      status: AIGenerationStatus.PENDING,
      provider: 'gemini',
      model: this.geminiService.getModelName(),
      inputSnapshot: {
        projectInfo: dto.projectInfo,
      },
    });

    const savedJob = await this.jobRepo.save(job);
    const generationId = savedJob.id;

    // Emit created event
    this.realtimeService.emitToUser(userId, 'ai.generation.created', {
      generationId,
      status: AIGenerationStatus.PENDING,
    });

    // 2. Run generation asynchronously
    this.runOnboardingPlanGeneration(userId, generationId, dto).catch((err) => {
      this.logger.error(
        `Onboarding plan generation failed: ${generationId}`,
        err,
      );
    });

    return { generationId, status: AIGenerationStatus.PENDING };
  }

  private async runOnboardingPlanGeneration(
    userId: string,
    generationId: string,
    dto: GenerateOnboardingPlanDto,
  ): Promise<void> {
    // Update to PROCESSING
    await this.jobRepo.update(generationId, {
      status: AIGenerationStatus.PROCESSING,
    });
    this.realtimeService.emitToUser(userId, 'ai.generation.started', {
      generationId,
      status: AIGenerationStatus.PROCESSING,
    });

    try {
      const systemInstruction =
        'You are an expert product manager. Given a project goal and context, decompose the request into a set of features (sections) and tasks. Return ONLY valid JSON matching the schema. No markdown formatting wraps, no prose.';

      const prompt = `Decompose this product idea: "${dto.prompt}".
Project Info: Name: "${dto.projectInfo.name}", Description: "${dto.projectInfo.description || ''}".
Existing Workshop state context if any: ${JSON.stringify(dto.currentWorkshopState || {})}.
Constraints target stack: ${JSON.stringify(dto.projectInfo.constraints || {})}.`;

      const responseSchema = this.geminiService.getOnboardingSchema();

      // Call streaming API
      const result = await this.geminiService.generateContentStream(
        systemInstruction,
        prompt,
        responseSchema,
        (chunkText) => {
          this.realtimeService.emitToUser(userId, 'ai.generation.progress', {
            generationId,
            stage: 'generating',
            chunk: chunkText,
          });
        },
      );

      // Validate output structure and save completed job
      await this.jobRepo.update(generationId, {
        status: AIGenerationStatus.COMPLETED,
        outputSnapshot: result,
        completedAt: new Date(),
      });

      this.realtimeService.emitToUser(userId, 'ai.generation.completed', {
        generationId,
        status: AIGenerationStatus.COMPLETED,
        output: result,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown generation error';
      await this.jobRepo.update(generationId, {
        status: AIGenerationStatus.FAILED,
        errorMessage: message,
        completedAt: new Date(),
      });

      this.realtimeService.emitToUser(userId, 'ai.generation.failed', {
        generationId,
        status: AIGenerationStatus.FAILED,
        error: message,
      });
    }
  }

  async chatOnBoard(
    userId: string,
    projectId: string,
    dto: BoardAIChatDto,
  ): Promise<{ generationId: string; status: AIGenerationStatus }> {
    // 1. Create job linked to project
    const job = this.jobRepo.create({
      requestedBy: userId,
      projectId,
      prompt: dto.message,
      status: AIGenerationStatus.PENDING,
      provider: 'gemini',
      model: this.geminiService.getModelName(),
      inputSnapshot: {
        history: dto.history,
        boardContext: dto.boardContext,
      },
    });

    const savedJob = await this.jobRepo.save(job);
    const generationId = savedJob.id;

    // 2. Run board generation asynchronously
    this.runBoardAIChat(projectId, generationId, dto).catch((err) => {
      this.logger.error(
        `Board AI chat suggestions failed: ${generationId}`,
        err,
      );
    });

    return { generationId, status: AIGenerationStatus.PENDING };
  }

  private async runBoardAIChat(
    projectId: string,
    generationId: string,
    dto: BoardAIChatDto,
  ): Promise<void> {
    this.realtimeService.emitToProject(projectId, 'ai.chat.started', {
      generationId,
    });

    try {
      const systemInstruction =
        'You are an AI assistant living on a Kanban project board. Your role is to suggest board additions or task mutations. Output only valid JSON suggestions mapping to CREATE_COLUMN, CREATE_TASK, UPDATE_TASK, or DELETE_TASK. No prose.';

      const prompt = `User request message: "${dto.message}".
Conversation History: ${JSON.stringify(dto.history || [])}.
Current board context snapshot (columns, task count, task samples): ${JSON.stringify(
        dto.boardContext || {},
      )}.
Provide suggestions matching the JSON schema.`;

      const responseSchema = this.geminiService.getBoardChatSchema();

      // Call streaming API
      const result = await this.geminiService.generateContentStream(
        systemInstruction,
        prompt,
        responseSchema,
        (chunkText) => {
          this.realtimeService.emitToProject(projectId, 'ai.chat.progress', {
            generationId,
            chunk: chunkText,
          });
        },
      );

      // Save job as completed
      await this.jobRepo.update(generationId, {
        status: AIGenerationStatus.COMPLETED,
        outputSnapshot: result,
        completedAt: new Date(),
      });

      this.realtimeService.emitToProject(projectId, 'ai.chat.completed', {
        generationId,
        suggestions: result.suggestions || [],
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown chat error';
      await this.jobRepo.update(generationId, {
        status: AIGenerationStatus.FAILED,
        errorMessage: message,
        completedAt: new Date(),
      });

      this.realtimeService.emitToProject(projectId, 'ai.chat.failed', {
        generationId,
        error: message,
      });
    }
  }

  async getGenerationJob(
    generationId: string,
    userId: string,
  ): Promise<AIGenerationJob> {
    const job = await this.jobRepo.findOne({ where: { id: generationId } });
    if (!job) {
      throw new NotFoundException('AI Generation job not found');
    }
    if (job.requestedBy !== userId) {
      throw new NotFoundException('AI Generation job access denied');
    }
    return job;
  }
}
