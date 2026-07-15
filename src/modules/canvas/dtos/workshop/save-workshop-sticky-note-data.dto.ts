import { IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator';

export class SaveWorkshopStickyNoteDataDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  kind!: 'Note';

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  color!: string;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  fontSize!: number;
}
