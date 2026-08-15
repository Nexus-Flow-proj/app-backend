import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class MiniConnectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  sourceObjectId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  targetObjectId!: string;

  @IsIn(['auto', 'top', 'right', 'bottom', 'left'])
  sourceAnchor!: 'auto' | 'top' | 'right' | 'bottom' | 'left';

  @IsIn(['auto', 'top', 'right', 'bottom', 'left'])
  targetAnchor!: 'auto' | 'top' | 'right' | 'bottom' | 'left';

  @IsIn(['straight', 'curved', 'elbow'])
  routing!: 'straight' | 'curved' | 'elbow';

  @IsString()
  @MaxLength(500)
  label!: string;

  @IsString()
  stroke!: string;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.001)
  strokeWidth!: number;

  @IsOptional()
  @IsArray()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { each: true })
  dash?: number[];
}
