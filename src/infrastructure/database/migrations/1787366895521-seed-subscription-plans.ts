import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedSubscriptionPlans1787366895521 implements MigrationInterface {
  name = 'SeedSubscriptionPlans1787366895521';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "plans" (
        "id",
        "tier",
        "name",
        "description",
        "price_monthly_cents",
        "price_annual_cents",
        "stripe_monthly_price_id",
        "stripe_annual_price_id",
        "features",
        "created_at",
        "updated_at"
      ) VALUES 
      (
        uuid_generate_v4(),
        'FREE',
        'Free',
        'Essential project management tools for individuals and small teams.',
        0,
        0,
        NULL,
        NULL,
        '{"maxProjectsOwned": 3, "maxMembersPerProject": 5, "maxTasksPerProject": 100, "maxBoardColumns": 3, "maxKnowledgeChunks": null, "aiOnboardingGenerations": null, "aiChatMessages": null, "aiTaskActions": null, "freeTierAiRequestsPerMonth": 3, "knowledgeBaseEnabled": false, "realtimeEnabled": false, "customRolesEnabled": false, "maxCustomRoles": 1, "activityRetentionDays": 7, "trialDays": 0}'::jsonb,
        now(),
        now()
      ),
      (
        uuid_generate_v4(),
        'PRO',
        'Pro',
        'Advanced AI generation, higher limits, custom roles, and knowledge base for growing teams.',
        1200,
        11520,
        NULL,
        NULL,
        '{"maxProjectsOwned": 5, "maxMembersPerProject": 5, "maxTasksPerProject": 2000, "maxBoardColumns": null, "maxKnowledgeChunks": 40, "aiOnboardingGenerations": 6, "aiChatMessages": 40, "aiTaskActions": 20, "freeTierAiRequestsPerMonth": 3, "knowledgeBaseEnabled": true, "realtimeEnabled": true, "customRolesEnabled": true, "maxCustomRoles": null, "activityRetentionDays": 90, "trialDays": 14}'::jsonb,
        now(),
        now()
      ),
      (
        uuid_generate_v4(),
        'BUSINESS',
        'Business',
        'Unlimited power, enterprise AI capabilities, and unlimited collaboration for large organizations.',
        15000,
        144000,
        NULL,
        NULL,
        '{"maxProjectsOwned": null, "maxMembersPerProject": null, "maxTasksPerProject": null, "maxBoardColumns": null, "maxKnowledgeChunks": null, "aiOnboardingGenerations": null, "aiChatMessages": null, "aiTaskActions": null, "freeTierAiRequestsPerMonth": 3, "knowledgeBaseEnabled": true, "realtimeEnabled": true, "customRolesEnabled": true, "maxCustomRoles": null, "activityRetentionDays": 365, "trialDays": 0}'::jsonb,
        now(),
        now()
      )
      ON CONFLICT ("tier") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "plans" WHERE "tier" IN ('FREE', 'PRO', 'BUSINESS');
    `);
  }
}
