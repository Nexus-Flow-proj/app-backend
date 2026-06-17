import { Expose } from 'class-transformer';
import { InviteStatus } from '../enums/invite-status.enum';
import { ProjectRole } from '../enums/project-role.enum';

export class InviteCreatedDto {
  @Expose()
  id!: string;

  @Expose()
  projectId!: string;

  @Expose()
  email!: string;

  @Expose()
  roleLabel!: ProjectRole;

  @Expose()
  status!: InviteStatus;

  @Expose()
  token!: string;

  @Expose()
  createdAt!: Date;

  @Expose()
  expiresAt!: Date;
}
