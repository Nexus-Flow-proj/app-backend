import { MigrationInterface, QueryRunner } from "typeorm";

export class LastVisit1785886903865 implements MigrationInterface {
    name = 'LastVisit1785886903865'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project_members" ADD "last_visited_at" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project_members" DROP COLUMN "last_visited_at"`);
    }

}
