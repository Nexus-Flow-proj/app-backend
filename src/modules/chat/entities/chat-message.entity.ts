import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from '@modules/projects/entities/project.entity';
import { User } from '@modules/users/entities/user.entity';
import { ChatMessageType } from '../enums/chat-message-type.enum';
import { ChatMessageAttachment } from './chat-message-attachment.entity';
import { ChatMessageReaction } from './chat-message-reaction.entity';

@Entity('chat_messages')
@Index(['project', 'createdAt'])
@Index(['project', 'isPinned'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender!: User;

  @Column({ type: 'text' })
  content!: string;

  @Column({
    type: 'enum',
    enum: ChatMessageType,
    default: ChatMessageType.STANDARD,
  })
  type!: ChatMessageType;

  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned!: boolean;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pinned_by' })
  pinnedBy!: User | null;

  @Column({ name: 'pinned_at', type: 'timestamptz', nullable: true })
  pinnedAt!: Date | null;

  @ManyToOne(() => ChatMessage, (message) => message.replies, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_message_id' })
  parentMessage!: ChatMessage | null;

  @OneToMany(() => ChatMessage, (message) => message.parentMessage)
  replies!: ChatMessage[];

  @Column({ name: 'is_edited', type: 'boolean', default: false })
  isEdited!: boolean;

  @Column({ name: 'edited_at', type: 'timestamptz', nullable: true })
  editedAt!: Date | null;

  @OneToMany(() => ChatMessageAttachment, (attachment) => attachment.message)
  attachments!: ChatMessageAttachment[];

  @OneToMany(() => ChatMessageReaction, (reaction) => reaction.message)
  reactions!: ChatMessageReaction[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
