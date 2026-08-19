import { SetMetadata } from '@nestjs/common';
import { PlanTier } from '../enums/plan-tier.enum';

export const REQUIRE_PLAN_KEY = 'require_plan';

/**
 * Decorator to require a minimum plan tier to access an endpoint.
 *
 * @example
 * @RequirePlan(PlanTier.PRO)
 */
export const RequirePlan = (tier: PlanTier) =>
  SetMetadata(REQUIRE_PLAN_KEY, tier);
