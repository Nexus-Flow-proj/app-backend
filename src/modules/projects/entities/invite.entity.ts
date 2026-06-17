import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { User } from '../../users/entities/user.entity';
import { ProjectRole } from '../enums/project-role.enum';
import { InviteStatus } from '../enums/invite-status.enum';

@Entity('invites')
export class Invite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Project, (project) => project.invites, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => User, (user) => user.invites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invited_by' })
  invitedBy!: User;

  @Column({ type: 'varchar' })
  email!: string;

  @Column({ type: 'enum', enum: ProjectRole, default: ProjectRole.VIEWER })
  roleLabel!: ProjectRole;

  @Column({ type: 'varchar', unique: true })
  tokenHash!: string;

  @Column({ type: 'enum', enum: InviteStatus, default: InviteStatus.PENDING })
  status!: InviteStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;
}
