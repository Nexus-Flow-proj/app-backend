import { CanvasObjectType } from '../../enums/canvas-object-type.enum';

export class CanvasObjectResponseDto {
  id!: string;
  canvasId!: string;
  taskId!: string | null;
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