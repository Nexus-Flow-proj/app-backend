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
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import {
  attachmentFileFilter,
  MAX_ATTACHMENT_FILES_COUNT,
  MAX_ATTACHMENT_SIZE_BYTES,
} from '@shared/utils/file-validation.util';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CsrfGuard } from '@shared/guards/csrf.guard';
import { ProjectAuthGuard } from '@shared/guards/project-auth.guard';
import { RequirePermission } from '@shared/decorators/require-permission.decorator';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { CurrentProjectMember } from '@shared/decorators/current-project-member.decorator';
import { User } from '@modules/users/entities/user.entity';
import { ProjectMember } from '@modules/projects/entities/project-member.entity';

import { ChatService } from './chat.service';
import { SendMessageDto } from './dtos/send-message.dto';
import { UpdateMessageDto } from './dtos/update-message.dto';
import { ChatPaginationQueryDto } from './dtos/chat-pagination-query.dto';
import { AddReactionDto } from './dtos/chat-reaction.dto';
import { MarkReadDto } from './dtos/mark-read.dto';
import { PinMessageDto } from './dtos/pin-message.dto';

@Controller()
@UseGuards(JwtAuthGuard, ProjectAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ─── Message history ───────────────────────────────────────────────────

  @Get('projects/:projectId/chat/messages')
  @RequirePermission('chat', 'read')
  async listMessages(
    @Param('projectId') projectId: string,
    @Query() query: ChatPaginationQueryDto,
  ) {
    const data = await this.chatService.listMessages(projectId, query);
    return { message: 'Messages retrieved successfully.', data };
  }

  @Post('projects/:projectId/chat/messages')
  @UseGuards(CsrfGuard)
  @RequirePermission('chat', 'send')
  async sendMessage(
    @Param('projectId') projectId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: User,
    @CurrentProjectMember() member: ProjectMember,
  ) {
    const data = await this.chatService.sendMessage(
      projectId,
      user,
      member,
      dto,
    );
    return { message: 'Message sent successfully.', data };
  }

  @Get('projects/:projectId/chat/messages/pinned')
  @RequirePermission('chat', 'read')
  async getPinnedMessages(@Param('projectId') projectId: string) {
    const data = await this.chatService.getPinnedMessages(projectId);
    return { message: 'Pinned messages retrieved successfully.', data };
  }

  @Get('projects/:projectId/chat/messages/unread-count')
  @RequirePermission('chat', 'read')
  async getUnreadCount(
    @Param('projectId') projectId: string,
    @CurrentUser() user: User,
  ) {
    const unreadCount = await this.chatService.getUnreadCount(
      projectId,
      user.id,
    );
    return {
      message: 'Unread count retrieved successfully.',
      data: { unreadCount },
    };
  }

  @Post('projects/:projectId/chat/messages/read')
  @UseGuards(CsrfGuard)
  @RequirePermission('chat', 'read')
  async markRead(
    @Param('projectId') projectId: string,
    @Body() dto: MarkReadDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.chatService.markRead(
      projectId,
      user.id,
      dto.messageId,
    );
    return { message: 'Messages marked as read.', data };
  }

  @Post('projects/:projectId/chat/messages/attachments')
  @UseGuards(CsrfGuard)
  @RequirePermission('chat', 'send')
  @UseInterceptors(
    FilesInterceptor('files', MAX_ATTACHMENT_FILES_COUNT, {
      limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
      fileFilter: attachmentFileFilter,
    }),
  )
  async uploadAttachments(
    @Param('projectId') projectId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'Please provide files with form field name "files".',
      );
    }
    const attachments = await this.chatService.uploadAttachments(
      projectId,
      user.id,
      files,
    );
    return {
      message: 'Attachment(s) uploaded successfully.',
      data: { attachments },
    };
  }

  // ─── Single message ─────────────────────────────────────────────────────

  @Get('projects/:projectId/chat/messages/:messageId')
  @RequirePermission('chat', 'read')
  async getMessage(
    @Param('projectId') projectId: string,
    @Param('messageId') messageId: string,
  ) {
    const data = await this.chatService.getMessage(projectId, messageId);
    return { message: 'Message retrieved successfully.', data };
  }

  @Patch('projects/:projectId/chat/messages/:messageId')
  @UseGuards(CsrfGuard)
  @RequirePermission('chat', 'send')
  async updateMessage(
    @Param('projectId') projectId: string,
    @Param('messageId') messageId: string,
    @Body() dto: UpdateMessageDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.chatService.updateMessage(
      projectId,
      messageId,
      user.id,
      dto,
    );
    return { message: 'Message updated successfully.', data };
  }

  @Delete('projects/:projectId/chat/messages/:messageId')
  @UseGuards(CsrfGuard)
  @RequirePermission('chat', 'send')
  @HttpCode(HttpStatus.OK)
  async deleteMessage(
    @Param('projectId') projectId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: User,
    @CurrentProjectMember() member: ProjectMember,
  ) {
    await this.chatService.deleteMessage(projectId, messageId, user.id, member);
    return { message: 'Message deleted successfully.' };
  }

  // ─── Pin ────────────────────────────────────────────────────────────────

  @Post('projects/:projectId/chat/messages/:messageId/pin')
  @UseGuards(CsrfGuard)
  @RequirePermission('chat', 'pin')
  async togglePin(
    @Param('projectId') projectId: string,
    @Param('messageId') messageId: string,
    @Body() dto: PinMessageDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.chatService.togglePin(
      projectId,
      messageId,
      user,
      dto.pinned,
    );
    return {
      message: data.isPinned ? 'Message pinned.' : 'Message unpinned.',
      data,
    };
  }

  // ─── Reactions ──────────────────────────────────────────────────────────

  @Post('projects/:projectId/chat/messages/:messageId/reactions')
  @UseGuards(CsrfGuard)
  @RequirePermission('chat', 'read')
  async addReaction(
    @Param('projectId') projectId: string,
    @Param('messageId') messageId: string,
    @Body() dto: AddReactionDto,
    @CurrentUser() user: User,
  ) {
    await this.chatService.addReaction(projectId, messageId, user, dto.emoji);
    return { message: 'Reaction added.' };
  }

  @Delete('projects/:projectId/chat/messages/:messageId/reactions/:emoji')
  @UseGuards(CsrfGuard)
  @RequirePermission('chat', 'read')
  @HttpCode(HttpStatus.OK)
  async removeReaction(
    @Param('projectId') projectId: string,
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
    @CurrentUser() user: User,
  ) {
    await this.chatService.removeReaction(projectId, messageId, user.id, emoji);
    return { message: 'Reaction removed.' };
  }
}
