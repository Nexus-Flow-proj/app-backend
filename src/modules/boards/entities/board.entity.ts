import { Project } from '@modules/projects/entities/project.entity';
import { Task } from '@modules/tasks/entities/task.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('board_columns')
export class Board {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ name: 'sort_order', type: 'float' })
  sortOrder!: number;

  @Column({ name: 'is_protected', type: 'boolean', default: false })
  isProtected!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => Task, (task) => task.boardId)
  tasks!: Task[];
}
