import { SetMetadata } from '@nestjs/common';
import { PermissionCategory } from '@modules/projects/utils/project-auth.evaluator';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

export interface RequiredPermissionInfo {
  category: PermissionCategory;
  operation: string;
}

export const RequirePermission = (
  category: PermissionCategory,
  operation: string,
) => SetMetadata(REQUIRE_PERMISSION_KEY, { category, operation } as RequiredPermissionInfo);
