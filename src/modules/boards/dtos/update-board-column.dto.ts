import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateBoardColumnDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  sortOrder?: number;
}
