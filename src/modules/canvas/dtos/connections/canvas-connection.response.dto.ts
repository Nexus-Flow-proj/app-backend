import { CanvasConnectionType } from "@modules/canvas/enums/canvas-connection-type.enum";

export class CanvasConnectionResponseDto {
  id!: string;
  canvasId!: string;
  sourceObjectId!: string;
  targetObjectId!: string;
  type!: CanvasConnectionType;
  data!: Record<string, unknown> | null;
  createdAt!: Date;
  updatedAt!: Date;
}