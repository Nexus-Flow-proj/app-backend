import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptions1787600000000 implements MigrationInterface {
  name = 'AddSubscriptions1787600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Enums
    await queryRunner.query(`
      CREATE TYPE "public"."plans_tier_enum" AS ENUM('FREE', 'PRO', 'BUSINESS')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."subscriptions_status_enum" AS ENUM('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'INCOMPLETE')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."subscriptions_billing_interval_enum" AS ENUM('MONTHLY', 'ANNUAL')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."payments_status_enum" AS ENUM('SUCCEEDED', 'FAILED', 'REFUNDED', 'PENDING')
    `);

    // 2. Create Plans Table
    await queryRunner.query(`
      CREATE TABLE "plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tier" "public"."plans_tier_enum" NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "price_monthly_cents" integer NOT NULL DEFAULT 0,
        "price_annual_cents" integer NOT NULL DEFAULT 0,
        "stripe_monthly_price_id" character varying,
        "stripe_annual_price_id" character varying,
        "features" jsonb NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_plans_tier" UNIQUE ("tier"),
        CONSTRAINT "PK_plans" PRIMARY KEY ("id")
      )
    `);

    // 3. Create Subscriptions Table
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "plan_id" uuid NOT NULL,
        "status" "public"."subscriptions_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "billing_interval" "public"."subscriptions_billing_interval_enum",
        "stripe_customer_id" character varying,
        "stripe_subscription_id" character varying,
        "current_period_start" TIMESTAMPTZ,
        "current_period_end" TIMESTAMPTZ,
        "trial_start" TIMESTAMPTZ,
        "trial_end" TIMESTAMPTZ,
        "cancel_at_period_end" boolean NOT NULL DEFAULT false,
        "ai_onboarding_generations_used" integer NOT NULL DEFAULT 0,
        "ai_chat_messages_used" integer NOT NULL DEFAULT 0,
        "ai_task_actions_used" integer NOT NULL DEFAULT 0,
        "ai_total_requests_used" integer NOT NULL DEFAULT 0,
        "ai_usage_reset_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_subscriptions_user_id" UNIQUE ("user_id"),
        CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_subscriptions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_subscriptions_plan_id" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_subscriptions_stripe_customer_id" ON "subscriptions" ("stripe_customer_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_subscriptions_stripe_subscription_id" ON "subscriptions" ("stripe_subscription_id")
    `);

    // 4. Create Payments Table
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "subscription_id" uuid,
        "stripe_payment_intent_id" character varying,
        "stripe_invoice_id" character varying,
        "amount_cents" integer NOT NULL,
        "currency" character varying NOT NULL DEFAULT 'usd',
        "status" "public"."payments_status_enum" NOT NULL DEFAULT 'PENDING',
        "invoice_url" character varying,
        "receipt_url" character varying,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payments_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_payments_subscription_id" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payments_stripe_payment_intent_id" ON "payments" ("stripe_payment_intent_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payments_stripe_invoice_id" ON "payments" ("stripe_invoice_id")
    `);

    // 5. Seed Seed Plans (Free, Pro, Business)
    await queryRunner.query(`
      INSERT INTO "plans" ("tier", "name", "description", "price_monthly_cents", "price_annual_cents", "features")
      VALUES
      (
        'FREE',
        'Free',
        'Essential project management tools for individuals and small teams.',
        0,
        0,
        '{
          "maxProjectsOwned": 3,
          "maxMembersPerProject": 5,
          "maxTasksPerProject": 100,
          "maxBoardColumns": 3,
          "maxKnowledgeChunks": null,
          "aiOnboardingGenerations": null,
          "aiChatMessages": null,
          "aiTaskActions": null,
          "freeTierAiRequestsPerMonth": 3,
          "knowledgeBaseEnabled": false,
          "realtimeEnabled": false,
          "customRolesEnabled": false,
          "activityRetentionDays": 7,
          "trialDays": 0
        }'::jsonb
      ),
      (
        'PRO',
        'Pro',
        'Advanced AI generation, higher limits, custom roles, and knowledge base for growing teams.',
        1200,
        11520,
        '{
          "maxProjectsOwned": 5,
          "maxMembersPerProject": 5,
          "maxTasksPerProject": 2000,
          "maxBoardColumns": null,
          "maxKnowledgeChunks": 40,
          "aiOnboardingGenerations": 6,
          "aiChatMessages": 40,
          "aiTaskActions": 20,
          "freeTierAiRequestsPerMonth": 3,
          "knowledgeBaseEnabled": true,
          "realtimeEnabled": true,
          "customRolesEnabled": true,
          "activityRetentionDays": 90,
          "trialDays": 14
        }'::jsonb
      ),
      (
        'BUSINESS',
        'Business',
        'Unlimited power, enterprise AI capabilities, and unlimited collaboration for large organizations.',
        15000,
        144000,
        '{
          "maxProjectsOwned": null,
          "maxMembersPerProject": null,
          "maxTasksPerProject": null,
          "maxBoardColumns": null,
          "maxKnowledgeChunks": null,
          "aiOnboardingGenerations": null,
          "aiChatMessages": null,
          "aiTaskActions": null,
          "freeTierAiRequestsPerMonth": 3,
          "knowledgeBaseEnabled": true,
          "realtimeEnabled": true,
          "customRolesEnabled": true,
          "activityRetentionDays": 365,
          "trialDays": 0
        }'::jsonb
      )
    `);

    // 6. Seed Free Subscription for existing users
    await queryRunner.query(`
      INSERT INTO "subscriptions" ("user_id", "plan_id", "status")
      SELECT u.id, p.id, 'ACTIVE'
      FROM "users" u
      CROSS JOIN "plans" p
      WHERE p.tier = 'FREE'
      ON CONFLICT ("user_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(`DROP TABLE "plans"`);
    await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."subscriptions_billing_interval_enum"`);
    await queryRunner.query(`DROP TYPE "public"."subscriptions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."plans_tier_enum"`);
  }
}
