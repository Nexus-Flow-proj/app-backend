import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkshopCanvasFoundation1785090865000 implements MigrationInterface {
  name = 'AddWorkshopCanvasFoundation1785090865000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."canvas_objects_type_enum" ADD VALUE IF NOT EXISTS 'SECTION_FRAME'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."canvas_objects_type_enum" ADD VALUE IF NOT EXISTS 'TASK_CARD'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."canvas_objects_type_enum" ADD VALUE IF NOT EXISTS 'STICKY_NOTE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "canvas_objects" ADD "rotation" double precision NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "canvas_objects" ADD "board_column_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "canvas_objects" ADD CONSTRAINT "FK_2f1f0b2e3b4c0d7f4d8b8bc0f58" FOREIGN KEY ("board_column_id") REFERENCES "board_columns"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const workshopObjects = await queryRunner.query(
      `SELECT COUNT(*)::int AS "count" FROM "canvas_objects" WHERE "type" IN ('SECTION_FRAME', 'TASK_CARD', 'STICKY_NOTE')`,
    );

    if (workshopObjects[0]?.count > 0) {
      throw new Error(
        'Cannot revert Workshop Canvas foundation while Workshop canvas objects exist',
      );
    }

    await queryRunner.query(
      `ALTER TABLE "canvas_objects" DROP CONSTRAINT "FK_2f1f0b2e3b4c0d7f4d8b8bc0f58"`,
    );
    await queryRunner.query(
      `ALTER TABLE "canvas_objects" DROP COLUMN "board_column_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "canvas_objects" DROP COLUMN "rotation"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."canvas_objects_type_enum_old" AS ENUM('TASK', 'NOTE', 'SHAPE', 'TEXT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "canvas_objects" ALTER COLUMN "type" TYPE "public"."canvas_objects_type_enum_old" USING "type"::text::"public"."canvas_objects_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."canvas_objects_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."canvas_objects_type_enum_old" RENAME TO "canvas_objects_type_enum"`,
    );
  }
}
