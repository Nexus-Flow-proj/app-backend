import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { NotificationType } from '../enums/notification-type.enum';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'recipient_id', type: 'uuid' })
  recipientId!: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId!: string | null;

  @Column({ name: 'resource_type', type: 'varchar', nullable: true })
  resourceType!: string | null;

  @Column({ name: 'resource_id', type: 'varchar', nullable: true })
  resourceId!: string | null;

  @Column({
    name: 'deduplication_key',
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  deduplicationKey!: string | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
