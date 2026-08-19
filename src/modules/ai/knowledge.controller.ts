import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CsrfGuard } from '@shared/guards/csrf.guard';
import { ProjectAuthGuard } from '@shared/guards/project-auth.guard';
import { RequirePermission } from '@shared/decorators/require-permission.decorator';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { KnowledgeService } from './services/knowledge.service';
import {
  CreateKnowledgeDto,
  UpdateKnowledgeDto,
  SearchKnowledgeDto,
} from './dtos/knowledge.dto';
import { PlanLimitsService } from '../subscriptions/services/plan-limits.service';

@Controller('projects/:projectId/knowledge')
@UseGuards(JwtAuthGuard, ProjectAuthGuard)
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission('project', 'updateSettings')
  @HttpCode(HttpStatus.CREATED)
  async createKnowledge(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateKnowledgeDto,
    @CurrentUser() user: User,
  ) {
    await this.planLimitsService.assertCanUseKnowledge(projectId);

    const data = await this.knowledgeService.createKnowledge(
      projectId,
      dto,
      user.id,
    );
    return {
      message: 'Project knowledge document created successfully.',
      data,
    };
  }

  @Get()
  @RequirePermission('project', 'read')
  async listKnowledge(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('sourceType') sourceType?: string,
  ) {
    await this.planLimitsService.assertCanUseKnowledge(projectId);

    const data = await this.knowledgeService.listKnowledge(
      projectId,
      sourceType,
    );
    return {
      message: 'Project knowledge documents retrieved successfully.',
      data,
    };
  }

  @Post('search')
  @RequirePermission('project', 'read')
  @HttpCode(HttpStatus.OK)
  async searchKnowledge(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: SearchKnowledgeDto,
  ) {
    await this.planLimitsService.assertCanUseKnowledge(projectId);

    const data = await this.knowledgeService.searchRelevantKnowledge(
      projectId,
      dto.query,
      dto.limit,
      dto.minSimilarity,
    );
    return {
      message: 'Semantic knowledge search completed successfully.',
      data,
    };
  }

  @Get(':chunkId')
  @RequirePermission('project', 'read')
  async getKnowledgeById(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('chunkId', ParseUUIDPipe) chunkId: string,
  ) {
    await this.planLimitsService.assertCanUseKnowledge(projectId);

    const data = await this.knowledgeService.getKnowledgeById(
      projectId,
      chunkId,
    );
    return {
      message: 'Project knowledge document retrieved successfully.',
      data,
    };
  }

  @Patch(':chunkId')
  @UseGuards(CsrfGuard)
  @RequirePermission('project', 'updateSettings')
  async updateKnowledge(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('chunkId', ParseUUIDPipe) chunkId: string,
    @Body() dto: UpdateKnowledgeDto,
  ) {
    await this.planLimitsService.assertCanUseKnowledge(projectId);

    const data = await this.knowledgeService.updateKnowledge(
      projectId,
      chunkId,
      dto,
    );
    return {
      message: 'Project knowledge document updated successfully.',
      data,
    };
  }

  @Delete(':chunkId')
  @UseGuards(CsrfGuard)
  @RequirePermission('project', 'updateSettings')
  @HttpCode(HttpStatus.OK)
  async deleteKnowledge(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('chunkId', ParseUUIDPipe) chunkId: string,
  ) {
    await this.planLimitsService.assertCanUseKnowledge(projectId);

    await this.knowledgeService.deleteKnowledge(projectId, chunkId);
    return {
      message: 'Project knowledge document deleted successfully.',
      data: { deleted: true },
    };
  }
}
