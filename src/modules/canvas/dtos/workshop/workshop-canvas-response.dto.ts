import { WorkshopCanvasConnectionDto } from './workshop-canvas-connection.dto';
import { WorkshopCanvasObjectDto } from './workshop-canvas-object.dto';
import { WorkshopViewportDto } from './workshop-viewport.dto';

export class WorkshopCanvasResponseDto {
  id!: string;
  draftId!: string;
  objects!: WorkshopCanvasObjectDto[];
  connections!: WorkshopCanvasConnectionDto[];
  viewport!: WorkshopViewportDto;
  createdAt!: Date;
  updatedAt!: Date;
}
