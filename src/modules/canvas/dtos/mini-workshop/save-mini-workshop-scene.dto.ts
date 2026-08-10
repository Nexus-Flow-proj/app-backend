import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsNumber,
  IsObject,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MiniCanvasObjectDto } from './mini-canvas-object.dto';
import { MiniConnectionDto } from './mini-connection.dto';

export class MiniViewportDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  x!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  y!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.01)
  @Max(10)
  scale!: number;
}

export class SaveMiniWorkshopSceneDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => MiniViewportDto)
  viewport!: MiniViewportDto;

  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MiniCanvasObjectDto)
  objects!: MiniCanvasObjectDto[];

  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MiniConnectionDto)
  connections!: MiniConnectionDto[];

  @IsDefined()
  @IsObject()
  assets!: Record<string, any>;
}
