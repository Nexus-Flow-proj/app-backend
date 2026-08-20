import { IsBoolean, IsUUID } from 'class-validator';

export class ChatTypingDto {
  @IsUUID()
  projectId!: string;

  @IsBoolean()
  isTyping!: boolean;
}
