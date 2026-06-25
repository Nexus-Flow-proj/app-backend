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
import { CanvasObject } from './canvas-object.entity';
import { CanvasConnectionType } from '../enums/canvas-connection-type.enum';

@Entity('canvas_connections')
export class CanvasConnection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'canvas_id', type: 'uuid' })
  canvasId!: string;

  @ManyToOne(() => Canvas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'canvas_id' })
  canvas!: Canvas;

  @Column({ name: 'source_object_id', type: 'uuid' })
  sourceObjectId!: string;

  @ManyToOne(() => CanvasObject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_object_id' })
  sourceObject!: CanvasObject;

  @Column({ name: 'target_object_id', type: 'uuid' })
  targetObjectId!: string;

  @ManyToOne(() => CanvasObject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_object_id' })
  targetObject!: CanvasObject;

  @Column({
    type: 'enum',
    enum: CanvasConnectionType,
    default: CanvasConnectionType.ARROW,
  })
  type!: CanvasConnectionType;

  @Column({ type: 'jsonb', nullable: true })
  data!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}