import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaskSource1782819549361 implements MigrationInterface {
    name = 'AddTaskSource1782819549361'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" ADD "source" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "source"`);
    }

}
