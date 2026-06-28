import { Project } from '@modules/projects/entities/project.entity';
import { User } from '@modules/users/entities/user.entity';
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
import { TaskType } from '../enums/task-type.enum';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { Board } from '@modules/boards/entities/board.entity';
import { SubTask } from './subtask.entity';
import { TaskComment } from './task-comment.entity';
import { TimeLog } from './time-log.entity';


export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

@Entity('tasks')
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

  @Column({ type: 'varchar' })
  label!: string;

  @Column({ type: 'date', nullable: true })
  deadline!: Date | null;

  @Column({ type: 'enum', enum: TaskType, default: TaskType.IMPROVEMENT })
  type: TaskType;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
  status: TaskStatus;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @ManyToOne(() => Board, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'board_column_id' })
  boardColumn: Board;

  @Column({ name: 'column_order', type: 'float' })
  columnOrder: number;

  @Column({ type: 'jsonb', default: [] })
  attachments: TaskAttachment[];

  @OneToMany(() => SubTask, (subtask) => subtask.task)
  subtasks: SubTask[];

  @OneToMany(() => TaskComment, (taskComment) => taskComment.task)
  comments: TaskComment[];

  @OneToMany(() => TimeLog, (timeLog) => timeLog.task)
  timeLogs!: TimeLog[];


  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
