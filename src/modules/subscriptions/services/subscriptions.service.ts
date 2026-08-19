import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Subscription } from '../entities/subscription.entity';
import { Plan } from '../entities/plan.entity';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { User } from '../../users/entities/user.entity';
import { PlanTier } from '../enums/plan-tier.enum';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { BillingInterval } from '../enums/billing-interval.enum';
import { CreateCheckoutSessionDto } from '../dtos/checkout-session.dto';
import {
  PlanDto,
  SubscriptionResponseDto,
} from '../dtos/subscription-response.dto';
import { StripeService } from './stripe.service';
import { PlanLimitsService } from './plan-limits.service';
import { StripeConfig } from '../../../config/stripe.config';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private readonly stripeConfig: StripeConfig;

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly stripeService: StripeService,
    private readonly planLimitsService: PlanLimitsService,
    private readonly configService: ConfigService,
  ) {
    this.stripeConfig = this.configService.get<StripeConfig>('stripe')!;
  }

  // ─── Plan & Subscription Retrieval ──────────────────────────────────────────

  async listPlans(): Promise<PlanDto[]> {
    const plans = await this.planRepo.find({
      order: { priceMonthlyUsdCents: 'ASC' },
    });

    return plans.map((p) => ({
      id: p.id,
      tier: p.tier,
      name: p.name,
      description: p.description,
      priceMonthlyUsdCents: p.priceMonthlyUsdCents,
      priceAnnualUsdCents: p.priceAnnualUsdCents,
      features: p.features,
    }));
  }

  async getMySubscription(userId: string): Promise<SubscriptionResponseDto> {
    const sub = await this.planLimitsService.getUserSubscription(userId);
    return this.toSubscriptionResponse(sub);
  }

  async createFreeSubscription(userId: string): Promise<Subscription> {
    return this.planLimitsService.getUserSubscription(userId);
  }

  // ─── Checkout & Billing Portal ──────────────────────────────────────────────

  async createCheckoutSession(
    userId: string,
    dto: CreateCheckoutSessionDto,
  ): Promise<{ checkoutUrl: string; sessionId: string }> {
    if (dto.tier === PlanTier.FREE) {
      throw new BadRequestException('Cannot create a checkout session for the Free plan.');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const targetPlan = await this.planRepo.findOne({
      where: { tier: dto.tier },
    });
    if (!targetPlan) {
      throw new NotFoundException(`Plan ${dto.tier} not found.`);
    }

    const sub = await this.planLimitsService.getUserSubscription(userId);

    // If user is already on this plan with active status
    if (
      sub.plan.tier === dto.tier &&
      (sub.status === SubscriptionStatus.ACTIVE ||
        sub.status === SubscriptionStatus.TRIALING)
    ) {
      throw new BadRequestException(
        `You are already subscribed to the ${targetPlan.name} plan.`,
      );
    }

    // Resolve or create Stripe customer
    let customerId = sub.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripeService.createCustomer({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
      customerId = customer.id;
      sub.stripeCustomerId = customerId;
      await this.subscriptionRepo.save(sub);
    }

    // Determine price ID from plan entity or config
    const interval = dto.interval || BillingInterval.MONTHLY;
    let priceId =
      interval === BillingInterval.ANNUAL
        ? targetPlan.stripeAnnualPriceId ||
          (dto.tier === PlanTier.PRO
            ? this.stripeConfig?.proPriceIdAnnual
            : this.stripeConfig?.businessPriceIdAnnual)
        : targetPlan.stripeMonthlyPriceId ||
          (dto.tier === PlanTier.PRO
            ? this.stripeConfig?.proPriceIdMonthly
            : this.stripeConfig?.businessPriceIdMonthly);

    if (!priceId) {
      // Fallback placeholder for dev/testing when Stripe price ID is not yet created in dashboard
      priceId = `price_${dto.tier.toLowerCase()}_${interval.toLowerCase()}`;
      this.logger.warn(
        `Stripe price ID not found in DB or config. Using fallback placeholder: "${priceId}". Set STRIPE_${dto.tier}_PRICE_ID in .env for production.`,
      );
    }

    // Determine trial eligibility: Pro offers 14-day trial if user hasn't had a paid subscription before
    let trialDays: number | undefined = undefined;
    if (dto.tier === PlanTier.PRO && targetPlan.features.trialDays > 0) {
      if (!sub.stripeSubscriptionId && !sub.trialStart) {
        trialDays = targetPlan.features.trialDays;
      }
    }

    const session = await this.stripeService.createCheckoutSession({
      customerId,
      priceId,
      userId: user.id,
      planTier: dto.tier,
      billingInterval: interval,
      trialDays,
    });

    return {
      checkoutUrl: session.url || '',
      sessionId: session.id,
    };
  }

  async createBillingPortalSession(
    userId: string,
  ): Promise<{ portalUrl: string }> {
    const sub = await this.planLimitsService.getUserSubscription(userId);

    if (!sub.stripeCustomerId) {
      throw new BadRequestException(
        'No billing history found. You have not subscribed to any paid plans yet.',
      );
    }

    const session = await this.stripeService.createBillingPortalSession(
      sub.stripeCustomerId,
    );

    return {
      portalUrl: session.url,
    };
  }

  async cancelSubscription(
    userId: string,
  ): Promise<SubscriptionResponseDto> {
    const sub = await this.planLimitsService.getUserSubscription(userId);

    if (!sub.stripeSubscriptionId) {
      throw new BadRequestException('No active paid subscription to cancel.');
    }

    await this.stripeService.cancelSubscription(
      sub.stripeSubscriptionId,
      true, // at period end
    );

    sub.cancelAtPeriodEnd = true;
    const saved = await this.subscriptionRepo.save(sub);
    this.planLimitsService.invalidateCache(userId);

    return this.toSubscriptionResponse(saved);
  }

  async getPaymentHistory(userId: string): Promise<Payment[]> {
    return this.paymentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Stripe Webhook Handlers ────────────────────────────────────────────────

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Handling Stripe webhook event: ${event.type} [${event.id}]`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutSessionCompleted(session);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleCustomerSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleCustomerSubscriptionDeleted(subscription);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handleInvoicePaymentSucceeded(invoice);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.handleInvoicePaymentFailed(invoice);
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const userId = session.metadata?.userId || (session.client_reference_id as string);
    const planTierStr = session.metadata?.planTier as PlanTier;
    const intervalStr = session.metadata?.billingInterval as BillingInterval;

    if (!userId || !planTierStr) {
      this.logger.warn(
        `Checkout session ${session.id} missing userId or planTier in metadata.`,
      );
      return;
    }

    const plan = await this.planRepo.findOne({
      where: { tier: planTierStr },
    });
    if (!plan) {
      this.logger.error(`Plan not found for tier: ${planTierStr}`);
      return;
    }

    let sub = await this.subscriptionRepo.findOne({
      where: { userId },
    });

    if (!sub) {
      sub = this.subscriptionRepo.create({ userId });
    }

    sub.plan = plan;
    sub.planId = plan.id;
    sub.status =
      session.subscription && typeof session.subscription !== 'string'
        ? (session.subscription.status.toUpperCase() as SubscriptionStatus)
        : SubscriptionStatus.ACTIVE;
    sub.stripeCustomerId = (session.customer as string) || sub.stripeCustomerId;
    sub.stripeSubscriptionId =
      (typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id) || sub.stripeSubscriptionId;
    sub.billingInterval = intervalStr || BillingInterval.MONTHLY;
    sub.cancelAtPeriodEnd = false;

    // If Stripe subscription details available, fetch and sync period dates
    if (sub.stripeSubscriptionId) {
      try {
        const stripeSub = await this.stripeService.retrieveSubscription(
          sub.stripeSubscriptionId,
        );
        const rawSub = stripeSub as any;
        sub.currentPeriodStart = rawSub.current_period_start
          ? new Date(rawSub.current_period_start * 1000)
          : new Date();
        sub.currentPeriodEnd = rawSub.current_period_end
          ? new Date(rawSub.current_period_end * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        sub.trialStart = rawSub.trial_start
          ? new Date(rawSub.trial_start * 1000)
          : null;
        sub.trialEnd = rawSub.trial_end
          ? new Date(rawSub.trial_end * 1000)
          : null;
        if (stripeSub.status === 'trialing') {
          sub.status = SubscriptionStatus.TRIALING;
        }
      } catch (err: any) {
        this.logger.warn(
          `Could not retrieve Stripe subscription ${sub.stripeSubscriptionId}: ${err.message}`,
        );
      }
    }

    await this.subscriptionRepo.save(sub);
    this.planLimitsService.invalidateCache(userId);
    this.logger.log(`User ${userId} successfully upgraded to ${planTierStr}`);
  }

  private async handleCustomerSubscriptionUpdated(
    stripeSub: Stripe.Subscription,
  ): Promise<void> {
    const sub = await this.subscriptionRepo.findOne({
      where: { stripeSubscriptionId: stripeSub.id },
    });

    if (!sub) {
      this.logger.warn(
        `Subscription with stripeSubscriptionId ${stripeSub.id} not found in DB.`,
      );
      return;
    }

    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      trialing: SubscriptionStatus.TRIALING,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      incomplete: SubscriptionStatus.INCOMPLETE,
    };

    const rawSub = stripeSub as any;
    sub.status = statusMap[stripeSub.status] || SubscriptionStatus.ACTIVE;
    sub.currentPeriodStart = rawSub.current_period_start
      ? new Date(rawSub.current_period_start * 1000)
      : sub.currentPeriodStart;
    sub.currentPeriodEnd = rawSub.current_period_end
      ? new Date(rawSub.current_period_end * 1000)
      : sub.currentPeriodEnd;
    sub.trialStart = rawSub.trial_start
      ? new Date(rawSub.trial_start * 1000)
      : null;
    sub.trialEnd = rawSub.trial_end
      ? new Date(rawSub.trial_end * 1000)
      : null;
    sub.cancelAtPeriodEnd = rawSub.cancel_at_period_end || false;

    await this.subscriptionRepo.save(sub);
    this.planLimitsService.invalidateCache(sub.userId);
    this.logger.log(`Subscription for user ${sub.userId} updated to ${sub.status}`);
  }

  private async handleCustomerSubscriptionDeleted(
    stripeSub: Stripe.Subscription,
  ): Promise<void> {
    const sub = await this.subscriptionRepo.findOne({
      where: { stripeSubscriptionId: stripeSub.id },
    });

    if (!sub) {
      this.logger.warn(
        `Subscription with stripeSubscriptionId ${stripeSub.id} not found to downgrade.`,
      );
      return;
    }

    const freePlan = await this.planRepo.findOne({
      where: { tier: PlanTier.FREE },
    });

    if (freePlan) {
      sub.plan = freePlan;
      sub.planId = freePlan.id;
    }

    sub.status = SubscriptionStatus.ACTIVE;
    sub.stripeSubscriptionId = null;
    sub.cancelAtPeriodEnd = false;
    sub.billingInterval = null;

    await this.subscriptionRepo.save(sub);
    this.planLimitsService.invalidateCache(sub.userId);
    this.logger.log(`Subscription for user ${sub.userId} cancelled. Downgraded to Free.`);
  }

  private async handleInvoicePaymentSucceeded(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const rawInvoice = invoice as any;
    const customerId = rawInvoice.customer as string;
    const sub = await this.subscriptionRepo.findOne({
      where: { stripeCustomerId: customerId },
    });

    if (!sub) {
      this.logger.warn(`No subscription found for customer ${customerId}`);
      return;
    }

    const payment = this.paymentRepo.create({
      userId: sub.userId,
      subscriptionId: sub.id,
      stripePaymentIntentId:
        typeof rawInvoice.payment_intent === 'string'
          ? rawInvoice.payment_intent
          : rawInvoice.payment_intent?.id || null,
      stripeInvoiceId: rawInvoice.id,
      amountCents: rawInvoice.amount_paid,
      currency: rawInvoice.currency,
      status: PaymentStatus.SUCCEEDED,
      invoiceUrl: rawInvoice.hosted_invoice_url || null,
      receiptUrl: rawInvoice.invoice_pdf || null,
    });

    await this.paymentRepo.save(payment);
    this.logger.log(
      `Payment succeeded for user ${sub.userId}: $${(rawInvoice.amount_paid / 100).toFixed(2)}`,
    );
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const rawInvoice = invoice as any;
    const customerId = rawInvoice.customer as string;
    const sub = await this.subscriptionRepo.findOne({
      where: { stripeCustomerId: customerId },
    });

    if (!sub) return;

    const payment = this.paymentRepo.create({
      userId: sub.userId,
      subscriptionId: sub.id,
      stripePaymentIntentId:
        typeof rawInvoice.payment_intent === 'string'
          ? rawInvoice.payment_intent
          : rawInvoice.payment_intent?.id || null,
      stripeInvoiceId: rawInvoice.id,
      amountCents: rawInvoice.amount_due,
      currency: rawInvoice.currency,
      status: PaymentStatus.FAILED,
      invoiceUrl: rawInvoice.hosted_invoice_url || null,
    });

    await this.paymentRepo.save(payment);

    sub.status = SubscriptionStatus.PAST_DUE;
    await this.subscriptionRepo.save(sub);
    this.planLimitsService.invalidateCache(sub.userId);

    this.logger.warn(
      `Payment failed for user ${sub.userId}. Status set to PAST_DUE.`,
    );
  }

  // ─── Monthly Usage Reset Cron ────────────────────────────────────────────────

  /**
   * Daily cron job running at midnight to reset monthly AI usage counters for all subscriptions
   * whose cycle has reached 30 days.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetMonthlyAIUsageCron(): Promise<void> {
    this.logger.log('Running daily cron: Checking subscriptions for monthly AI quota reset...');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.subscriptionRepo
      .createQueryBuilder()
      .update(Subscription)
      .set({
        aiOnboardingGenerationsUsed: 0,
        aiChatMessagesUsed: 0,
        aiTaskActionsUsed: 0,
        aiTotalRequestsUsed: 0,
        aiUsageResetAt: new Date(),
      })
      .where('ai_usage_reset_at <= :thirtyDaysAgo', { thirtyDaysAgo })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Reset AI usage quotas for ${result.affected} subscriptions.`);
    }
  }

  // ─── Mapper Helper ──────────────────────────────────────────────────────────

  private toSubscriptionResponse(sub: Subscription): SubscriptionResponseDto {
    return {
      id: sub.id,
      userId: sub.userId,
      plan: {
        id: sub.plan.id,
        tier: sub.plan.tier,
        name: sub.plan.name,
        description: sub.plan.description,
        priceMonthlyUsdCents: sub.plan.priceMonthlyUsdCents,
        priceAnnualUsdCents: sub.plan.priceAnnualUsdCents,
        features: sub.plan.features,
      },
      status: sub.status,
      billingInterval: sub.billingInterval,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialStart: sub.trialStart,
      trialEnd: sub.trialEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      usage: {
        aiOnboardingGenerationsUsed: sub.aiOnboardingGenerationsUsed,
        aiChatMessagesUsed: sub.aiChatMessagesUsed,
        aiTaskActionsUsed: sub.aiTaskActionsUsed,
        aiTotalRequestsUsed: sub.aiTotalRequestsUsed,
        aiUsageResetAt: sub.aiUsageResetAt,
      },
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    };
  }
}
