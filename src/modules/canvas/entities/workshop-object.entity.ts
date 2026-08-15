import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Workshop } from './workshop.entity';
import { CanvasObjectType } from '../enums/canvas-object-type.enum';

@Entity('workshop_objects')
export class WorkshopObject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workshop_id', type: 'uuid' })
  workshopId!: string;

  @ManyToOne(() => Workshop, (workshop) => workshop.objects, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workshop_id' })
  workshop!: Workshop;

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

  @Column({ type: 'float', default: 0 })
  rotation!: number;

  @Column({ name: 'z_index', type: 'int', default: 0 })
  zIndex!: number;

  @Column({ type: 'jsonb', nullable: true })
  data!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
