import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class MiniObjectStyleDto {
  @IsString()
  fill!: string;

  @IsString()
  stroke!: string;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  strokeWidth!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1)
  opacity!: number;

  @IsOptional()
  @IsArray()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { each: true })
  dash?: number[];

  @IsOptional()
  @IsString()
  fontFamily?: string;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1)
  fontSize?: number;

  @IsOptional()
  @IsIn([400, 500, 600, 700])
  fontWeight?: 400 | 500 | 600 | 700;

  @IsOptional()
  @IsIn(['left', 'center', 'right'])
  textAlign?: 'left' | 'center' | 'right';

  @IsOptional()
  @IsString()
  textColor?: string;
}
