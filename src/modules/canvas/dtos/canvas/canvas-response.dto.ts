import { UserResponseDto } from '@modules/users/dtos/user-response.dto';
import { CanvasType } from '@modules/canvas/enums/canvas-type.enum';
import { CanvasSettings } from './../../interfaces/CanvasSettings.interface';

export class CanvasResponseDto {
  id!: string;
  projectId!: string;
  owner!: UserResponseDto;
  type!: CanvasType;
  name!: string | null;
  description!: string | null;
  viewportX!: number;
  viewportY!: number;
  viewportZoom!: number;
  settings!: CanvasSettings | null;
  createdAt!: Date;
  updatedAt!: Date;
}