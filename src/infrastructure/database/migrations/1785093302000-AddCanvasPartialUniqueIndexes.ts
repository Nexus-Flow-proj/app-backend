import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCanvasPartialUniqueIndexes1785093302000 implements MigrationInterface {
  name = 'AddCanvasPartialUniqueIndexes1785093302000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_canvases_project_id_project_canvas" ON "canvases" ("project_id") WHERE "type" = 'PROJECT'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_canvases_project_id_owner_id_personal_canvas" ON "canvases" ("project_id", "owner_id") WHERE "type" = 'PERSONAL'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_canvases_project_id_owner_id_personal_canvas"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_canvases_project_id_project_canvas"`,
    );
  }
}
