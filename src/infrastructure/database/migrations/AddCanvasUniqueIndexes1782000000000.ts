import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCanvasUniqueIndexes1782000000000
  implements MigrationInterface
{
  name = 'AddCanvasUniqueIndexes1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_canvases_project_canvas"
      ON "canvases" ("project_id")
      WHERE "type" = 'PROJECT'
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_canvases_personal_canvas"
      ON "canvases" ("project_id", "owner_id")
      WHERE "type" = 'PERSONAL'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "UQ_canvases_personal_canvas"
    `);

    await queryRunner.query(`
      DROP INDEX "UQ_canvases_project_canvas"
    `);
  }
}