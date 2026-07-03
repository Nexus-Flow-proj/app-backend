import { IsUUID } from 'class-validator';

export class UpdateProjectMemberDto {
  @IsUUID()
  roleId!: string;
}
