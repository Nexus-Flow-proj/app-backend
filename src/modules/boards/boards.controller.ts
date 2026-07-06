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

@Controller()
@UseGuards(JwtAuthGuard, ProjectAuthGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  // ─── List Columns ───────────────────────────────────────

  @Get('projects/:projectId/boards')
  @RequirePermission('board', 'read')
  @Serialize(BoardColumnResponseDto)
  async listColumns(
    @Param('projectId') projectId: string,
  ) {
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
  ) {
    const data = await this.boardsService.createColumn(
      projectId,
      body,
    );
    return { message: 'Board column created successfully.', data };
  }

  // ─── Update Column ──────────────────────────────────────

  @Patch('boards/:id')
  @UseGuards(CsrfGuard)
  @RequirePermission('board', 'manageColumns')
  @Serialize(BoardColumnResponseDto)
  async updateColumn(
    @Param('id') id: string,
    @Body() body: UpdateBoardColumnDto,
  ) {
    const data = await this.boardsService.updateColumn(id, body);
    return { message: 'Board column updated successfully.', data };
  }

  // ─── Delete Column ──────────────────────────────────────

  @Delete('boards/:id')
  @UseGuards(CsrfGuard)
  @RequirePermission('board', 'manageColumns')
  @HttpCode(HttpStatus.OK)
  async deleteColumn(@Param('id') id: string) {
    await this.boardsService.deleteColumn(id);
    return { message: 'Board column deleted successfully.' };
  }

  // ─── Reorder Columns ───────────────────────────────────

  @Patch('projects/:projectId/boards/reorder')
  @UseGuards(CsrfGuard)
  @RequirePermission('board', 'manageColumns')
  @Serialize(BoardColumnResponseDto)
  async reorderColumns(
    @Param('projectId') projectId: string,
    @Body() body: ReorderBoardColumnsDto,
  ) {
    const data = await this.boardsService.reorderColumns(
      projectId,
      body,
    );
    return { message: 'Board columns reordered successfully.', data };
  }
}
