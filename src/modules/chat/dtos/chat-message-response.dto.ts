import { Expose, Type } from 'class-transformer';
import { ChatMessageType } from '../enums/chat-message-type.enum';

export class ChatSenderDto {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  avatarUrl!: string | null;
}

export class ChatAttachmentDto {
  @Expose()
  id!: string;

  @Expose()
  fileName!: string;

  @Expose()
  fileUrl!: string;

  @Expose()
  fileType!: string;

  @Expose()
  fileSize!: number;

  @Expose()
  createdAt!: Date;
}

export class ChatReactionDto {
  @Expose()
  id!: string;

  @Expose()
  emoji!: string;

  @Expose()
  @Type(() => ChatSenderDto)
  user!: ChatSenderDto;
}

export class ChatMessageResponseDto {
  @Expose()
  id!: string;

  @Expose()
  projectId!: string;

  @Expose()
  @Type(() => ChatSenderDto)
  sender!: ChatSenderDto;

  @Expose()
  content!: string;

  @Expose()
  type!: ChatMessageType;

  @Expose()
  isPinned!: boolean;

  @Expose()
  @Type(() => ChatSenderDto)
  pinnedBy!: ChatSenderDto | null;

  @Expose()
  pinnedAt!: Date | null;

  @Expose()
  parentMessageId!: string | null;

  @Expose()
  isEdited!: boolean;

  @Expose()
  editedAt!: Date | null;

  @Expose()
  @Type(() => ChatAttachmentDto)
  attachments!: ChatAttachmentDto[];

  @Expose()
  @Type(() => ChatReactionDto)
  reactions!: ChatReactionDto[];

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}

export class PaginatedChatMessagesDto {
  @Expose()
  @Type(() => ChatMessageResponseDto)
  messages!: ChatMessageResponseDto[];

  @Expose()
  nextCursor!: string | null;

  @Expose()
  hasMore!: boolean;
}
