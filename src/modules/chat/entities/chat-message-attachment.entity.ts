import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChatMessage } from './chat-message.entity';

@Entity('chat_message_attachments')
@Index(['message'])
export class ChatMessageAttachment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ChatMessage, (message) => message.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'message_id' })
  message!: ChatMessage;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'file_url', type: 'text' })
  fileUrl!: string;

  @Column({ name: 'file_type', type: 'varchar', length: 100 })
  fileType!: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize!: number;

  @Column({ name: 'storage_path', type: 'text' })
  storagePath!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
