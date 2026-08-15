import { Expose, Type } from 'class-transformer';
import { ProjectStatus } from '../enums/project-status.enum';
import { ProjectMemberDto } from './project-member.dto';

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
  draftId!: string | null;

  @Expose()
  memberCount!: number;

  @Expose()
  color: string;

  @Expose()
  @Type(() => ProjectMemberDto)
  currentMember?: ProjectMemberDto;

  @Expose()
  created_at!: Date;

  @Expose()
  updated_at!: Date;
}
