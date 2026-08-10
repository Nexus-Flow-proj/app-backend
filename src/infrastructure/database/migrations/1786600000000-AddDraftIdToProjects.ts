import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDraftIdToProjects1786600000000 implements MigrationInterface {
  name = 'AddDraftIdToProjects1786600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "draft_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_projects_draft_id" FOREIGN KEY ("draft_id") REFERENCES "onboarding_drafts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_draft_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP COLUMN "draft_id"`,
    );
  }
}
