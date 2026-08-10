import { MigrationInterface, QueryRunner } from 'typeorm';

export class Miniworkshop1786332923210 implements MigrationInterface {
  name = 'Miniworkshop1786332923210';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "mini_workshops" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "owner_id" uuid NOT NULL, "schema_version" smallint NOT NULL DEFAULT '2', "revision" integer NOT NULL DEFAULT '0', "scene" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_2fa0c51729679703a4cdadffab9" UNIQUE ("project_id", "owner_id"), CONSTRAINT "PK_47b27752bb2b7c05bddd06b72cb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_workshops" ADD CONSTRAINT "FK_7735e58fda9b8c30ac552d800b2" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_workshops" ADD CONSTRAINT "FK_aa94864a234be3039a2a4e5fe2f" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Clean up old legacy canvas tables if present
    await queryRunner.query(
      `DROP TABLE IF EXISTS "canvas_connections" CASCADE;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "canvas_objects" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "canvases" CASCADE;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mini_workshops" DROP CONSTRAINT "FK_aa94864a234be3039a2a4e5fe2f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_workshops" DROP CONSTRAINT "FK_7735e58fda9b8c30ac552d800b2"`,
    );
    await queryRunner.query(`DROP TABLE "mini_workshops"`);
  }
}
