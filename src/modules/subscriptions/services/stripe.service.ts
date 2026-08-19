import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeConfig } from '../../../config/stripe.config';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripeClient: Stripe | null = null;
  private readonly stripeConfig: StripeConfig;

  constructor(private readonly configService: ConfigService) {
    this.stripeConfig = this.configService.get<StripeConfig>('stripe')!;
    if (this.stripeConfig?.secretKey) {
      this.stripeClient = new Stripe(this.stripeConfig.secretKey, {
        apiVersion: '2025-02-24.acacia' as any,
      });
    } else {
      this.logger.warn(
        'STRIPE_SECRET_KEY is not set. StripeService running in mock/disabled mode.',
      );
    }
  }

  private getClient(): Stripe {
    if (!this.stripeClient) {
      throw new InternalServerErrorException(
        'Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.',
      );
    }
    return this.stripeClient;
  }

  /**
   * Creates or retrieves a Stripe customer for a user
   */
  async createCustomer(user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }): Promise<Stripe.Customer> {
    const stripe = this.getClient();
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');

    return stripe.customers.create({
      email: user.email,
      name: name || undefined,
      metadata: {
        userId: user.id,
      },
    });
  }

  /**
   * Creates a hosted Checkout Session for upgrading or subscribing
   */
  async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    userId: string;
    planTier: string;
    billingInterval: string;
    trialDays?: number;
  }): Promise<Stripe.Checkout.Session> {
    const stripe = this.getClient();

    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData =
      {
        metadata: {
          userId: params.userId,
          planTier: params.planTier,
          billingInterval: params.billingInterval,
        },
      };

    if (params.trialDays && params.trialDays > 0) {
      subscriptionData.trial_period_days = params.trialDays;
    }

    return stripe.checkout.sessions.create({
      customer: params.customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      subscription_data: subscriptionData,
      success_url: this.stripeConfig.successUrl,
      cancel_url: this.stripeConfig.cancelUrl,
      metadata: {
        userId: params.userId,
        planTier: params.planTier,
        billingInterval: params.billingInterval,
      },
    });
  }

  /**
   * Creates a customer billing portal session for managing payment methods / canceling
   */
  async createBillingPortalSession(
    customerId: string,
  ): Promise<Stripe.BillingPortal.Session> {
    const stripe = this.getClient();

    return stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: this.stripeConfig.portalReturnUrl,
    });
  }

  /**
   * Cancels a Stripe subscription at the end of the current billing cycle
   */
  async cancelSubscription(
    stripeSubscriptionId: string,
    atPeriodEnd = true,
  ): Promise<Stripe.Subscription> {
    const stripe = this.getClient();

    if (atPeriodEnd) {
      return stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    return stripe.subscriptions.cancel(stripeSubscriptionId);
  }

  /**
   * Retrieves a Stripe subscription object
   */
  async retrieveSubscription(
    stripeSubscriptionId: string,
  ): Promise<Stripe.Subscription> {
    const stripe = this.getClient();
    return stripe.subscriptions.retrieve(stripeSubscriptionId);
  }

  /**
   * Verifies and constructs a webhook event from the raw body and signature header
   */
  constructWebhookEvent(
    rawBody: Buffer | string,
    signature: string,
  ): Stripe.Event {
    const stripe = this.getClient();
    const webhookSecret = this.stripeConfig.webhookSecret;

    if (!webhookSecret) {
      throw new InternalServerErrorException(
        'STRIPE_WEBHOOK_SECRET is not configured in environment variables.',
      );
    }

    try {
      return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }
  }
}
