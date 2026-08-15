import { MigrationInterface, QueryRunner } from 'typeorm';

export class BoardColumnTable1786046138842 implements MigrationInterface {
  name = 'BoardColumnTable1786046138842';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_082a77641034b050a2ff5a0970"`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_columns" ALTER COLUMN "name" TYPE character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_columns" ALTER COLUMN "color" TYPE character varying(20)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5b52433cc346d8e1d8c6d73727" ON "subtasks" ("task_id", "sort_order", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8d82387ba026be63046895fe37" ON "tasks" ("project_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_39d8e89d36488a8e76315792f0" ON "tasks" ("board_column_id", "column_order")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a5ea01d2307b59a82b8263a9cf" ON "board_columns" ("project_id", "name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_933976b397251806fa5114eed9" ON "board_columns" ("project_id", "sort_order")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_933976b397251806fa5114eed9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a5ea01d2307b59a82b8263a9cf"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_39d8e89d36488a8e76315792f0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8d82387ba026be63046895fe37"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5b52433cc346d8e1d8c6d73727"`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_columns" ALTER COLUMN "color" TYPE character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_columns" ALTER COLUMN "name" TYPE character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_082a77641034b050a2ff5a0970" ON "subtasks" USING btree ("id", "task_id")`,
    );
  }
}
