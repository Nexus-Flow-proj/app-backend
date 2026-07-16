import { Type } from 'class-transformer';
import { IsArray, IsDefined, ValidateNested } from 'class-validator';
import { SaveWorkshopCanvasConnectionDto } from './save-workshop-canvas-connection.dto';
import { SaveWorkshopCanvasObjectDto } from './save-workshop-canvas-object.dto';
import { SaveWorkshopViewportDto } from './save-workshop-viewport.dto';

export class SaveWorkshopCanvasDto {
  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveWorkshopCanvasObjectDto)
  objects!: SaveWorkshopCanvasObjectDto[];

  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveWorkshopCanvasConnectionDto)
  connections!: SaveWorkshopCanvasConnectionDto[];

  @IsDefined()
  @ValidateNested()
  @Type(() => SaveWorkshopViewportDto)
  viewport!: SaveWorkshopViewportDto;
}
