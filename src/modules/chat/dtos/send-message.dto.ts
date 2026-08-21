import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ChatMessageType } from '../enums/chat-message-type.enum';

export class ChatAttachmentRefDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  fileUrl!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fileType!: string;

  @IsOptional()
  @Type(() => Number)
  fileSize?: number;

  @IsString()
  @IsNotEmpty()
  storagePath!: string;
}

export class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  content?: string;

  @IsOptional()
  @IsEnum(ChatMessageType)
  type?: ChatMessageType = ChatMessageType.STANDARD;

  @IsOptional()
  @IsUUID()
  parentMessageId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentRefDto)
  attachments?: ChatAttachmentRefDto[];
}
