import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1782662632314 implements MigrationInterface {
    name = 'InitialSchema1782662632314'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_e1273606f4055f3229645e3faf6"`);
        await queryRunner.query(`ALTER TABLE "board_columns" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "board_column_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_e1273606f4055f3229645e3faf6" FOREIGN KEY ("board_column_id") REFERENCES "board_columns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_e1273606f4055f3229645e3faf6"`);
        await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "board_column_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "board_columns" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_e1273606f4055f3229645e3faf6" FOREIGN KEY ("board_column_id") REFERENCES "board_columns"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
