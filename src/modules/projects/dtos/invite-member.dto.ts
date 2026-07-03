import { IsEmail, IsOptional, IsUUID } from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;
}
