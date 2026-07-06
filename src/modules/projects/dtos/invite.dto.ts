import { Expose } from 'class-transformer';
import { InviteStatus } from '../enums/invite-status.enum';
import { ProjectRole } from '../enums/project-role.enum';

export class InviteDto {
  @Expose()
  id!: string;

  @Expose()
  projectId!: string;

  @Expose()
  email!: string;

  @Expose()
  projectName!: string;

  @Expose()
  roleId!: string;

  @Expose()
  roleName!: string;

  @Expose()
  status!: InviteStatus;

  @Expose()
  createdAt!: Date;

  @Expose()
  expiresAt!: Date;
}
