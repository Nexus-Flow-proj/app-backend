import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SaveWorkshopCanvasConnectionStyleDto } from './save-workshop-connection-style.dto';

export class SaveWorkshopCanvasConnectionDto {
  @IsUUID()
  id!: string;

  @IsUUID()
  fromObjectId!: string;

  @IsUUID()
  toObjectId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @ValidateNested()
  @Type(() => SaveWorkshopCanvasConnectionStyleDto)
  style!: SaveWorkshopCanvasConnectionStyleDto;
}
