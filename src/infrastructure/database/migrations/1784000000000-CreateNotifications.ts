import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNotifications1784000000000 implements MigrationInterface {
    name = 'CreateNotifications1784000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('TASK_ASSIGNED', 'TASK_UNASSIGNED', 'TASK_COMPLETED', 'INVITE_ACCEPTED')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "recipient_id" uuid NOT NULL, "actor_id" uuid, "type" "public"."notifications_type_enum" NOT NULL, "title" character varying NOT NULL, "message" text NOT NULL, "project_id" uuid, "resource_type" character varying, "resource_id" character varying, "is_read" boolean NOT NULL DEFAULT false, "read_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8c95e1b0bff0a2fcb3e2af9ad5d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_recipient_id" ON "notifications" ("recipient_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_is_read" ON "notifications" ("is_read") `);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_created_at" ON "notifications" ("created_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_notifications_created_at"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notifications_is_read"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notifications_recipient_id"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    }

}
