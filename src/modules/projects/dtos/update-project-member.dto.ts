import { IsEnum } from 'class-validator';
import { ProjectRole } from '../enums/project-role.enum';

export class UpdateProjectMemberDto {
  @IsEnum(ProjectRole)
  roleLabel!: ProjectRole;
}
