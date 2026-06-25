import { Expose } from 'class-transformer';
import { ProjectStatus } from '../enums/project-status.enum';

export class ProjectDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  description!: string | null;

  @Expose()
  deadline!: Date | null;

  @Expose()
  status!: ProjectStatus;

  @Expose()
  adminId!: string | null;

  @Expose()
  memberCount!: number;

  @Expose()
  color: string;

  @Expose()
  created_at!: Date;

  @Expose()
  updated_at!: Date;
}
