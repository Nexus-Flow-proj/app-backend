import { User } from '../../users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectMember } from './project-member.entity';
import { Invite } from './invite.entity';
import { ProjectStatus } from '../enums/project-status.enum';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'date', nullable: true })
  deadline!: Date | null;

  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.ACTIVE })
  status!: ProjectStatus;

  @Column({ type: 'varchar', default: '#d97706' })
  color: string;

  @OneToMany(() => ProjectMember, (member) => member.project)
  members!: ProjectMember[];

  @OneToMany(() => Invite, (invite) => invite.project)
  invites!: Invite[];

  @ManyToOne(() => User, (user) => user.ownedProjects, {
    onDelete: 'RESTRICT',
    nullable: true,
  })
  @JoinColumn({ name: 'admin_id' })
  admin!: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
