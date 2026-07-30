import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Workshop } from '@modules/canvas/entities/workshop.entity';
import { DraftStatus } from '../enums/draft-status.enum';

@Entity('onboarding_drafts')
export class OnboardingDraft {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: DraftStatus, default: DraftStatus.DRAFT })
  status!: DraftStatus;

  @OneToOne(() => Workshop, (workshop) => workshop.draft)
  workshop!: Workshop;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'project_info', type: 'jsonb' })
  projectInfo!: {
    name: string;
    description?: string;
    color: string;
    estimatedTime?: string;
    constraints?: Record<string, any>;
  };

  /**
   * Set atomically during the submit transaction to prevent double-submit.
   * If this field is already set when submit is called, the request is rejected
   * with 409 Conflict.
   */
  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
