import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlanTier } from '../enums/plan-tier.enum';

/**
 * Represents the features and limits of a subscription plan.
 * Stored as a JSONB column so limits can be updated without migrations.
 */
export interface PlanFeatures {
  /** Max projects the owner can create. null = unlimited */
  maxProjectsOwned: number | null;
  /** Max members per project the admin can invite. null = unlimited */
  maxMembersPerProject: number | null;
  /** Max tasks per project. null = unlimited */
  maxTasksPerProject: number | null;
  /** Max board columns per project. null = unlimited */
  maxBoardColumns: number | null;
  /** Max knowledge chunks per project. null = unlimited */
  maxKnowledgeChunks: number | null;
  /** Monthly AI onboarding generations (personal quota). null = unlimited */
  aiOnboardingGenerations: number | null;
  /** Monthly AI chat messages (personal quota). null = unlimited */
  aiChatMessages: number | null;
  /** Monthly AI task actions — assign/breakdown/description (personal quota). null = unlimited */
  aiTaskActions: number | null;
  /** AI requests allowed for free-tier users in ANY non-Business project */
  freeTierAiRequestsPerMonth: number;
  /** Whether knowledge base is enabled for projects owned by this plan */
  knowledgeBaseEnabled: boolean;
  /** Whether realtime WebSocket is enabled for projects owned by this plan */
  realtimeEnabled: boolean;
  /** Whether custom role creation is enabled for projects owned by this plan */
  customRolesEnabled: boolean;
  /** Activity log retention in days */
  activityRetentionDays: number;
  /** Trial days offered on first upgrade to this plan */
  trialDays: number;
}

/**
 * Static plan definitions. These rows are seeded at migration time and
 * are not modified by application logic at runtime.
 */
@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: PlanTier, unique: true })
  tier!: PlanTier;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** Price in USD cents for monthly billing */
  @Column({ name: 'price_monthly_cents', type: 'int', default: 0 })
  priceMonthlyUsdCents!: number;

  /** Price in USD cents for annual billing (pre-calculated as 12 * monthly * 0.8) */
  @Column({ name: 'price_annual_cents', type: 'int', default: 0 })
  priceAnnualUsdCents!: number;

  /** Stripe Price ID for monthly billing */
  @Column({ name: 'stripe_monthly_price_id', type: 'varchar', nullable: true })
  stripeMonthlyPriceId!: string | null;

  /** Stripe Price ID for annual billing */
  @Column({ name: 'stripe_annual_price_id', type: 'varchar', nullable: true })
  stripeAnnualPriceId!: string | null;

  /** All plan limits and feature flags */
  @Column({ type: 'jsonb' })
  features!: PlanFeatures;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
