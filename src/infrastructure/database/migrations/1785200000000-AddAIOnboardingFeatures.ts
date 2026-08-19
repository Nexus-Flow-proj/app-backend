import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAIOnboardingFeatures1785200000000 implements MigrationInterface {
  name = 'AddAIOnboardingFeatures1785200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "onboarding_drafts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "project_info" jsonb NOT NULL,
        "workshop_state" jsonb,
        "submitted_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_onboarding_drafts_user_id" UNIQUE ("user_id"),
        CONSTRAINT "PK_onboarding_drafts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_onboarding_drafts_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // 2. AI Generation Jobs — status enum
    await queryRunner.query(`
      CREATE TYPE "public"."ai_generation_jobs_status_enum"
        AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')
    `);

    // 3. AI Generation Jobs Table
    await queryRunner.query(`
      CREATE TABLE "ai_generation_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "requested_by" uuid NOT NULL,
        "prompt" text NOT NULL,
        "status" "public"."ai_generation_jobs_status_enum" NOT NULL DEFAULT 'PENDING',
        "provider" character varying NOT NULL,
        "model" character varying NOT NULL,
        "input_snapshot" jsonb NOT NULL,
        "output_snapshot" jsonb,
        "error_message" text,
        "project_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMPTZ,
        CONSTRAINT "PK_ai_generation_jobs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ai_generation_jobs_requested_by" FOREIGN KEY ("requested_by")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // 4. Add metadata and generation_job_id to tasks
    await queryRunner.query(`
      ALTER TABLE "tasks" ADD COLUMN "metadata" jsonb DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tasks" ADD COLUMN "generation_job_id" uuid DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tasks"
        ADD CONSTRAINT "FK_tasks_generation_job_id"
        FOREIGN KEY ("generation_job_id")
        REFERENCES "ai_generation_jobs"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_generation_job_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP COLUMN "generation_job_id"`,
    );
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "metadata"`);
    await queryRunner.query(`DROP TABLE "ai_generation_jobs"`);
    await queryRunner.query(
      `DROP TYPE "public"."ai_generation_jobs_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "onboarding_drafts"`);
  }
}
