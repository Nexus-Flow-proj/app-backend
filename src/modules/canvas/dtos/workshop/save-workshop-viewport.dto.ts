import { IsNumber, Max, Min } from 'class-validator';

export class SaveWorkshopViewportDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  x!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  y!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.15)
  @Max(3)
  scale!: number;
}
