import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';

import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CsrfGuard } from '@shared/guards/csrf.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { PaginationQueryDto } from '@shared/dto/pagination-query.dto';
import { Serialize } from '@shared/interceptors/serialize.interceptor';
import { User } from '@modules/users/entities/user.entity';

import { NotificationsService } from '../notifications.service';
import { NotificationsListResponseDto } from '../dtos/notification-response.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Serialize(NotificationsListResponseDto)
  async getNotifications(
    @CurrentUser() currentUser: User,
    @Query() query: PaginationQueryDto,
  ) {
    const { page = 1, limit = 50 } = query;
    const data = await this.notificationsService.getMyNotifications(
      currentUser.id,
      page,
      limit,
    );

    return {
      message: 'Notifications retrieved successfully.',
      data: {
        notifications: data.items,
        unreadCount: data.unreadCount,
        page: data.pagination.page,
        limit: data.pagination.limit,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
      },
    };
  }

  @Patch('read-all')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsRead(@CurrentUser() currentUser: User) {
    await this.notificationsService.markAllAsRead(currentUser.id);
  }

  @Patch(':id/read')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    await this.notificationsService.markNotificationAsRead(id, currentUser.id);
  }
}
