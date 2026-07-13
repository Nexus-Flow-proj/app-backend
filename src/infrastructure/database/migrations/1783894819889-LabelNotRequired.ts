import { MigrationInterface, QueryRunner } from "typeorm";

export class LabelNotRequired1783894819889 implements MigrationInterface {
    name = 'LabelNotRequired1783894819889'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "label" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "label" SET NOT NULL`);
    }

}
