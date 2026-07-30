import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OnboardingDraft } from '@modules/projects/entities/onboarding-draft.entity';
import { Project } from '@modules/projects/entities/project.entity';
import { AIGenerationJob } from './ai-generation-job.entity';

@Entity('ai_chat_messages')
export class AIChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'draft_id', type: 'uuid', nullable: true })
  draftId!: string | null;

  @ManyToOne(() => OnboardingDraft, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'draft_id' })
  draft!: OnboardingDraft | null;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId!: string | null;

  @ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'project_id' })
  project!: Project | null;

  @Column({ type: 'varchar' })
  role!: 'user' | 'assistant' | 'system';

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'generation_job_id', type: 'uuid', nullable: true })
  generationJobId!: string | null;

  @ManyToOne(() => AIGenerationJob, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'generation_job_id' })
  generationJob!: AIGenerationJob | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
