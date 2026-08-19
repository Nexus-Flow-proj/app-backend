import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '@shared/decorators/public.decorator';
import { StripeService } from '../services/stripe.service';
import { SubscriptionsService } from '../services/subscriptions.service';

@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Public()
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header.');
    }

    const payload = req.rawBody || (req.body as Buffer | string);
    if (!payload) {
      throw new BadRequestException('Missing request body.');
    }

    const event = this.stripeService.constructWebhookEvent(payload, signature);
    await this.subscriptionsService.handleWebhookEvent(event);

    return { received: true };
  }
}
