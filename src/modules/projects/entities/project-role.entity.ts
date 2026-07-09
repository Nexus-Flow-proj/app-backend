import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';

export interface RolePermissions {
  project: {
    read: boolean;
    updateSettings: boolean;
    deleteProject: boolean;
  };
  members: {
    invite: boolean;
    remove: boolean;
    changeRoles: boolean;
  };
  tasks: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    assign: boolean;
  };
  workshop: {
    read: boolean;
    createNodes: boolean;
    updateNodes: boolean;
    deleteNodes: boolean;
    generateWithAi: boolean;
  };
  board: {
    read: boolean;
    moveTasks: boolean;
    manageColumns: boolean;
  };
  roles: {
    create: boolean;
    update: boolean;
    delete: boolean;
  };
}


@Entity('project_roles')
@Unique(['project', 'name'])
@Unique(['project', 'level'])
export class ProjectRole {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Project, (project) => project.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'int' })
  level!: number;

  @Column({ type: 'jsonb' })
  permissions!: RolePermissions;

  @Column({ type: 'boolean', name: 'is_system_role', default: false })
  isSystemRole!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
