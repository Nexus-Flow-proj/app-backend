import { MigrationInterface, QueryRunner } from "typeorm";

export class Dependencies1785329349396 implements MigrationInterface {
    name = 'Dependencies1785329349396'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ai_generation_jobs" DROP CONSTRAINT "FK_ai_generation_jobs_requested_by"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_generation_job_id"`);
        await queryRunner.query(`ALTER TABLE "canvas_objects" DROP CONSTRAINT "FK_2f1f0b2e3b4c0d7f4d8b8bc0f58"`);
        await queryRunner.query(`ALTER TABLE "onboarding_drafts" DROP CONSTRAINT "FK_onboarding_drafts_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_canvases_project_id_project_canvas"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_canvases_project_id_owner_id_personal_canvas"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notifications_recipient_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notifications_is_read"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notifications_created_at"`);
        await queryRunner.query(`CREATE TABLE "task_dependencies" ("task_id" uuid NOT NULL, "dependency_id" uuid NOT NULL, CONSTRAINT "PK_73f03e2027c01a2cb62d91728d9" PRIMARY KEY ("task_id", "dependency_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1ae6688b1bd90fffe857f4cb70" ON "task_dependencies"  ("task_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c6a76113bf7a1956147f19bf75" ON "task_dependencies"  ("dependency_id") `);
        await queryRunner.query(`ALTER TABLE "ai_generation_jobs" ADD CONSTRAINT "FK_7dc2c1d74a3e65dc73244d2e341" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "canvas_objects" ADD CONSTRAINT "FK_ab07b6f2525ec77938297d3d5b1" FOREIGN KEY ("board_column_id") REFERENCES "board_columns"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "onboarding_drafts" ADD CONSTRAINT "FK_d5f11ff13aabc363815b435920a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_dependencies" ADD CONSTRAINT "FK_1ae6688b1bd90fffe857f4cb707" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "task_dependencies" ADD CONSTRAINT "FK_c6a76113bf7a1956147f19bf753" FOREIGN KEY ("dependency_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_dependencies" DROP CONSTRAINT "FK_c6a76113bf7a1956147f19bf753"`);
        await queryRunner.query(`ALTER TABLE "task_dependencies" DROP CONSTRAINT "FK_1ae6688b1bd90fffe857f4cb707"`);
        await queryRunner.query(`ALTER TABLE "onboarding_drafts" DROP CONSTRAINT "FK_d5f11ff13aabc363815b435920a"`);
        await queryRunner.query(`ALTER TABLE "canvas_objects" DROP CONSTRAINT "FK_ab07b6f2525ec77938297d3d5b1"`);
        await queryRunner.query(`ALTER TABLE "ai_generation_jobs" DROP CONSTRAINT "FK_7dc2c1d74a3e65dc73244d2e341"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c6a76113bf7a1956147f19bf75"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1ae6688b1bd90fffe857f4cb70"`);
        await queryRunner.query(`DROP TABLE "task_dependencies"`);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_created_at" ON "notifications" USING btree ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_is_read" ON "notifications" USING btree ("is_read") `);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_recipient_id" ON "notifications" USING btree ("recipient_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_canvases_project_id_owner_id_personal_canvas" ON "canvases" USING btree ("owner_id", "project_id") WHERE (type = 'PERSONAL'::canvases_type_enum)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_canvases_project_id_project_canvas" ON "canvases" USING btree ("project_id") WHERE (type = 'PROJECT'::canvases_type_enum)`);
        await queryRunner.query(`ALTER TABLE "onboarding_drafts" ADD CONSTRAINT "FK_onboarding_drafts_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "canvas_objects" ADD CONSTRAINT "FK_2f1f0b2e3b4c0d7f4d8b8bc0f58" FOREIGN KEY ("board_column_id") REFERENCES "board_columns"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_tasks_generation_job_id" FOREIGN KEY ("generation_job_id") REFERENCES "ai_generation_jobs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ai_generation_jobs" ADD CONSTRAINT "FK_ai_generation_jobs_requested_by" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
