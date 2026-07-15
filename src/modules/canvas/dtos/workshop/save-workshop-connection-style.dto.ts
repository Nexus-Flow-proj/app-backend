import { IsIn, IsNumber, IsString, MaxLength } from 'class-validator';

export class SaveWorkshopCanvasConnectionStyleDto {
  @IsString()
  @MaxLength(50)
  color!: string;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  strokeWidth!: number;

  @IsIn(['ARROW', 'LINE', 'DASHED'])
  type!: 'ARROW' | 'LINE' | 'DASHED';
}
