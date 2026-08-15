import { MigrationInterface, QueryRunner } from "typeorm";

export class Phase5CanvasAndWorkshopOverhaul1785386753485 implements MigrationInterface {
    name = 'Phase5CanvasAndWorkshopOverhaul1785386753485'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "onboarding_drafts" RENAME COLUMN "workshop_state" TO "status"`);
        await queryRunner.query(`CREATE TYPE "public"."workshop_objects_type_enum" AS ENUM('TASK', 'NOTE', 'SHAPE', 'TEXT', 'SECTION_FRAME', 'TASK_CARD', 'STICKY_NOTE')`);
        await queryRunner.query(`CREATE TABLE "workshop_objects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "workshop_id" uuid NOT NULL, "type" "public"."workshop_objects_type_enum" NOT NULL, "x" double precision NOT NULL, "y" double precision NOT NULL, "width" double precision NOT NULL DEFAULT '200', "height" double precision NOT NULL DEFAULT '120', "rotation" double precision NOT NULL DEFAULT '0', "z_index" integer NOT NULL DEFAULT '0', "data" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c704a14af669c3396ba7b4661aa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."workshop_connections_type_enum" AS ENUM('ARROW', 'LINE', 'DASHED')`);
        await queryRunner.query(`CREATE TABLE "workshop_connections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "workshop_id" uuid NOT NULL, "source_object_id" uuid NOT NULL, "target_object_id" uuid NOT NULL, "type" "public"."workshop_connections_type_enum" NOT NULL DEFAULT 'ARROW', "data" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_cb92e80ffff83f73bc19266d662" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "workshops" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "draft_id" uuid NOT NULL, "viewport_x" double precision NOT NULL DEFAULT '24', "viewport_y" double precision NOT NULL DEFAULT '24', "viewport_zoom" double precision NOT NULL DEFAULT '0.82', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_2488c0cfa108a5ef0f2ee20c22" UNIQUE ("draft_id"), CONSTRAINT "PK_6d0e82a124f5b53df91c8989848" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ai_chat_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "draft_id" uuid, "project_id" uuid, "role" character varying NOT NULL, "content" text NOT NULL, "generation_job_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_68e330d1b2a3c5368bf6d2f67cb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "onboarding_drafts" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "public"."onboarding_drafts_status_enum" AS ENUM('DRAFT', 'SUBMITTED', 'ARCHIVED')`);
        await queryRunner.query(`ALTER TABLE "onboarding_drafts" ADD "status" "public"."onboarding_drafts_status_enum" NOT NULL DEFAULT 'DRAFT'`);
        await queryRunner.query(`ALTER TABLE "workshop_objects" ADD CONSTRAINT "FK_7d2485cc6f7be8d2e20d2e33364" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workshop_connections" ADD CONSTRAINT "FK_a1a8c8391b639c036b242bf23b4" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workshop_connections" ADD CONSTRAINT "FK_4fba462e2a4d87969e2eaa75da5" FOREIGN KEY ("source_object_id") REFERENCES "workshop_objects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workshop_connections" ADD CONSTRAINT "FK_76ef4a037e8d34d0ffbf05beacc" FOREIGN KEY ("target_object_id") REFERENCES "workshop_objects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workshops" ADD CONSTRAINT "FK_2488c0cfa108a5ef0f2ee20c225" FOREIGN KEY ("draft_id") REFERENCES "onboarding_drafts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "FK_50668995122ab10b12e32268d36" FOREIGN KEY ("draft_id") REFERENCES "onboarding_drafts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "FK_e2d10ed0c2a083630cb0c259536" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "FK_98e1811959e59205c0e33bafd47" FOREIGN KEY ("generation_job_id") REFERENCES "ai_generation_jobs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ai_chat_messages" DROP CONSTRAINT "FK_98e1811959e59205c0e33bafd47"`);
        await queryRunner.query(`ALTER TABLE "ai_chat_messages" DROP CONSTRAINT "FK_e2d10ed0c2a083630cb0c259536"`);
        await queryRunner.query(`ALTER TABLE "ai_chat_messages" DROP CONSTRAINT "FK_50668995122ab10b12e32268d36"`);
        await queryRunner.query(`ALTER TABLE "workshops" DROP CONSTRAINT "FK_2488c0cfa108a5ef0f2ee20c225"`);
        await queryRunner.query(`ALTER TABLE "workshop_connections" DROP CONSTRAINT "FK_76ef4a037e8d34d0ffbf05beacc"`);
        await queryRunner.query(`ALTER TABLE "workshop_connections" DROP CONSTRAINT "FK_4fba462e2a4d87969e2eaa75da5"`);
        await queryRunner.query(`ALTER TABLE "workshop_connections" DROP CONSTRAINT "FK_a1a8c8391b639c036b242bf23b4"`);
        await queryRunner.query(`ALTER TABLE "workshop_objects" DROP CONSTRAINT "FK_7d2485cc6f7be8d2e20d2e33364"`);
        await queryRunner.query(`ALTER TABLE "onboarding_drafts" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."onboarding_drafts_status_enum"`);
        await queryRunner.query(`ALTER TABLE "onboarding_drafts" ADD "status" jsonb`);
        await queryRunner.query(`DROP TABLE "ai_chat_messages"`);
        await queryRunner.query(`DROP TABLE "workshops"`);
        await queryRunner.query(`DROP TABLE "workshop_connections"`);
        await queryRunner.query(`DROP TYPE "public"."workshop_connections_type_enum"`);
        await queryRunner.query(`DROP TABLE "workshop_objects"`);
        await queryRunner.query(`DROP TYPE "public"."workshop_objects_type_enum"`);
        await queryRunner.query(`ALTER TABLE "onboarding_drafts" RENAME COLUMN "status" TO "workshop_state"`);
    }

}
