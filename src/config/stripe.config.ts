import { registerAs } from '@nestjs/config';

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  publishableKey: string;
  proPriceIdMonthly: string;
  proPriceIdAnnual: string;
  businessPriceIdMonthly: string;
  businessPriceIdAnnual: string;
  portalReturnUrl: string;
  successUrl: string;
  cancelUrl: string;
}

export default registerAs(
  'stripe',
  (): StripeConfig => ({
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    proPriceIdMonthly: process.env.STRIPE_PRO_PRICE_ID_MONTHLY || '',
    proPriceIdAnnual: process.env.STRIPE_PRO_PRICE_ID_ANNUAL || '',
    businessPriceIdMonthly: process.env.STRIPE_BUSINESS_PRICE_ID_MONTHLY || '',
    businessPriceIdAnnual: process.env.STRIPE_BUSINESS_PRICE_ID_ANNUAL || '',
    portalReturnUrl:
      process.env.STRIPE_PORTAL_RETURN_URL ||
      'http://localhost:3000/settings/billing',
    successUrl:
      process.env.STRIPE_SUCCESS_URL ||
      'http://localhost:3000/settings/billing?success=true',
    cancelUrl:
      process.env.STRIPE_CANCEL_URL ||
      'http://localhost:3000/settings/billing?canceled=true',
  }),
);
