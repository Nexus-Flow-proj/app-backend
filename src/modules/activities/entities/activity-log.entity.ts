import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';
import { Project } from '@modules/projects/entities/project.entity';

@Entity('activity_logs')
@Index(['project', 'createdAt'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'actor_id' })
  actor!: User;

  @Column({ type: 'varchar' })
  message!: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'project_id' })
  project!: Project | null;

  @Column({ type: 'varchar', nullable: true, name: 'project_name' })
  projectName!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'entity_type' })
  entityType!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'entity_id' })
  entityId!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
