export class WorkshopCanvasConnectionStyleDto {
  color!: string;
  strokeWidth!: number;
  type!: 'ARROW' | 'LINE' | 'DASHED';
}

export class WorkshopCanvasConnectionDto {
  id!: string;
  fromObjectId!: string;
  toObjectId!: string;
  label?: string;
  style!: WorkshopCanvasConnectionStyleDto;
}
