import { Project } from '@modules/projects/entities/project.entity';
import { User } from '@modules/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaskType } from '../enums/task-type.enum';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { TaskSource } from '../enums/task-source.enum';
import { Board } from '@modules/boards/entities/board.entity';
import { SubTask } from './subtask.entity';
import { TaskComment } from './task-comment.entity';
import { TimeLog } from './time-log.entity';

export interface ApiUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface ApiAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  uploadedBy: ApiUserSummary;
  created_at: string;
}

export interface TaskDependencySummary {
  id: string;
  title: string;
}

@Entity('tasks')
@Index(['project', 'columnOrder'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  createdBy!: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignee_id' })
  assignee!: User | null;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', nullable: true })
  label!: string | null;

  @Column({ type: 'date', nullable: true })
  deadline!: Date | null;

  @Column({ type: 'enum', enum: TaskType, default: TaskType.IMPROVEMENT })
  type: TaskType;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @ManyToMany(() => Task)
  @JoinTable({
    name: 'task_dependencies',
    joinColumn: { name: 'task_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'dependency_id', referencedColumnName: 'id' },
  })
  dependencies: Task[];

  @ManyToOne(() => Board, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'board_column_id' })
  boardColumn: Board;

  @Column({ name: 'column_order', type: 'float' })
  columnOrder: number;

  @Column({ type: 'enum', enum: TaskSource, default: TaskSource.MANUAL })
  source: TaskSource;

  @Column({ type: 'jsonb', default: [] })
  attachments: ApiAttachment[];

  @Column({ type: 'jsonb', nullable: true, default: null })
  metadata!: Record<string, any> | null;

  @Column({ name: 'generation_job_id', type: 'uuid', nullable: true })
  generationJobId!: string | null;

  @OneToMany(() => SubTask, (subtask) => subtask.task)
  subtasks: SubTask[];

  @OneToMany(() => TaskComment, (taskComment) => taskComment.task)
  comments: TaskComment[];

  @OneToMany(() => TimeLog, (timeLog) => timeLog.task)
  timeLogs!: TimeLog[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
