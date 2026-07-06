import { Expose } from 'class-transformer';
import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { RolePermissions } from '../entities/project-role.entity';

export class CreateProjectRoleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  @Max(99)
  level!: number;

  @IsObject()
  @IsNotEmpty()
  permissions!: RolePermissions;
}

export class UpdateProjectRoleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(99)
  level?: number;

  @IsObject()
  @IsOptional()
  permissions?: RolePermissions;
}

export class ProjectRoleResponseDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  description!: string;

  @Expose()
  level!: number;

  @Expose()
  permissions!: RolePermissions;

  @Expose()
  isSystemRole!: boolean;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
