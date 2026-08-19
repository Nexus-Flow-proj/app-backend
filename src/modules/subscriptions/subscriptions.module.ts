import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { Payment } from './entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Invite } from '../projects/entities/invite.entity';
import { Task } from '../tasks/entities/task.entity';
import { Board } from '../boards/entities/board.entity';
import { KnowledgeChunk } from '../ai/entities/knowledge-chunk.entity';
import { StripeService } from './services/stripe.service';
import { PlanLimitsService } from './services/plan-limits.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { SubscriptionGuard } from './guards/subscription.guard';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { StripeWebhookController } from './controllers/stripe-webhook.controller';
import stripeConfig from '../../config/stripe.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Plan,
      Subscription,
      Payment,
      User,
      Project,
      ProjectMember,
      Invite,
      Task,
      Board,
      KnowledgeChunk,
    ]),
    ConfigModule.forFeature(stripeConfig),
  ],
  providers: [
    StripeService,
    PlanLimitsService,
    SubscriptionsService,
    SubscriptionGuard,
  ],
  controllers: [SubscriptionsController, StripeWebhookController],
  exports: [
    SubscriptionsService,
    PlanLimitsService,
    StripeService,
    SubscriptionGuard,
  ],
})
export class SubscriptionsModule {}
