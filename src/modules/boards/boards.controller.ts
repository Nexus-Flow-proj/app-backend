import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BoardsService } from './boards.service';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CsrfGuard } from '@shared/guards/csrf.guard';
import { Serialize } from '@shared/interceptors/serialize.interceptor';

import { CreateBoardColumnDto } from './dtos/create-board-column.dto';
import { UpdateBoardColumnDto } from './dtos/update-board-column.dto';
import { ReorderBoardColumnsDto } from './dtos/reorder-board-columns.dto';
import { BoardColumnResponseDto } from './dtos/board-column-response.dto';
import { ProjectAuthGuard } from '@shared/guards/project-auth.guard';
import { RequirePermission } from '@shared/decorators/require-permission.decorator';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User } from '@modules/users/entities/user.entity';

@Controller()
@UseGuards(JwtAuthGuard, ProjectAuthGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  // ─── List Columns ───────────────────────────────────────

  @Get('projects/:projectId/boards')
  @RequirePermission('board', 'read')
  @Serialize(BoardColumnResponseDto)
  async listColumns(@Param('projectId') projectId: string) {
    const data = await this.boardsService.listColumns(projectId);
    return { message: 'Board columns retrieved successfully.', data };
  }

  // ─── Create Column ──────────────────────────────────────

  @Post('projects/:projectId/boards')
  @UseGuards(CsrfGuard)
  @RequirePermission('board', 'manageColumns')
  @Serialize(BoardColumnResponseDto)
  async createColumn(
    @Param('projectId') projectId: string,
    @Body() body: CreateBoardColumnDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.boardsService.createColumn(
      projectId,
      body,
      user.id,
    );
    return { message: 'Board column created successfully.', data };
  }

  // ─── Reorder Columns ───────────────────────────────────

  @Patch('projects/:projectId/boards/reorder')
  @UseGuards(CsrfGuard)
  @RequirePermission('board', 'moveColumns')
  @Serialize(BoardColumnResponseDto)
  async reorderColumns(
    @Param('projectId') projectId: string,
    @Body() body: ReorderBoardColumnsDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.boardsService.reorderColumns(
      projectId,
      body,
      user.id,
    );
    return { message: 'Board columns reordered successfully.', data };
  }

  // ─── Update Column ──────────────────────────────────────

  @Patch('projects/:projectId/boards/:id')
  @UseGuards(CsrfGuard)
  @RequirePermission('board', 'manageColumns')
  @Serialize(BoardColumnResponseDto)
  async updateColumn(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: UpdateBoardColumnDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.boardsService.updateColumn(
      id,
      body,
      user.id,
      projectId,
    );
    return { message: 'Board column updated successfully.', data };
  }

  // ─── Delete Column ──────────────────────────────────────

  @Delete('projects/:projectId/boards/:id')
  @UseGuards(CsrfGuard)
  @RequirePermission('board', 'manageColumns')
  @HttpCode(HttpStatus.OK)
  async deleteColumn(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    await this.boardsService.deleteColumn(id, user.id, projectId);
    return { message: 'Board column deleted successfully.', data: null };
  }
}