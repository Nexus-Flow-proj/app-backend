import {
  Column,
  OneToMany,
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

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'first_name' })
  firstName!: string;

  @Column({ name: 'last_name' })
  lastName!: string;

  @Column({ nullable: true })
  title!: string;

  @Column({ type: 'text', nullable: true })
  bio!: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl!: string;

  @Column({ name: 'password_hash', nullable: true, select: false })
  passwordHash!: string;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
