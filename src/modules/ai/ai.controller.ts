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

@Controller()
@UseGuards(JwtAuthGuard)
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('projects/onboarding/ai/generate')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async generateOnboardingPlan(
    @CurrentUser() user: User,
    @Body() dto: GenerateOnboardingPlanDto,
  ) {
    const data = await this.aiService.generateOnboardingPlan(user.id, dto);
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
    const data = await this.aiService.chatOnBoard(user.id, projectId, dto);
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
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    const data = await this.aiService.recommendTaskAssignee(projectId, taskId);
    return {
      message: 'Task has been matched to the best candidate successfully!',
      data,
    };
  }

  @Get('projects/:projectId/tasks/:taskId/ai/breakdown')
  @UseGuards(ProjectAuthGuard)
  @RequirePermission('tasks', 'update')
  async breakdownTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    const data = await this.aiService.breakTasksIntoSubtasks(projectId, taskId);
    return {
      message: 'Task breakdown was successful!',
      data,
    };
  }

  @Get('projects/:projectId/tasks/:taskId/ai/description')
  @UseGuards(ProjectAuthGuard)
  @RequirePermission('tasks', 'update')
  async generateTaskDescription(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    const data = await this.aiService.generateTaskDescription(
      projectId,
      taskId,
    );
    return {
      message: 'Task description was generated successfully!',
      data,
    };
  }

  @Get('projects/:projectId/ai/overview-summary')
  @UseGuards(ProjectAuthGuard)
  @RequirePermission('project', 'read')
  async generateProjectOverview(@Param('projectId') projectId: string) {
    const data = await this.aiService.getProjectOverviewSummary(projectId);
    return {
      message: 'Project Overview was generated successfully!',
      data,
    };
  }

  @Get('dashboard/ai/summary')
  async generateDashboardSummary(@CurrentUser() user: User) {
    const data = await this.aiService.getDashboardSummary(user.id);
    return {
      message: 'Dashboard summary was generated successfully!',
      data,
    };
  }
}
