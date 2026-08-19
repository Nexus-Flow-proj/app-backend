import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Plan } from './plan.entity';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { BillingInterval } from '../enums/billing-interval.enum';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User, (user) => user.subscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @ManyToOne(() => Plan, { eager: true })
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status!: SubscriptionStatus;

  @Column({
    name: 'billing_interval',
    type: 'enum',
    enum: BillingInterval,
    nullable: true,
  })
  billingInterval!: BillingInterval | null;

  @Index()
  @Column({ name: 'stripe_customer_id', type: 'varchar', nullable: true })
  stripeCustomerId!: string | null;

  @Index()
  @Column({ name: 'stripe_subscription_id', type: 'varchar', nullable: true })
  stripeSubscriptionId!: string | null;

  @Column({ name: 'current_period_start', type: 'timestamptz', nullable: true })
  currentPeriodStart!: Date | null;

  @Column({ name: 'current_period_end', type: 'timestamptz', nullable: true })
  currentPeriodEnd!: Date | null;

  @Column({ name: 'trial_start', type: 'timestamptz', nullable: true })
  trialStart!: Date | null;

  @Column({ name: 'trial_end', type: 'timestamptz', nullable: true })
  trialEnd!: Date | null;

  @Column({ name: 'cancel_at_period_end', type: 'boolean', default: false })
  cancelAtPeriodEnd!: boolean;

  // --- Internal Monthly AI Usage Tracking ---
  @Column({ name: 'ai_onboarding_generations_used', type: 'int', default: 0 })
  aiOnboardingGenerationsUsed!: number;

  @Column({ name: 'ai_chat_messages_used', type: 'int', default: 0 })
  aiChatMessagesUsed!: number;

  @Column({ name: 'ai_task_actions_used', type: 'int', default: 0 })
  aiTaskActionsUsed!: number;

  @Column({ name: 'ai_total_requests_used', type: 'int', default: 0 })
  aiTotalRequestsUsed!: number;

  @Column({
    name: 'ai_usage_reset_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  aiUsageResetAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
