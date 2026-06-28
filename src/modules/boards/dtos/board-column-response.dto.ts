import { Expose } from 'class-transformer';

export class BoardColumnResponseDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  sortOrder!: number;

  @Expose()
  isProtected!: boolean;

  @Expose()
  color!: string;

  @Expose()
  createdAt!: Date;
}
