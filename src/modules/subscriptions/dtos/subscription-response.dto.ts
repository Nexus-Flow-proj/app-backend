import { PlanTier } from '../enums/plan-tier.enum';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { BillingInterval } from '../enums/billing-interval.enum';
import { PlanFeatures } from '../entities/plan.entity';

export interface PlanDto {
  id: string;
  tier: PlanTier;
  name: string;
  description: string | null;
  priceMonthlyUsdCents: number;
  priceAnnualUsdCents: number;
  features: PlanFeatures;
}

export interface SubscriptionUsageDto {
  aiOnboardingGenerationsUsed: number;
  aiChatMessagesUsed: number;
  aiTaskActionsUsed: number;
  aiTotalRequestsUsed: number;
  aiUsageResetAt: Date;
}

export interface SubscriptionResponseDto {
  id: string;
  userId: string;
  plan: PlanDto;
  status: SubscriptionStatus;
  billingInterval: BillingInterval | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  usage: SubscriptionUsageDto;
  createdAt: Date;
  updatedAt: Date;
}
