import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsUUID, Min, ValidateNested } from 'class-validator';

class ColumnOrderItem {
  @IsUUID()
  id!: string;

  @IsNumber()
  @Min(0)
  sortOrder!: number;
}

export class ReorderBoardColumnsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColumnOrderItem)
  columns!: ColumnOrderItem[];
}
