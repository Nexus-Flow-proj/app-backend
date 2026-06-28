import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateBoardColumnDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  sortOrder?: number; // If omitted, auto-placed at end (last.sortOrder + 1000)

  @IsString()
  @IsOptional()
  color?: string;
}
