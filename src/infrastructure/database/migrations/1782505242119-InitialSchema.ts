import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1782505242119 implements MigrationInterface {
    name = 'InitialSchema1782505242119'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_comments" DROP CONSTRAINT "FK_ba9e465cfc707006e60aae59946"`);
        await queryRunner.query(`CREATE TYPE "public"."canvases_type_enum" AS ENUM('PROJECT', 'PERSONAL')`);
        await queryRunner.query(`CREATE TABLE "canvases" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "owner_id" uuid NOT NULL, "type" "public"."canvases_type_enum" NOT NULL, "name" character varying(255), "description" text, "viewport_x" double precision NOT NULL DEFAULT '0', "viewport_y" double precision NOT NULL DEFAULT '0', "viewport_zoom" double precision NOT NULL DEFAULT '1', "settings" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_59fc8025e679185eda05ba8aa60" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."canvas_objects_type_enum" AS ENUM('TASK', 'NOTE', 'SHAPE', 'TEXT')`);
        await queryRunner.query(`CREATE TABLE "canvas_objects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "canvas_id" uuid NOT NULL, "task_id" uuid, "type" "public"."canvas_objects_type_enum" NOT NULL, "x" double precision NOT NULL, "y" double precision NOT NULL, "width" double precision NOT NULL DEFAULT '200', "height" double precision NOT NULL DEFAULT '120', "z_index" integer NOT NULL DEFAULT '0', "data" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6df553ebb8fbe7a886e23f22562" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."canvas_connections_type_enum" AS ENUM('ARROW', 'LINE', 'DASHED')`);
        await queryRunner.query(`CREATE TABLE "canvas_connections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "canvas_id" uuid NOT NULL, "source_object_id" uuid NOT NULL, "target_object_id" uuid NOT NULL, "type" "public"."canvas_connections_type_enum" NOT NULL DEFAULT 'ARROW', "data" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d91a389dc13ff38f70bcc33f879" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_082a77641034b050a2ff5a0970" ON "subtasks"  ("task_id", "id") `);
        await queryRunner.query(`CREATE INDEX "IDX_608fdc50eb832e128ac4167078" ON "task_comments"  ("task_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_326f93050e88adf9873aab618c" ON "time_logs"  ("task_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_445d2f35e526d4d64f1be24eec" ON "tasks"  ("project_id", "column_order") `);
        await queryRunner.query(`ALTER TABLE "task_comments" ADD CONSTRAINT "FK_ba9e465cfc707006e60aae59946" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "canvases" ADD CONSTRAINT "FK_0dbbe283f09c40a11751b47ebc8" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "canvases" ADD CONSTRAINT "FK_6995a0d4ecfa53efd044dad6699" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "canvas_objects" ADD CONSTRAINT "FK_a381e92d739db38e1d127768d9f" FOREIGN KEY ("canvas_id") REFERENCES "canvases"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "canvas_objects" ADD CONSTRAINT "FK_50eee1d675f5af6c99a1d828101" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "canvas_connections" ADD CONSTRAINT "FK_1ec8067e421000885a9bb981632" FOREIGN KEY ("canvas_id") REFERENCES "canvases"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "canvas_connections" ADD CONSTRAINT "FK_b4c9b1948ddb811cc81186c2715" FOREIGN KEY ("source_object_id") REFERENCES "canvas_objects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "canvas_connections" ADD CONSTRAINT "FK_a105256d9bdefc467d19e4e2df1" FOREIGN KEY ("target_object_id") REFERENCES "canvas_objects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "canvas_connections" DROP CONSTRAINT "FK_a105256d9bdefc467d19e4e2df1"`);
        await queryRunner.query(`ALTER TABLE "canvas_connections" DROP CONSTRAINT "FK_b4c9b1948ddb811cc81186c2715"`);
        await queryRunner.query(`ALTER TABLE "canvas_connections" DROP CONSTRAINT "FK_1ec8067e421000885a9bb981632"`);
        await queryRunner.query(`ALTER TABLE "canvas_objects" DROP CONSTRAINT "FK_50eee1d675f5af6c99a1d828101"`);
        await queryRunner.query(`ALTER TABLE "canvas_objects" DROP CONSTRAINT "FK_a381e92d739db38e1d127768d9f"`);
        await queryRunner.query(`ALTER TABLE "canvases" DROP CONSTRAINT "FK_6995a0d4ecfa53efd044dad6699"`);
        await queryRunner.query(`ALTER TABLE "canvases" DROP CONSTRAINT "FK_0dbbe283f09c40a11751b47ebc8"`);
        await queryRunner.query(`ALTER TABLE "task_comments" DROP CONSTRAINT "FK_ba9e465cfc707006e60aae59946"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_445d2f35e526d4d64f1be24eec"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_326f93050e88adf9873aab618c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_608fdc50eb832e128ac4167078"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_082a77641034b050a2ff5a0970"`);
        await queryRunner.query(`DROP TABLE "canvas_connections"`);
        await queryRunner.query(`DROP TYPE "public"."canvas_connections_type_enum"`);
        await queryRunner.query(`DROP TABLE "canvas_objects"`);
        await queryRunner.query(`DROP TYPE "public"."canvas_objects_type_enum"`);
        await queryRunner.query(`DROP TABLE "canvases"`);
        await queryRunner.query(`DROP TYPE "public"."canvases_type_enum"`);
        await queryRunner.query(`ALTER TABLE "task_comments" ADD CONSTRAINT "FK_ba9e465cfc707006e60aae59946" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
