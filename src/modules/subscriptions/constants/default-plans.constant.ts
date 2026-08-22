import { PlanTier } from '../enums/plan-tier.enum';
import { PlanFeatures } from '../entities/plan.entity';

export interface DefaultPlanDefinition {
  tier: PlanTier;
  name: string;
  description: string;
  priceMonthlyUsdCents: number;
  priceAnnualUsdCents: number;
  stripeMonthlyPriceId: string | null;
  stripeAnnualPriceId: string | null;
  features: PlanFeatures;
}

export const DEFAULT_PLANS: DefaultPlanDefinition[] = [
  {
    tier: PlanTier.FREE,
    name: 'Free',
    description:
      'Essential project management tools for individuals and small teams.',
    priceMonthlyUsdCents: 0,
    priceAnnualUsdCents: 0,
    stripeMonthlyPriceId: null,
    stripeAnnualPriceId: null,
    features: {
      maxProjectsOwned: 3,
      maxMembersPerProject: 5,
      maxTasksPerProject: 100,
      maxBoardColumns: 3,
      maxKnowledgeChunks: null,
      aiOnboardingGenerations: null,
      aiChatMessages: null,
      aiTaskActions: null,
      freeTierAiRequestsPerMonth: 3,
      knowledgeBaseEnabled: false,
      realtimeEnabled: false,
      customRolesEnabled: false,
      maxCustomRoles: 1,
      activityRetentionDays: 7,
      trialDays: 0,
    },
  },
  {
    tier: PlanTier.PRO,
    name: 'Pro',
    description:
      'Advanced AI generation, higher limits, custom roles, and knowledge base for growing teams.',
    priceMonthlyUsdCents: 1200,
    priceAnnualUsdCents: 11520,
    stripeMonthlyPriceId: null,
    stripeAnnualPriceId: null,
    features: {
      maxProjectsOwned: 5,
      maxMembersPerProject: 5,
      maxTasksPerProject: 2000,
      maxBoardColumns: null,
      maxKnowledgeChunks: 40,
      aiOnboardingGenerations: 6,
      aiChatMessages: 40,
      aiTaskActions: 20,
      freeTierAiRequestsPerMonth: 3,
      knowledgeBaseEnabled: true,
      realtimeEnabled: true,
      customRolesEnabled: true,
      maxCustomRoles: null,
      activityRetentionDays: 90,
      trialDays: 14,
    },
  },
  {
    tier: PlanTier.BUSINESS,
    name: 'Business',
    description:
      'Unlimited power, enterprise AI capabilities, and unlimited collaboration for large organizations.',
    priceMonthlyUsdCents: 15000,
    priceAnnualUsdCents: 144000,
    stripeMonthlyPriceId: null,
    stripeAnnualPriceId: null,
    features: {
      maxProjectsOwned: null,
      maxMembersPerProject: null,
      maxTasksPerProject: null,
      maxBoardColumns: null,
      maxKnowledgeChunks: null,
      aiOnboardingGenerations: null,
      aiChatMessages: null,
      aiTaskActions: null,
      freeTierAiRequestsPerMonth: 3,
      knowledgeBaseEnabled: true,
      realtimeEnabled: true,
      customRolesEnabled: true,
      maxCustomRoles: null,
      activityRetentionDays: 365,
      trialDays: 0,
    },
  },
];
