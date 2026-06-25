import { IsNumber, Min } from 'class-validator';

export class UpdateCanvasViewportDto {
  @IsNumber()
  viewportX!: number;

  @IsNumber()
  viewportY!: number;

  @IsNumber()
  @Min(0.1)
  viewportZoom!: number;
}