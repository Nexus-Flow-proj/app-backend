import { IsNotEmpty, IsUUID } from 'class-validator';

export class ProjectRoomDto {
  @IsNotEmpty()
  @IsUUID()
  projectId!: string;
}