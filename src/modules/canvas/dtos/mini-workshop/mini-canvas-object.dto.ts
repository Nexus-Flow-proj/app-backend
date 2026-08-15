import { Transform, plainToInstance, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MiniObjectType } from '../../enums/mini-object-type.enum';
import { MiniObjectStyleDto } from './mini-object-style.dto';
import {
  MiniShapeDataDto,
  MiniTextDataDto,
  MiniStickyNoteDataDto,
  MiniImageDataDto,
  MiniFrameDataDto,
  MiniFreehandDataDto,
  MiniPersonalTaskDataDto,
  MiniBoardTaskReferenceDataDto,
} from './mini-object-data.dto';

export class MiniCanvasObjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  id!: string;

  @IsEnum(MiniObjectType)
  type!: MiniObjectType;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  x!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  y!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.001)
  width!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.001)
  height!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  rotation!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  zIndex!: number;

  @IsOptional()
  @IsString()
  groupId!: string | null;

  @IsBoolean()
  locked!: boolean;

  @ValidateNested()
  @Type(() => MiniObjectStyleDto)
  style!: MiniObjectStyleDto;

  @ValidateNested()
  @Transform(({ obj, value }) => {
    if (!value || typeof value !== 'object') {
      return value;
    }

    switch (obj?.type) {
      case MiniObjectType.SHAPE:
        return plainToInstance(MiniShapeDataDto, value);
      case MiniObjectType.TEXT:
        return plainToInstance(MiniTextDataDto, value);
      case MiniObjectType.STICKY_NOTE:
        return plainToInstance(MiniStickyNoteDataDto, value);
      case MiniObjectType.IMAGE:
        return plainToInstance(MiniImageDataDto, value);
      case MiniObjectType.FRAME:
        return plainToInstance(MiniFrameDataDto, value);
      case MiniObjectType.FREEHAND:
        return plainToInstance(MiniFreehandDataDto, value);
      case MiniObjectType.PERSONAL_TASK:
        return plainToInstance(MiniPersonalTaskDataDto, value);
      case MiniObjectType.BOARD_TASK_REFERENCE:
        return plainToInstance(MiniBoardTaskReferenceDataDto, value);
      default:
        return value;
    }
  })
  data!:
    | MiniShapeDataDto
    | MiniTextDataDto
    | MiniStickyNoteDataDto
    | MiniImageDataDto
    | MiniFrameDataDto
    | MiniFreehandDataDto
    | MiniPersonalTaskDataDto
    | MiniBoardTaskReferenceDataDto;
}
