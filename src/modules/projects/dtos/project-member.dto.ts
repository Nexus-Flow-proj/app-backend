import { Expose, Type } from 'class-transformer';
import { ProjectRole } from '../enums/project-role.enum';
import { RolePermissions } from '../entities/project-role.entity';

export class MemberRoleDto {
  @Expose()
  id!: string;

  @Expose()
  projectId!: string;

  @Expose()
  name!: string;

  @Expose()
  description!: string | null;

  @Expose()
  level!: number;

  @Expose()
  permissions!: RolePermissions;

  @Expose()
  isSystemRole!: boolean;
}

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
  roleId!: string;

  @Expose()
  @Type(() => MemberRoleDto)
  role!: MemberRoleDto;

  @Expose()
  roleLabel?: ProjectRole;

  @Expose()
  @Type(() => Date)
  lastVisitedAt!: Date | null;

  @Expose()
  isAdmin?: boolean;

  @Expose()
  joinedAt!: Date;
}
