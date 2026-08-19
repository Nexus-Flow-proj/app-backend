import {
  Column,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  CreateDateColumn,
  Entity,
} from 'typeorm';
import { Skill } from './skill.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { Invite } from '../../projects/entities/invite.entity';
import { Project } from '../../projects/entities/project.entity';
import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ name: 'first_name', type: 'varchar' })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar' })
  lastName!: string;

  @Column({ type: 'varchar', nullable: true })
  title!: string | null;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', nullable: true })
  avatarUrl!: string | null;

  @Column({ name: 'password_hash', type: 'varchar', nullable: true, select: false })
  passwordHash!: string | null;

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refreshTokens!: RefreshToken[];

  @OneToMany(() => Skill, (skill) => skill.user, {
    cascade: true,
  })
  skills!: Skill[];

  @Column({ name: 'google_id', type: 'varchar', nullable: true, unique: true })
  googleId!: string;

  @Column({
    name: 'reset_password_token_hash',
    type: 'varchar',
    nullable: true,
  })
  resetPasswordTokenHash!: string | null;

  @Column({ name: 'reset_password_expires', type: 'timestamp', nullable: true })
  resetPasswordExpires!: Date | null;

  @OneToMany(() => ProjectMember, (member) => member.user)
  projectMemberships!: ProjectMember[];

  @OneToMany(() => Invite, (invite) => invite.invitedBy)
  invites!: Invite[];

  @OneToMany(() => Project, (project) => project.admin)
  ownedProjects!: Project[];

  @OneToOne(() => Subscription, (sub) => sub.user)
  subscription!: Subscription;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
