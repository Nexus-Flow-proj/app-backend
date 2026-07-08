import { MigrationInterface, QueryRunner } from "typeorm";

export class AddActivityLogAndDashboard1783524549190 implements MigrationInterface {
    name = 'AddActivityLogAndDashboard1783524549190'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "activity_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "message" character varying NOT NULL, "project_name" character varying, "entity_type" character varying, "entity_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actor_id" uuid NOT NULL, "project_id" uuid, CONSTRAINT "PK_f25287b6140c5ba18d38776a796" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0adcd018824a041e0f0becab44" ON "activity_logs"  ("project_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_d4a993f3a163eca3d27ffee1361" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_3baa1aae6f896f72eafbdd057e9" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_3baa1aae6f896f72eafbdd057e9"`);
        await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_d4a993f3a163eca3d27ffee1361"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0adcd018824a041e0f0becab44"`);
        await queryRunner.query(`DROP TABLE "activity_logs"`);
    }

}
