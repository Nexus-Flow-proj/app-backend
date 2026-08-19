import { MigrationInterface, QueryRunner } from "typeorm";

export class User1787138167947 implements MigrationInterface {
    name = 'User1787138167947'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_draft_id"`);
        await queryRunner.query(`ALTER TABLE "knowledge_chunks" DROP CONSTRAINT "FK_knowledge_chunks_project_id"`);
        await queryRunner.query(`ALTER TABLE "knowledge_chunks" DROP CONSTRAINT "FK_knowledge_chunks_created_by"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_knowledge_chunks_project_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_knowledge_chunks_source_type"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_notifications_deduplication_key"`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "UQ_314e3ac27794fc46bccaca52722" UNIQUE ("deduplication_key")`);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_cbf4bdc3766888f014e36835d6a" FOREIGN KEY ("draft_id") REFERENCES "onboarding_drafts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "FK_4cc18a71b8697e7ff1bc137f7f3" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "FK_adf12da647fbdf906de192b439b" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "knowledge_chunks" DROP CONSTRAINT "FK_adf12da647fbdf906de192b439b"`);
        await queryRunner.query(`ALTER TABLE "knowledge_chunks" DROP CONSTRAINT "FK_4cc18a71b8697e7ff1bc137f7f3"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_cbf4bdc3766888f014e36835d6a"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "UQ_314e3ac27794fc46bccaca52722"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_notifications_deduplication_key" ON "notifications" USING btree ("deduplication_key") WHERE (deduplication_key IS NOT NULL)`);
        await queryRunner.query(`CREATE INDEX "IDX_knowledge_chunks_source_type" ON "knowledge_chunks" USING btree ("source_type") `);
        await queryRunner.query(`CREATE INDEX "IDX_knowledge_chunks_project_id" ON "knowledge_chunks" USING btree ("project_id") `);
        await queryRunner.query(`ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "FK_knowledge_chunks_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "FK_knowledge_chunks_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_projects_draft_id" FOREIGN KEY ("draft_id") REFERENCES "onboarding_drafts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
