import { IsEnum, IsOptional } from 'class-validator';
import { PlanTier } from '../enums/plan-tier.enum';
import { BillingInterval } from '../enums/billing-interval.enum';

export class CreateCheckoutSessionDto {
  @IsEnum(PlanTier)
  tier!: PlanTier;

  @IsEnum(BillingInterval)
  @IsOptional()
  interval?: BillingInterval = BillingInterval.MONTHLY;
}
