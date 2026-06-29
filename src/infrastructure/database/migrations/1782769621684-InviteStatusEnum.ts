import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1782769621684 implements MigrationInterface {
    name = 'InitialSchema1782769621684'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."invites_status_enum" ADD VALUE 'CANCELLED'`);
        await queryRunner.query(`ALTER TYPE "public"."invites_status_enum" ADD VALUE 'REVOKED'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."invites_status_enum_old" AS ENUM('ACCEPTED', 'PENDING', 'REJECTED')`);
        await queryRunner.query(`ALTER TABLE "invites" ALTER COLUMN "status" TYPE "public"."invites_status_enum_old" USING "status"::"text"::"public"."invites_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."invites_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."invites_status_enum_old" RENAME TO "invites_status_enum"`);
    }

}
