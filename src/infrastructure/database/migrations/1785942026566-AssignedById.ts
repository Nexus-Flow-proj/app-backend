import { MigrationInterface, QueryRunner } from "typeorm";

export class AssignedById1785942026566 implements MigrationInterface {
    name = 'AssignedById1785942026566'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" ADD "assigned_by_id" uuid`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_3e08a7ca125a175cf899b09f71a" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_3e08a7ca125a175cf899b09f71a"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "assigned_by_id"`);
    }

}
