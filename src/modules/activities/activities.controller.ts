import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { ProjectAuthGuard } from '@shared/guards/project-auth.guard';
import { CsrfGuard } from '@shared/guards/csrf.guard';
import { RequirePermission } from '@shared/decorators/require-permission.decorator';
import { Serialize } from '@shared/interceptors/serialize.interceptor';
import { PaginationQueryDto } from '@shared/dto/pagination-query.dto';
import { ActivitiesService } from './activities.service';
import { PaginatedActivityLogsDto } from './dtos/activity-log.dto';

@Controller()
@UseGuards(JwtAuthGuard, ProjectAuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get('projects/:projectId/activity-logs')
  @RequirePermission('project', 'read')
  @Serialize(PaginatedActivityLogsDto)
  async listProjectActivities(
    @Param('projectId') projectId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const { page = 1, limit = 50 } = query;
    const data = await this.activitiesService.listProjectActivities(
      projectId,
      page,
      limit,
    );
    return { message: 'Activity logs retrieved successfully.', data };
  }

  @Delete('activity-logs/:id')
  @UseGuards(CsrfGuard)
  @RequirePermission('project', 'updateSettings')
  @HttpCode(HttpStatus.OK)
  async deleteActivity(@Param('id') id: string) {
    await this.activitiesService.deleteActivity(id);
    return { message: 'Activity log deleted successfully.' };
  }
}
