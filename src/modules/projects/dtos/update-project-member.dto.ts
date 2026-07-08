import { IsUUID, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProjectMemberDto {
  @IsUUID()
  roleId!: string;
}

export class BulkMemberRoleAssignment {
  @IsUUID()
  memberId!: string;

  @IsUUID()
  roleId!: string;
}

export class BulkUpdateMemberRolesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => BulkMemberRoleAssignment)
  assignments!: BulkMemberRoleAssignment[];
}
