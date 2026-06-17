import { Expose } from 'class-transformer';
import { ProjectRole } from '../enums/project-role.enum';

export class ProjectMemberDto {
  @Expose()
  id!: string;

  @Expose()
  projectId!: string;

  @Expose()
  userId!: string;

  @Expose()
  email!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  title!: string | null;

  @Expose()
  avatarUrl!: string | null;

  @Expose()
  roleLabel!: ProjectRole;

  @Expose()
  isAdmin!: boolean;

  @Expose()
  joinedAt!: Date;
}