import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { CanvasType } from '../enums/canvas-type.enum';
import { CanvasSettings } from '../interfaces/CanvasSettings.interface';

@Entity('canvases')
export class Canvas {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @Column({
    type: 'enum',
    enum: CanvasType,
  })
  type!: CanvasType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ name: 'viewport_x', type: 'float', default: 0 })
  viewportX!: number;

  @Column({ name: 'viewport_y', type: 'float', default: 0 })
  viewportY!: number;

  @Column({ name: 'viewport_zoom', type: 'float', default: 1 })
  viewportZoom!: number;

  @Column({ type: 'jsonb', nullable: true })
  settings!: CanvasSettings;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
