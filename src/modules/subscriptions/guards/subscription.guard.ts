import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PLAN_KEY } from '../decorators/require-plan.decorator';
import { PlanTier } from '../enums/plan-tier.enum';
import { PlanLimitsService } from '../services/plan-limits.service';
import { PaymentRequiredException } from '../exceptions/payment-required.exception';

const PLAN_RANK: Record<PlanTier, number> = {
  [PlanTier.FREE]: 0,
  [PlanTier.PRO]: 1,
  [PlanTier.BUSINESS]: 2,
};

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTier = this.reflector.getAllAndOverride<PlanTier | undefined>(
      REQUIRE_PLAN_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredTier) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      return false;
    }

    const requiredRank = PLAN_RANK[requiredTier] ?? 0;

    // 1. If inside a project context, check project admin's plan
    const projectId = request.params?.projectId;
    if (projectId) {
      const projectPlan =
        await this.planLimitsService.getProjectEffectivePlan(projectId);
      const projectRank = PLAN_RANK[projectPlan.tier] ?? 0;
      if (projectRank >= requiredRank) {
        return true;
      }
    }

    // 2. Check user's personal subscription
    const userSub = await this.planLimitsService.getUserSubscription(user.id);
    const userRank = PLAN_RANK[userSub.plan.tier] ?? 0;

    if (userRank >= requiredRank) {
      return true;
    }

    throw new PaymentRequiredException({
      code: 'PLAN_UPGRADE_REQUIRED',
      message: `This feature requires a ${requiredTier} plan or higher. Please upgrade to continue.`,
      requiredPlan: requiredTier,
      upgradeUrl: '/settings/billing',
    });
  }
}
