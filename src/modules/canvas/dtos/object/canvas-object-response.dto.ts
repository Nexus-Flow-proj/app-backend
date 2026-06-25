import { CanvasObjectType } from '../../enums/canvas-object-type.enum';
import { CanvasObjectTaskSummaryDto } from './canvas-object-task-summary.dto';

export class CanvasObjectResponseDto {
  id!: string;
  canvasId!: string;
  taskId!: string | null;
  task!: CanvasObjectTaskSummaryDto | null;
  type!: CanvasObjectType;
  x!: number;
  y!: number;
  width!: number;
  height!: number;
  zIndex!: number;
  data!: Record<string, unknown> | null;
  createdAt!: Date;
  updatedAt!: Date;
}