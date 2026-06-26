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
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User } from '@modules/users/entities/user.entity';
import { Serialize } from '@shared/interceptors/serialize.interceptor';

import { CreateBoardColumnDto } from './dtos/create-board-column.dto';
import { UpdateBoardColumnDto } from './dtos/update-board-column.dto';
import { ReorderBoardColumnsDto } from './dtos/reorder-board-columns.dto';
import { BoardColumnResponseDto } from './dtos/board-column-response.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  // ─── List Columns ───────────────────────────────────────

  @Get('projects/:projectId/boards')
  @Serialize(BoardColumnResponseDto)
  async listColumns(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.boardsService.listColumns(projectId, user.id);
    return { message: 'Board columns retrieved successfully.', data };
  }

  // ─── Create Column ──────────────────────────────────────

  @Post('projects/:projectId/boards')
  @UseGuards(CsrfGuard)
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

  // ─── Update Column ──────────────────────────────────────

  @Patch('boards/:id')
  @UseGuards(CsrfGuard)
  @Serialize(BoardColumnResponseDto)
  async updateColumn(
    @Param('id') id: string,
    @Body() body: UpdateBoardColumnDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.boardsService.updateColumn(id, body, user.id);
    return { message: 'Board column updated successfully.', data };
  }

  // ─── Delete Column ──────────────────────────────────────

  @Delete('boards/:id')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async deleteColumn(@Param('id') id: string, @CurrentUser() user: User) {
    await this.boardsService.deleteColumn(id, user.id);
    return { message: 'Board column deleted successfully.' };
  }

  // ─── Reorder Columns ───────────────────────────────────

  @Patch('projects/:projectId/boards/reorder')
  @UseGuards(CsrfGuard)
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
}
