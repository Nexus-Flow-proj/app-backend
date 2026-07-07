import { IsUUID } from 'class-validator';

export class ProjectRoomDto {
  @IsUUID()
  projectId!: string;
}