import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class MiniShapeDataDto {
  @IsIn(['rectangle', 'rounded-rectangle', 'ellipse', 'diamond', 'triangle'])
  shape!: 'rectangle' | 'rounded-rectangle' | 'ellipse' | 'diamond' | 'triangle';

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  text?: string;
}

export class MiniTextDataDto {
  @IsString()
  @MaxLength(10000)
  text!: string;
}

export class MiniStickyNoteDataDto {
  @IsString()
  @MaxLength(10000)
  text!: string;
}

export class MiniImageDataDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  assetId!: string;

  @IsString()
  @MaxLength(1000)
  alt!: string;
}

export class MiniFrameDataDto {
  @IsString()
  @MaxLength(1000)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;
}

export class MiniFreehandDataDto {
  @IsArray()
  points!: number[][];
}

export class MiniPersonalTaskDataDto {
  @IsString()
  @MaxLength(1000)
  title!: string;

  @IsString()
  @MaxLength(10000)
  description!: string;

  @IsBoolean()
  completed!: boolean;
}

export class MiniBoardTaskReferenceDataDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  sourceTaskId!: string;

  @IsString()
  @MaxLength(1000)
  title!: string;

  @IsString()
  @MaxLength(10000)
  description!: string;

  @IsString()
  @MaxLength(255)
  priority!: string;

  @IsString()
  @MaxLength(255)
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  assigneeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  dueDate?: string;

  @IsOptional()
  @IsBoolean()
  unavailable?: boolean;
}
