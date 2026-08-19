import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CsrfGuard } from '@shared/guards/csrf.guard';
import { ProjectAuthGuard } from '@shared/guards/project-auth.guard';
import { RequirePermission } from '@shared/decorators/require-permission.decorator';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AIService } from './services/ai.service';
import {
  GenerateOnboardingPlanDto,
  BoardAIChatDto,
} from './dtos/ai-generation.dto';
import { PlanLimitsService } from '../subscriptions/services/plan-limits.service';
import { AIFeature } from '../subscriptions/enums/ai-feature.enum';

@Controller()
@UseGuards(JwtAuthGuard)
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  @Post('projects/onboarding/ai/generate')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async generateOnboardingPlan(
    @CurrentUser() user: User,
    @Body() dto: GenerateOnboardingPlanDto,
  ) {
    await this.planLimitsService.assertCanUseAI(
      user.id,
      undefined,
      AIFeature.ONBOARDING,
    );

    const data = await this.aiService.generateOnboardingPlan(user.id, dto);

    await this.planLimitsService.incrementAIUsage(
      user.id,
      undefined,
      AIFeature.ONBOARDING,
    );

    return {
      message: 'Onboarding AI plan generation initiated successfully.',
      data,
    };
  }

  @Get('projects/onboarding/ai/generations/:generationId')
  async getOnboardingGeneration(
    @CurrentUser() user: User,
    @Param('generationId', ParseUUIDPipe) generationId: string,
  ) {
    const data = await this.aiService.getGenerationJob(generationId, user.id);
    return {
      message: 'Onboarding AI generation status retrieved successfully.',
      data,
    };
  }

  @Get('projects/onboarding/ai/drafts/:draftId/messages')
  async getDraftMessages(
    @CurrentUser() user: User,
    @Param('draftId', ParseUUIDPipe) draftId: string,
  ) {
    const data = await this.aiService.getDraftMessages(draftId, user.id);
    return {
      message: 'Draft AI chat messages retrieved successfully.',
      data,
    };
  }

  @Post('projects/:projectId/ai/chat')
  @UseGuards(CsrfGuard, ProjectAuthGuard)
  @RequirePermission('workshop', 'generateWithAi')
  @HttpCode(HttpStatus.ACCEPTED)
  async chatOnBoard(
    @CurrentUser() user: User,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: BoardAIChatDto,
  ) {
    await this.planLimitsService.assertCanUseAI(
      user.id,
      projectId,
      AIFeature.CHAT,
    );

    const data = await this.aiService.chatOnBoard(user.id, projectId, dto);

    await this.planLimitsService.incrementAIUsage(
      user.id,
      projectId,
      AIFeature.CHAT,
    );

    return {
      message: 'Board AI chat suggestions generation initiated successfully.',
      data,
    };
  }

  @Get('projects/:projectId/ai/generations/:generationId')
  @UseGuards(ProjectAuthGuard)
  @RequirePermission('workshop', 'generateWithAi')
  async getBoardGeneration(
    @CurrentUser() user: User,
    @Param('generationId', ParseUUIDPipe) generationId: string,
  ) {
    const data = await this.aiService.getGenerationJob(generationId, user.id);
    return {
      message: 'Board AI generation status retrieved successfully.',
      data,
    };
  }

  @Get('projects/:projectId/ai/messages')
  @UseGuards(ProjectAuthGuard)
  @RequirePermission('workshop', 'read')
  async getProjectMessages(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    const data = await this.aiService.getProjectMessages(projectId);
    return {
      message: 'Project AI chat messages retrieved successfully.',
      data,
    };
  }

  @Get('projects/:projectId/tasks/:taskId/ai/assign')
  @UseGuards(ProjectAuthGuard)
  @RequirePermission('tasks', 'update')
  async recommendAssignee(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    await this.planLimitsService.assertCanUseAI(
      user.id,
      projectId,
      AIFeature.TASK,
    );

    const data = await this.aiService.recommendTaskAssignee(projectId, taskId);

    await this.planLimitsService.incrementAIUsage(
      user.id,
      projectId,
      AIFeature.TASK,
    );

    return {
      message: 'Task has been matched to the best candidate successfully!',
      data,
    };
  }

  @Get('projects/:projectId/tasks/:taskId/ai/breakdown')
  @UseGuards(ProjectAuthGuard)
  @RequirePermission('tasks', 'update')
  async breakdownTask(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    await this.planLimitsService.assertCanUseAI(
      user.id,
      projectId,
      AIFeature.TASK,
    );

    const data = await this.aiService.breakTasksIntoSubtasks(projectId, taskId);

    await this.planLimitsService.incrementAIUsage(
      user.id,
      projectId,
      AIFeature.TASK,
    );

    return {
      message: 'Task breakdown was successful!',
      data,
    };
  }

  @Get('projects/:projectId/tasks/:taskId/ai/description')
  @UseGuards(ProjectAuthGuard)
  @RequirePermission('tasks', 'update')
  async generateTaskDescription(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    await this.planLimitsService.assertCanUseAI(
      user.id,
      projectId,
      AIFeature.TASK,
    );

    const data = await this.aiService.generateTaskDescription(
      projectId,
      taskId,
    );

    await this.planLimitsService.incrementAIUsage(
      user.id,
      projectId,
      AIFeature.TASK,
    );

    return {
      message: 'Task description was generated successfully!',
      data,
    };
  }

  @Get('projects/:projectId/ai/overview-summary')
  @UseGuards(ProjectAuthGuard)
  @RequirePermission('project', 'read')
  async generateProjectOverview(
    @CurrentUser() user: User,
    @Param('projectId') projectId: string,
  ) {
    await this.planLimitsService.assertCanUseAI(
      user.id,
      projectId,
      AIFeature.TASK,
    );

    const data = await this.aiService.getProjectOverviewSummary(projectId);

    await this.planLimitsService.incrementAIUsage(
      user.id,
      projectId,
      AIFeature.TASK,
    );

    return {
      message: 'Project Overview was generated successfully!',
      data,
    };
  }

  @Get('dashboard/ai/summary')
  async generateDashboardSummary(@CurrentUser() user: User) {
    await this.planLimitsService.assertCanUseAI(
      user.id,
      undefined,
      AIFeature.TASK,
    );

    const data = await this.aiService.getDashboardSummary(user.id);

    await this.planLimitsService.incrementAIUsage(
      user.id,
      undefined,
      AIFeature.TASK,
    );

    return {
      message: 'Dashboard summary was generated successfully!',
      data,
    };
  }
}
