import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class MiniImageAssetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  id!: string;

  @IsIn(['image/png', 'image/webp'])
  mimeType!: string;

  @IsString()
  @IsNotEmpty()
  dataUrl!: string;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1)
  width!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1)
  height!: number;

  @IsString()
  @MaxLength(255)
  name!: string;
}
