import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SaveWorkshopCanvasConnectionStyleDto } from './save-workshop-connection-style.dto';

export class SaveWorkshopCanvasConnectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fromObjectId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  toObjectId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @ValidateNested()
  @Type(() => SaveWorkshopCanvasConnectionStyleDto)
  style!: SaveWorkshopCanvasConnectionStyleDto;
}
