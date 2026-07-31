import { Transform, plainToInstance, Type } from 'class-transformer';
import { IsNumber, IsIn, IsUUID, ValidateNested } from 'class-validator';
import { SaveWorkshopFeatureDataDto } from './save-workshop-feature-data.dto';
import { SaveWorkshopTaskDataDto } from './save-workshop-task-data.dto';
import { SaveWorkshopStickyNoteDataDto } from './save-workshop-sticky-note-data.dto';

export class SaveWorkshopCanvasObjectDto {
  @IsUUID()
  id!: string;

  @IsIn(['SECTION_FRAME', 'TASK_CARD', 'STICKY_NOTE'])
  type!: 'SECTION_FRAME' | 'TASK_CARD' | 'STICKY_NOTE';

  @IsNumber({ allowNaN: false, allowInfinity: false })
  x!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  y!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  width!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  height!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  rotation!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  zIndex!: number;

  @ValidateNested()
  @Transform(({ obj, value }) => {
    if (!value || typeof value !== 'object') {
      return value;
    }

    switch (obj?.type) {
      case 'SECTION_FRAME':
        return plainToInstance(SaveWorkshopFeatureDataDto, value);
      case 'TASK_CARD':
        return plainToInstance(SaveWorkshopTaskDataDto, value);
      case 'STICKY_NOTE':
        return plainToInstance(SaveWorkshopStickyNoteDataDto, value);
      default:
        return value;
    }
  })
  data!:
    | SaveWorkshopFeatureDataDto
    | SaveWorkshopTaskDataDto
    | SaveWorkshopStickyNoteDataDto;
}
