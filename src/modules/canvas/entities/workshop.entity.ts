import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { OnboardingDraft } from '@modules/projects/entities/onboarding-draft.entity';
import { WorkshopObject } from './workshop-object.entity';
import { WorkshopConnection } from './workshop-connection.entity';

@Entity('workshops')
export class Workshop {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'draft_id', type: 'uuid' })
  draftId!: string;

  @OneToOne(() => OnboardingDraft, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'draft_id' })
  draft!: OnboardingDraft;

  @Column({ name: 'viewport_x', type: 'float', default: 24 })
  viewportX!: number;

  @Column({ name: 'viewport_y', type: 'float', default: 24 })
  viewportY!: number;

  @Column({ name: 'viewport_zoom', type: 'float', default: 0.82 })
  viewportZoom!: number;

  @OneToMany(() => WorkshopObject, (object) => object.workshop)
  objects!: WorkshopObject[];

  @OneToMany(() => WorkshopConnection, (connection) => connection.workshop)
  connections!: WorkshopConnection[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
