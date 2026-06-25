import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { CanvasObjectType } from '../../enums/canvas-object-type.enum';

export class CreateCanvasObjectDto {
  @IsEnum(CanvasObjectType)
  type!: CanvasObjectType;

  @ValidateIf((dto) => dto.type === CanvasObjectType.TASK)
  @IsUUID()
  taskId?: string;

  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  width!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  height?: number;

  @IsOptional()
  @IsNumber()
  zIndex?: number;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}