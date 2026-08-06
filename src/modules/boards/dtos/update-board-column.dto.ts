import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdateBoardColumnDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  sortOrder?: number;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  color?: string;
}

