import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AIGenerationStatus } from '../enums/ai-generation-status.enum';

@Entity('ai_generation_jobs')
export class AIGenerationJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'requested_by', type: 'uuid' })
  requestedBy!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requested_by' })
  requester!: User;

  @Column({ type: 'text' })
  prompt!: string;

  @Column({
    type: 'enum',
    enum: AIGenerationStatus,
    default: AIGenerationStatus.PENDING,
  })
  status!: AIGenerationStatus;

  @Column({ type: 'varchar' })
  provider!: string;

  @Column({ type: 'varchar' })
  model!: string;

  @Column({ name: 'input_snapshot', type: 'jsonb' })
  inputSnapshot!: Record<string, unknown>;

  @Column({ name: 'output_snapshot', type: 'jsonb', nullable: true })
  outputSnapshot!: Record<string, unknown> | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;
}
