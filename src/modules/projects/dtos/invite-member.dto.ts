import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { ProjectRole } from '../enums/project-role.enum';

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEnum(ProjectRole)
  roleLabel?: ProjectRole;
}
