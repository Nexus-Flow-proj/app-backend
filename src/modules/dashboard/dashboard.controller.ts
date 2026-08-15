import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CsrfGuard } from '@shared/guards/csrf.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User } from '@modules/users/entities/user.entity';
import { Serialize } from '@shared/interceptors/serialize.interceptor';
import { DashboardService } from './dashboard.service';
import { DashboardSummaryDto } from './dtos/dashboard-summary.dto';
import { TaskProgressDto } from './dtos/task-progress.dto';
import { FocusItemDto, ToggleFocusItemDto } from './dtos/todays-focus.dto';
import { IsEnum, IsOptional } from 'class-validator';

export class TaskProgressQueryDto {
  @IsOptional()
  @IsEnum(['last_7_days', 'last_30_days', 'this_month'])
  range?: 'last_7_days' | 'last_30_days' | 'this_month' = 'last_7_days';
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Serialize(DashboardSummaryDto)
  async getSummary(@CurrentUser() user: User) {
    const data = await this.dashboardService.getDashboardSummary(user.id);
    return { message: 'Dashboard summary retrieved successfully.', data };
  }

  @Get('task-progress')
  @Serialize(TaskProgressDto)
  async getTaskProgress(
    @Query() query: TaskProgressQueryDto,
    @CurrentUser() user: User,
  ) {
    const range = query.range || 'last_7_days';
    const data = await this.dashboardService.getTaskProgress(user.id, range);
    return { message: 'Task progress retrieved successfully.', data };
  }

  @Get('todays-focus')
  @Serialize(FocusItemDto)
  async getTodaysFocus(@CurrentUser() user: User) {
    const data = await this.dashboardService.getTodaysFocus(user.id);
    return { message: "Today's focus items retrieved successfully.", data };
  }

  @Patch('todays-focus/:taskId')
  @UseGuards(CsrfGuard)
  @Serialize(FocusItemDto)
  async toggleFocusItem(
    @Param('taskId') taskId: string,
    @Body() body: ToggleFocusItemDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.dashboardService.toggleFocusItem(
      user,
      taskId,
      body.completed,
    );
    return { message: 'Focus task status updated successfully.', data };
  }
}
