import { ProjectMember } from '../entities/project-member.entity';
import { RolePermissions } from '../entities/project-role.entity';

export type PermissionCategory = keyof RolePermissions;

type PermissionOperation<C extends PermissionCategory> =
  keyof RolePermissions[C] & string;

export class ProjectAuthEvaluator {
  static hasPermission<C extends PermissionCategory>(
    member: ProjectMember,
    category: C,
    operation: PermissionOperation<C>,
  ): boolean {
    if (!member || !member.role) return false;

    if (member.role.level === 100) return true;

    const permissions: RolePermissions = member.role.permissions;

    return !!permissions?.[category]?.[operation];
  }

  static canModifyMember(actor: ProjectMember, target: ProjectMember): boolean {
    if (!actor || !target) return false;

    if (actor.role.level === 100) return true;

    return actor.role.level > target.role.level;
  }
}
