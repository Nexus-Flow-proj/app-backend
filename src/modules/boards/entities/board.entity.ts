import { Project } from '@modules/projects/entities/project.entity';
import { Task } from '@modules/tasks/entities/task.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('board_columns')
@Index(['project', 'sortOrder'])
@Index(['project', 'name'])
export class BoardColumn {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'sort_order', type: 'float' })
  sortOrder!: number;

  @Column({ name: 'is_protected', type: 'boolean', default: false })
  isProtected!: boolean;

  @Column({ type: 'varchar', length: 20 })
  color!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Task, (task) => task.boardColumn)
  tasks!: Task[];
}

export { BoardColumn as Board };

