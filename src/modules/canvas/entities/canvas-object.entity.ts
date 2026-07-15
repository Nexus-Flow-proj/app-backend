import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Canvas } from './canvas.entity';
import { CanvasObjectType } from '../enums/canvas-object-type.enum';
import { Task } from '@modules/tasks/entities/task.entity';
import { Board } from '@modules/boards/entities/board.entity';

@Entity('canvas_objects')
export class CanvasObject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'canvas_id', type: 'uuid' })
  canvasId!: string;

  @ManyToOne(() => Canvas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'canvas_id' })
  canvas!: Canvas;

  @Column({ name: 'task_id', type: 'uuid', nullable: true })
  taskId!: string | null;

  @ManyToOne(() => Task, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'task_id' })
  task!: Task | null;

  @Column({ type: 'float', default: 0 })
  rotation!: number;

  @Column({
    type: 'enum',
    enum: CanvasObjectType,
  })
  type!: CanvasObjectType;

  @Column({ type: 'float' })
  x!: number;

  @Column({ type: 'float' })
  y!: number;

  @Column({ type: 'float', default: 200 })
  width!: number;

  @Column({ type: 'float', default: 120 })
  height!: number;

  @Column({ name: 'z_index', type: 'int', default: 0 })
  zIndex!: number;

  @Column({ name: 'board_column_id', type: 'uuid', nullable: true })
  boardColumnId!: string | null;

  @ManyToOne(() => Board, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'board_column_id' })
  boardColumn!: Board | null;

  @Column({ type: 'jsonb', nullable: true })
  data!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
