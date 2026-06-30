import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeTaskSourceToEnum1782819922397 implements MigrationInterface {
    name = 'ChangeTaskSourceToEnum1782819922397'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "source"`);
        await queryRunner.query(`CREATE TYPE "public"."tasks_source_enum" AS ENUM('MANUAL', 'AI')`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "source" "public"."tasks_source_enum" NOT NULL DEFAULT 'MANUAL'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "source"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_source_enum"`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "source" character varying`);
    }

}
