import { HttpException, HttpStatus } from '@nestjs/common';

export interface PaymentRequiredDetails {
  code: string;
  message: string;
  limitType?: string;
  limit?: number | null;
  current?: number;
  requiredPlan?: string;
  upgradeUrl?: string;
}

export class PaymentRequiredException extends HttpException {
  constructor(details: PaymentRequiredDetails | string) {
    const responsePayload: PaymentRequiredDetails =
      typeof details === 'string'
        ? {
            code: 'PLAN_LIMIT_EXCEEDED',
            message: details,
            upgradeUrl: '/settings/billing',
          }
        : {
            code: details.code || 'PLAN_LIMIT_EXCEEDED',
            message: details.message,
            limitType: details.limitType,
            limit: details.limit,
            current: details.current,
            requiredPlan: details.requiredPlan || 'PRO',
            upgradeUrl: details.upgradeUrl || '/settings/billing',
          };

    super(responsePayload, HttpStatus.PAYMENT_REQUIRED);
  }
}
