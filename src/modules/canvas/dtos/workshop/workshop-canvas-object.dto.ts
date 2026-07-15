import { FeatureDataDto } from './feature-data.dto';
import { StickyNoteDataDto } from './sticky-note-data.dto';
import { TaskDataDto } from './task-data.dto';

export class WorkshopCanvasObjectDto {
  id!: string;
  type!: 'SECTION_FRAME' | 'TASK_CARD' | 'STICKY_NOTE';
  x!: number;
  y!: number;
  width!: number;
  height!: number;
  rotation!: number;
  zIndex!: number;
  data!: FeatureDataDto | TaskDataDto | StickyNoteDataDto;
}
