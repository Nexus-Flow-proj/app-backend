import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CsrfGuard } from '@shared/guards/csrf.guard';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { Public } from '@shared/decorators/public.decorator';
import { User } from '../../users/entities/user.entity';
import { SubscriptionsService } from '../services/subscriptions.service';
import { CreateCheckoutSessionDto } from '../dtos/checkout-session.dto';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get('plans')
  async listPlans() {
    const data = await this.subscriptionsService.listPlans();
    return {
      message: 'Subscription plans retrieved successfully.',
      data,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMySubscription(@CurrentUser() user: User) {
    const data = await this.subscriptionsService.getMySubscription(user.id);
    return {
      message: 'User subscription retrieved successfully.',
      data,
    };
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async createCheckoutSession(
    @CurrentUser() user: User,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    const data = await this.subscriptionsService.createCheckoutSession(
      user.id,
      dto,
    );
    return {
      message: 'Checkout session created successfully.',
      data,
    };
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async createBillingPortalSession(@CurrentUser() user: User) {
    const data = await this.subscriptionsService.createBillingPortalSession(
      user.id,
    );
    return {
      message: 'Billing portal session created successfully.',
      data,
    };
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard, CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@CurrentUser() user: User) {
    const data = await this.subscriptionsService.cancelSubscription(user.id);
    return {
      message:
        'Subscription scheduled for cancellation at the end of the billing period.',
      data,
    };
  }

  @Get('payments')
  @UseGuards(JwtAuthGuard)
  async getPaymentHistory(@CurrentUser() user: User) {
    const data = await this.subscriptionsService.getPaymentHistory(user.id);
    return {
      message: 'Payment history retrieved successfully.',
      data,
    };
  }
}
