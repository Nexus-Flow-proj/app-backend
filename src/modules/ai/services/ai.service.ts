import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIGenerationJob } from '../entities/ai-generation-job.entity';
import { AIChatMessage } from '../entities/ai-chat-message.entity';
import { AIGenerationStatus } from '../enums/ai-generation-status.enum';
import { GeminiService } from './gemini.service';
import { RealtimeService } from '../../realtime/services/realtime.service';
import {
  GenerateOnboardingPlanDto,
  BoardAIChatDto,
} from '../dtos/ai-generation.dto';
import { OnboardingDraft } from '@modules/projects/entities/onboarding-draft.entity';
import { Workshop } from '@modules/canvas/entities/workshop.entity';
import { WorkshopObject } from '@modules/canvas/entities/workshop-object.entity';
import { WorkshopConnection } from '@modules/canvas/entities/workshop-connection.entity';
import { WorkshopStateSerializer } from './workshop-state-serializer';
import { WorkshopCanvasService } from '@modules/canvas/services/workshop-canvas.service';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private static readonly MAX_HISTORY_MESSAGES = 15;

  constructor(
    @InjectRepository(AIGenerationJob)
    private readonly jobRepo: Repository<AIGenerationJob>,
    @InjectRepository(AIChatMessage)
    private readonly messageRepo: Repository<AIChatMessage>,
    @InjectRepository(OnboardingDraft)
    private readonly draftRepo: Repository<OnboardingDraft>,
    @InjectRepository(Workshop)
    private readonly workshopRepo: Repository<Workshop>,
    @InjectRepository(WorkshopObject)
    private readonly workshopObjectRepo: Repository<WorkshopObject>,
    @InjectRepository(WorkshopConnection)
    private readonly workshopConnectionRepo: Repository<WorkshopConnection>,
    private readonly geminiService: GeminiService,
    private readonly realtimeService: RealtimeService,
    private readonly workshopCanvasService: WorkshopCanvasService,
  ) {}

  async generateOnboardingPlan(
    userId: string,
    dto: GenerateOnboardingPlanDto,
  ): Promise<{ generationId: string; status: AIGenerationStatus }> {
    const draft = await this.draftRepo.findOne({
      where: { id: dto.draftId, userId },
    });
    if (!draft) {
      throw new NotFoundException('Onboarding draft not found');
    }

    // 1. Create a pending job record
    const job = this.jobRepo.create({
      requestedBy: userId,
      prompt: dto.prompt,
      status: AIGenerationStatus.PENDING,
      provider: 'gemini',
      model: this.geminiService.getModelName(),
      inputSnapshot: {
        draftId: dto.draftId,
        projectInfo: draft.projectInfo,
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
    this.runOnboardingPlanGeneration(userId, generationId, dto).catch(
      (err) => {
        this.logger.error(
          `Onboarding plan generation failed: ${generationId}`,
          err,
        );
      },
    );

    return { generationId, status: AIGenerationStatus.PENDING };
  }

  private async runOnboardingPlanGeneration(
    userId: string,
    generationId: string,
    dto: GenerateOnboardingPlanDto,
  ): Promise<void> {
    await this.jobRepo.update(generationId, {
      status: AIGenerationStatus.PROCESSING,
    });
    this.realtimeService.emitToUser(userId, 'ai.generation.started', {
      generationId,
      status: AIGenerationStatus.PROCESSING,
    });

    try {
      // Load the draft to get canonical project info from DB — single source of truth
      const draft = await this.draftRepo.findOne({
        where: { id: dto.draftId },
      });
      if (!draft) {
        throw new Error('Onboarding draft not found during generation');
      }
      const projectInfo = draft.projectInfo;

      // Load workshop state directly from DB
      const workshop = await this.workshopRepo.findOne({
        where: { draftId: dto.draftId },
      });

      let workshopContext: Record<string, unknown> = {};
      if (workshop) {
        const objects = await this.workshopObjectRepo.find({
          where: { workshopId: workshop.id },
        });
        const connections = await this.workshopConnectionRepo.find({
          where: { workshopId: workshop.id },
        });
        workshopContext = WorkshopStateSerializer.serialize(
          objects,
          connections,
        );
      }

      // Load persistent chat history for context window (capped to MAX_HISTORY_MESSAGES)
      const chatHistory = await this.messageRepo.find({
        where: { draftId: dto.draftId },
        order: { createdAt: 'DESC' },
        take: AIService.MAX_HISTORY_MESSAGES,
      });

      const formattedHistory = chatHistory
        .reverse()
        .map((m) => ({ role: m.role, content: m.content }));

      const systemInstruction =
        'You are an expert product manager. Given a project goal, context, and current workshop state, decompose the request into a set of features (sections) and tasks. Return ONLY valid JSON matching the schema. No markdown formatting wraps, no prose.';

      const prompt = `Decompose this product idea: "${dto.prompt}".
Project Info: Name: "${projectInfo.name}", Description: "${projectInfo.description || ''}".
Persisted DB Workshop state context: ${JSON.stringify(workshopContext)}.
Constraints target stack: ${JSON.stringify(projectInfo.constraints || {})}.
Conversation History: ${JSON.stringify(formattedHistory)}.`;

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

      const normalizedResult = this.normalizeOnboardingPlan(result, projectInfo);

      // Save user prompt & assistant response in AIChatMessage
      await this.messageRepo.save([
        this.messageRepo.create({
          draftId: dto.draftId,
          role: 'user',
          content: dto.prompt,
          generationJobId: generationId,
        }),
        this.messageRepo.create({
          draftId: dto.draftId,
          role: 'assistant',
          content: JSON.stringify(normalizedResult),
          generationJobId: generationId,
        }),
      ]);

      // Persist AI plan directly into Workshop DB entities with auto-layout.
      // The frontend reads GET /workshop/:draftId — no coordinate posting needed.
      const workshopSnapshot = await this.workshopCanvasService.applyAIPlanToWorkshop(
        dto.draftId,
        normalizedResult,
      );

      // Save completed job
      await this.jobRepo.update(generationId, {
        status: AIGenerationStatus.COMPLETED,
        outputSnapshot: normalizedResult,
        completedAt: new Date(),
      });

      this.realtimeService.emitToUser(userId, 'ai.generation.completed', {
        generationId,
        status: AIGenerationStatus.COMPLETED,
        output: normalizedResult,
        // Include the freshly-persisted workshop so the FE can render immediately
        // without a separate GET request.
        workshop: workshopSnapshot,
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
    const job = this.jobRepo.create({
      requestedBy: userId,
      projectId,
      prompt: dto.message,
      status: AIGenerationStatus.PENDING,
      provider: 'gemini',
      model: this.geminiService.getModelName(),
      inputSnapshot: {
        boardContext: dto.boardContext,
      },
    });

    const savedJob = await this.jobRepo.save(job);
    const generationId = savedJob.id;

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
      // Fetch persistent history (capped to MAX_HISTORY_MESSAGES)
      const chatHistory = await this.messageRepo.find({
        where: { projectId },
        order: { createdAt: 'DESC' },
        take: AIService.MAX_HISTORY_MESSAGES,
      });

      const formattedHistory = chatHistory
        .reverse()
        .map((m) => ({ role: m.role, content: m.content }));

      const systemInstruction =
        'You are an AI assistant living on a Kanban project board. Your role is to suggest board additions or task mutations. Output only valid JSON suggestions mapping to CREATE_COLUMN, CREATE_TASK, UPDATE_TASK, or DELETE_TASK. No prose.';

      const prompt = `User request message: "${dto.message}".
Conversation History: ${JSON.stringify(formattedHistory)}.
Current board context snapshot: ${JSON.stringify(dto.boardContext || {})}.
Provide suggestions matching the JSON schema.`;

      const responseSchema = this.geminiService.getBoardChatSchema();

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

      // Save persistent messages
      await this.messageRepo.save([
        this.messageRepo.create({
          projectId,
          role: 'user',
          content: dto.message,
          generationJobId: generationId,
        }),
        this.messageRepo.create({
          projectId,
          role: 'assistant',
          content: JSON.stringify(result.suggestions || []),
          generationJobId: generationId,
        }),
      ]);

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

  async getDraftMessages(
    draftId: string,
    userId: string,
  ): Promise<AIChatMessage[]> {
    const draft = await this.draftRepo.findOne({
      where: { id: draftId, userId },
    });
    if (!draft) {
      throw new NotFoundException('Onboarding draft not found');
    }

    return this.messageRepo.find({
      where: { draftId },
      order: { createdAt: 'ASC' },
    });
  }

  async getProjectMessages(projectId: string): Promise<AIChatMessage[]> {
    return this.messageRepo.find({
      where: { projectId },
      order: { createdAt: 'ASC' },
    });
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

  private normalizeOnboardingPlan(
    raw: Record<string, any>,
    projectInfo: OnboardingDraft['projectInfo'],
  ): Record<string, any> {
    if (!raw || typeof raw !== 'object') {
      raw = {};
    }

    const rawFeatures = Array.isArray(raw.features)
      ? raw.features
      : Array.isArray(raw.sections)
        ? raw.sections
        : [];

    const defaultColors = [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#8b5cf6',
      '#ec4899',
      '#06b6d4',
    ];

    const normalizedFeatures = rawFeatures.map((feat: any, fIdx: number) => {
      const featureName =
        feat.feature_name ||
        feat.section_name ||
        feat.title ||
        feat.name ||
        `Feature ${fIdx + 1}`;

      const featureDescription =
        feat.feature_description ||
        feat.description ||
        feat.section_description ||
        feat.rationale ||
        '';

      const color = feat.color || defaultColors[fIdx % defaultColors.length];
      const priority = feat.priority || 'MEDIUM';

      const rawTasks = Array.isArray(feat.tasks) ? feat.tasks : [];

      const normalizedTasks = rawTasks.map((t: any, tIdx: number) => {
        const taskName =
          t.task_name || t.title || t.name || `Task ${tIdx + 1}`;

        const taskDescription =
          t.task_description || t.description || t.details || '';

        return {
          task_name: taskName,
          task_description: taskDescription,
          priority: t.priority || 'MEDIUM',
          type: t.type || 'FEATURE',
          status: t.status || 'not_started',
          assigned_to: t.assigned_to ?? null,
          acceptanceCriteria: Array.isArray(t.acceptanceCriteria)
            ? t.acceptanceCriteria
            : [],
          estimatedComplexity: t.estimatedComplexity || 'M',
          dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
        };
      });

      return {
        feature_name: featureName,
        feature_description: featureDescription,
        color,
        priority,
        dependencies: Array.isArray(feat.dependencies) ? feat.dependencies : [],
        tasks: normalizedTasks,
      };
    });

    return {
      project_name:
        raw.project_name ||
        raw.projectName ||
        projectInfo.name ||
        'Untitled Project',
      project_description:
        raw.project_description ||
        raw.projectDescription ||
        projectInfo.description ||
        '',
      projectSummary:
        raw.projectSummary ||
        `Decomposed onboarding plan for ${projectInfo.name || 'Project'}`,
      assumptions: Array.isArray(raw.assumptions) ? raw.assumptions : [],
      features: normalizedFeatures,
    };
  }
}
