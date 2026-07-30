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
import { WorkshopObject } from './workshop-object.entity';
import { CanvasConnectionType } from '../enums/canvas-connection-type.enum';

@Entity('workshop_connections')
export class WorkshopConnection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workshop_id', type: 'uuid' })
  workshopId!: string;

  @ManyToOne(() => Workshop, (workshop) => workshop.connections, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workshop_id' })
  workshop!: Workshop;

  @Column({ name: 'source_object_id', type: 'uuid' })
  sourceObjectId!: string;

  @ManyToOne(() => WorkshopObject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_object_id' })
  sourceObject!: WorkshopObject;

  @Column({ name: 'target_object_id', type: 'uuid' })
  targetObjectId!: string;

  @ManyToOne(() => WorkshopObject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_object_id' })
  targetObject!: WorkshopObject;

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
