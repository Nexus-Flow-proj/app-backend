import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '@modules/users/entities/user.entity';
import { ProjectMember } from '@modules/projects/entities/project-member.entity';
import { StorageService } from '@shared/providers/storage/storage.service';
import { ProjectAuthEvaluator } from '@modules/projects/utils/project-auth.evaluator';

import { ChatMessage } from './entities/chat-message.entity';
import { ChatMessageAttachment } from './entities/chat-message-attachment.entity';
import { ChatMessageReaction } from './entities/chat-message-reaction.entity';
import { ChatReadState } from './entities/chat-read-state.entity';
import { ChatMessageType } from './enums/chat-message-type.enum';
import { SendMessageDto, ChatAttachmentRefDto } from './dtos/send-message.dto';
import { UpdateMessageDto } from './dtos/update-message.dto';
import { ChatPaginationQueryDto } from './dtos/chat-pagination-query.dto';
import { ChatMessageResponseDto } from './dtos/chat-message-response.dto';
import { DOMAIN_EVENTS } from '@modules/realtime/constants/domain-events';

export interface ChatRealtimeEvent {
  projectId: string;
  [key: string]: unknown;
}

export const MAX_CHAT_ATTACHMENTS_PER_MESSAGE = 5;

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepo: Repository<ChatMessage>,
    @InjectRepository(ChatMessageAttachment)
    private readonly attachmentRepo: Repository<ChatMessageAttachment>,
    @InjectRepository(ChatMessageReaction)
    private readonly reactionRepo: Repository<ChatMessageReaction>,
    @InjectRepository(ChatReadState)
    private readonly readStateRepo: Repository<ChatReadState>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Messages ───────────────────────────────────────────────────────────

  async sendMessage(
    projectId: string,
    user: User,
    member: ProjectMember,
    dto: SendMessageDto,
  ): Promise<ChatMessageResponseDto> {
    const hasContent = Boolean(dto.content?.trim());
    const hasAttachments = (dto.attachments?.length ?? 0) > 0;
    if (!hasContent && !hasAttachments) {
      throw new BadRequestException(
        'A message must include text content or at least one attachment.',
      );
    }

    const type = dto.type ?? ChatMessageType.STANDARD;
    if (type === ChatMessageType.ANNOUNCEMENT) {
      const canAnnounce = ProjectAuthEvaluator.hasPermission(
        member,
        'chat',
        'sendAnnouncement',
      );
      if (!canAnnounce) {
        throw new ForbiddenException(
          'You do not have permission to send announcements.',
        );
      }
    }

    let parentMessage: ChatMessage | null = null;
    if (dto.parentMessageId) {
      parentMessage = await this.chatMessageRepo.findOne({
        where: { id: dto.parentMessageId, project: { id: projectId } },
      });
      if (!parentMessage) {
        throw new BadRequestException(
          'The parent message does not exist in this project.',
        );
      }
    }

    const message = this.chatMessageRepo.create({
      project: { id: projectId } as any,
      sender: user,
      content: dto.content?.trim() ?? '',
      type,
      parentMessage,
    });

    const saved = await this.chatMessageRepo.save(message);

    if (dto.attachments && dto.attachments.length > 0) {
      const attachmentEntities = dto.attachments.map((ref) =>
        this.attachmentRepo.create({
          message: saved,
          fileName: ref.fileName,
          fileUrl: ref.fileUrl,
          fileType: ref.fileType,
          fileSize: ref.fileSize,
          storagePath: ref.storagePath,
        }),
      );
      await this.attachmentRepo.save(attachmentEntities);
    }

    const view = await this.loadMessageView(projectId, saved.id);

    this.eventEmitter.emit(DOMAIN_EVENTS.CHAT.MESSAGE_CREATED, {
      projectId,
      message: view,
    } satisfies ChatRealtimeEvent);

    return view;
  }

  async listMessages(
    projectId: string,
    query: ChatPaginationQueryDto,
  ): Promise<{
    messages: ChatMessageResponseDto[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const limit = query.limit ?? 50;

    const qb = this.chatMessageRepo
      .createQueryBuilder('msg')
      .innerJoinAndSelect('msg.sender', 'sender')
      .leftJoinAndSelect('msg.attachments', 'attachments')
      .leftJoinAndSelect('msg.reactions', 'reactions')
      .leftJoinAndSelect('reactions.user', 'reactionUser')
      .where('msg.project = :projectId', { projectId })
      .orderBy('msg.createdAt', 'DESC')
      .addOrderBy('msg.id', 'DESC')
      .take(limit + 1);

    if (query.type) {
      qb.andWhere('msg.type = :type', { type: query.type });
    }

    if (query.pinned !== undefined) {
      qb.andWhere('msg.isPinned = :pinned', { pinned: query.pinned });
    }

    if (query.search) {
      const escaped = query.search.replace(/[%_]/g, (ch) => `\\${ch}`);
      qb.andWhere('msg.content ILIKE :search', {
        search: `%${escaped}%`,
      });
    }

    if (query.cursor) {
      const cursorMessage = await this.chatMessageRepo.findOne({
        where: { id: query.cursor, project: { id: projectId } },
        select: { id: true, createdAt: true },
      });
      if (!cursorMessage) {
        throw new BadRequestException('Invalid pagination cursor.');
      }
      qb.andWhere(
        '(msg.createdAt < :cursorCreatedAt OR (msg.createdAt = :cursorCreatedAt AND msg.id < :cursorId))',
        {
          cursorCreatedAt: cursorMessage.createdAt,
          cursorId: cursorMessage.id,
        },
      );
    }

    const results = await qb.getMany();

    const hasMore = results.length > limit;
    const page = hasMore ? results.slice(0, limit) : results;
    const last = page[page.length - 1];

    return {
      messages: page.map((m) => this.toMessageView(m, projectId)),
      nextCursor: last ? last.id : null,
      hasMore,
    };
  }

  async getPinnedMessages(
    projectId: string,
  ): Promise<ChatMessageResponseDto[]> {
    const messages = await this.chatMessageRepo.find({
      where: { project: { id: projectId }, isPinned: true },
      relations: {
        sender: true,
        pinnedBy: true,
        attachments: true,
        reactions: { user: true },
      },
      order: { pinnedAt: 'DESC' },
    });

    return messages.map((m) => this.toMessageView(m, projectId));
  }

  async getMessage(
    projectId: string,
    messageId: string,
  ): Promise<ChatMessageResponseDto> {
    const view = await this.loadMessageView(projectId, messageId);
    return view;
  }

  async updateMessage(
    projectId: string,
    messageId: string,
    userId: string,
    dto: UpdateMessageDto,
  ): Promise<ChatMessageResponseDto> {
    const message = await this.findMessageOrFail(projectId, messageId);

    if (message.sender.id !== userId) {
      throw new ForbiddenException('You can only edit your own messages.');
    }

    message.content = dto.content.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await this.chatMessageRepo.save(message);

    const view = await this.loadMessageView(projectId, messageId);

    this.eventEmitter.emit(DOMAIN_EVENTS.CHAT.MESSAGE_UPDATED, {
      projectId,
      message: view,
    } satisfies ChatRealtimeEvent);

    return view;
  }

  async deleteMessage(
    projectId: string,
    messageId: string,
    userId: string,
    member: ProjectMember,
  ): Promise<void> {
    const message = await this.findMessageOrFail(projectId, messageId);

    const isAuthor = message.sender.id === userId;

    if (!isAuthor) {
      const canDeleteAny = ProjectAuthEvaluator.hasPermission(
        member,
        'chat',
        'deleteAny',
      );
      if (!canDeleteAny) {
        throw new ForbiddenException(
          'You can only delete messages you authored.',
        );
      }

      const senderMember = await this.projectMemberRepo.findOne({
        where: {
          project: { id: projectId },
          user: { id: message.sender.id },
        },
        relations: { role: true },
      });
      const canModify = ProjectAuthEvaluator.canModifyResource(
        member,
        message.sender.id,
        senderMember?.role?.level ?? null,
      );
      if (!canModify) {
        throw new ForbiddenException(
          'You cannot delete messages authored by someone with an equal or higher role level.',
        );
      }
    }

    const attachments = message.attachments ?? [];
    await this.chatMessageRepo.delete(message.id);

    for (const attachment of attachments) {
      if (attachment.storagePath) {
        await this.storageService.deleteAttachment(attachment.storagePath);
      }
    }

    this.eventEmitter.emit(DOMAIN_EVENTS.CHAT.MESSAGE_DELETED, {
      projectId,
      messageId: message.id,
      type: message.type,
    } satisfies ChatRealtimeEvent);
  }

  // ─── Pin ────────────────────────────────────────────────────────────────

  async togglePin(
    projectId: string,
    messageId: string,
    user: User,
    pinned?: boolean,
  ): Promise<ChatMessageResponseDto> {
    const message = await this.findMessageOrFail(projectId, messageId);

    const targetState = pinned ?? !message.isPinned;

    if (targetState) {
      message.isPinned = true;
      message.pinnedBy = user;
      message.pinnedAt = new Date();
    } else {
      message.isPinned = false;
      message.pinnedBy = null as any;
      message.pinnedAt = null;
    }

    await this.chatMessageRepo.save(message);

    const view = await this.loadMessageView(projectId, messageId);

    this.eventEmitter.emit(
      targetState
        ? DOMAIN_EVENTS.CHAT.MESSAGE_PINNED
        : DOMAIN_EVENTS.CHAT.MESSAGE_UNPINNED,
      {
        projectId,
        message: view,
      } satisfies ChatRealtimeEvent,
    );

    return view;
  }

  // ─── Reactions ──────────────────────────────────────────────────────────

  async addReaction(
    projectId: string,
    messageId: string,
    user: User,
    emoji: string,
  ): Promise<void> {
    await this.findMessageOrFail(projectId, messageId);

    const existing = await this.reactionRepo.findOne({
      where: { message: { id: messageId }, user: { id: user.id }, emoji },
    });
    if (existing) {
      return;
    }

    await this.reactionRepo.save(
      this.reactionRepo.create({
        message: { id: messageId } as any,
        user,
        emoji,
      }),
    );

    this.eventEmitter.emit(DOMAIN_EVENTS.CHAT.REACTION_ADDED, {
      projectId,
      messageId,
      emoji,
      userId: user.id,
    } satisfies ChatRealtimeEvent);
  }

  async removeReaction(
    projectId: string,
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<void> {
    const message = await this.findMessageOrFail(projectId, messageId);

    const result = await this.reactionRepo.delete({
      message: { id: message.id },
      user: { id: userId },
      emoji,
    });

    if (result.affected) {
      this.eventEmitter.emit(DOMAIN_EVENTS.CHAT.REACTION_REMOVED, {
        projectId,
        messageId,
        emoji,
        userId,
      } satisfies ChatRealtimeEvent);
    }
  }

  // ─── Read state ─────────────────────────────────────────────────────────

  async getUnreadCount(projectId: string, userId: string): Promise<number> {
    const member = await this.getMemberOrFail(projectId, userId);
    const readState = await this.readStateRepo.findOne({
      where: { project: { id: projectId }, user: { id: userId } },
    });

    const baseline = readState?.lastReadAt ?? member.joinedAt;

    const count = await this.chatMessageRepo
      .createQueryBuilder('msg')
      .where('msg.project = :projectId', { projectId })
      .andWhere('msg.createdAt > :baseline', { baseline })
      .getCount();

    return count;
  }

  async markRead(
    projectId: string,
    userId: string,
    messageId?: string,
  ): Promise<{ lastReadAt: Date; lastReadMessageId: string | null }> {
    let lastReadAt = new Date();
    let lastReadMessageId: string | null = null;

    if (messageId) {
      const message = await this.findMessageOrFail(projectId, messageId);
      lastReadAt = message.createdAt;
      lastReadMessageId = message.id;
    }

    let state = await this.readStateRepo.findOne({
      where: { project: { id: projectId }, user: { id: userId } },
    });

    if (!state) {
      state = this.readStateRepo.create({
        project: { id: projectId } as any,
        user: { id: userId } as any,
      });
    }

    state.lastReadAt = lastReadAt;
    state.lastReadMessage = messageId
      ? ({ id: messageId } as any)
      : (null as any);
    await this.readStateRepo.save(state);

    this.eventEmitter.emit(DOMAIN_EVENTS.CHAT.READ, {
      projectId,
      userId,
      lastReadAt,
      lastReadMessageId,
    } satisfies ChatRealtimeEvent);

    return { lastReadAt, lastReadMessageId };
  }

  // ─── Attachments ────────────────────────────────────────────────────────

  async uploadAttachments(
    projectId: string,
    userId: string,
    files: Express.Multer.File[],
  ): Promise<ChatAttachmentRefDto[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided.');
    }
    if (files.length > MAX_CHAT_ATTACHMENTS_PER_MESSAGE) {
      throw new BadRequestException(
        `Maximum ${MAX_CHAT_ATTACHMENTS_PER_MESSAGE} files can be uploaded at a time.`,
      );
    }

    await this.getMemberOrFail(projectId, userId);

    const uploads = await Promise.all(
      files.map(async (file) => {
        const { publicUrl, storagePath } =
          await this.storageService.uploadChatAttachment(
            projectId,
            file.buffer,
            file.mimetype,
            file.originalname,
          );

        return {
          fileName: file.originalname,
          fileUrl: publicUrl,
          fileType: file.mimetype,
          fileSize: file.size,
          storagePath,
        } satisfies ChatAttachmentRefDto;
      }),
    );

    return uploads;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private async findMessageOrFail(
    projectId: string,
    messageId: string,
    relations: { project?: boolean } = {},
  ): Promise<ChatMessage> {
    const message = await this.chatMessageRepo.findOne({
      where: { id: messageId, project: { id: projectId } },
      relations: {
        sender: true,
        attachments: true,
        ...(relations.project ? { project: true } : {}),
      },
    });

    if (!message) {
      throw new NotFoundException('Chat message not found.');
    }

    return message;
  }

  private async loadMessageView(
    projectId: string,
    messageId: string,
  ): Promise<ChatMessageResponseDto> {
    const message = await this.chatMessageRepo.findOne({
      where: { id: messageId, project: { id: projectId } },
      relations: {
        sender: true,
        pinnedBy: true,
        parentMessage: { sender: true },
        attachments: true,
        reactions: { user: true },
      },
    });

    if (!message) {
      throw new NotFoundException('Chat message not found.');
    }

    return this.toMessageView(message, projectId);
  }

  private toMessageView(
    message: ChatMessage,
    projectId: string,
  ): ChatMessageResponseDto {
    const sender = message.sender;
    const pinnedBy = message.pinnedBy;

    return {
      id: message.id,
      projectId,
      sender: {
        id: sender.id,
        firstName: sender.firstName,
        lastName: sender.lastName,
        avatarUrl: sender.avatarUrl ?? null,
      },
      content: message.content,
      type: message.type,
      isPinned: message.isPinned,
      pinnedBy: pinnedBy
        ? {
            id: pinnedBy.id,
            firstName: pinnedBy.firstName,
            lastName: pinnedBy.lastName,
            avatarUrl: pinnedBy.avatarUrl ?? null,
          }
        : null,
      pinnedAt: message.pinnedAt,
      parentMessageId: message.parentMessage?.id ?? null,
      isEdited: message.isEdited,
      editedAt: message.editedAt,
      attachments: (message.attachments ?? []).map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileUrl: a.fileUrl,
        fileType: a.fileType,
        fileSize: a.fileSize,
        createdAt: a.createdAt,
      })),
      reactions: (message.reactions ?? []).map((r) => ({
        id: r.id,
        emoji: r.emoji,
        user: {
          id: r.user.id,
          firstName: r.user.firstName,
          lastName: r.user.lastName,
          avatarUrl: r.user.avatarUrl ?? null,
        },
      })),
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  private async getMemberOrFail(
    projectId: string,
    userId: string,
  ): Promise<ProjectMember> {
    const member = await this.projectMemberRepo.findOne({
      where: { project: { id: projectId }, user: { id: userId } },
      relations: { role: true },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this project.');
    }

    return member;
  }
}
