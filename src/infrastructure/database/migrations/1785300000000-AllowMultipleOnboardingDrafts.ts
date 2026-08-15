import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowMultipleOnboardingDrafts1785300000000
  implements MigrationInterface
{
  name = 'AllowMultipleOnboardingDrafts1785300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique constraint on user_id to allow multiple drafts per user
    await queryRunner.query(
      `ALTER TABLE "onboarding_drafts" DROP CONSTRAINT "UQ_onboarding_drafts_user_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add the unique constraint back
    await queryRunner.query(
      `ALTER TABLE "onboarding_drafts" ADD CONSTRAINT "UQ_onboarding_drafts_user_id" UNIQUE ("user_id")`,
    );
  }
}
