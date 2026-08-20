import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';
import { ChatMessage } from './chat-message.entity';

@Entity('chat_message_reactions')
@Unique(['message', 'user', 'emoji'])
@Index(['message'])
export class ChatMessageReaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => ChatMessage, (message) => message.reactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'message_id' })
  message!: ChatMessage;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 32 })
  emoji!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
