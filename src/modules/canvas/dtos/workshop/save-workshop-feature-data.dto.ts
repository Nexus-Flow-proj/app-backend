import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveWorkshopFeatureDataDto {
  @IsOptional()
  @IsString()
  @MaxLength(36)
  boardColumnId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  kind!: 'Feature';

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  backgroundColor!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  borderColor!: string;
}
