import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectsTables1781760000000 implements MigrationInterface {
  name = 'CreateProjectsTables1781760000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."project_status_enum" AS ENUM('ACTIVE', 'COMPLETED', 'ARCHIVED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."project_members_role_label_enum" AS ENUM('OWNER', 'EDITOR', 'VIEWER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."invites_role_label_enum" AS ENUM('OWNER', 'EDITOR', 'VIEWER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."invites_status_enum" AS ENUM('ACCEPTED', 'PENDING', 'REJECTED')`,
    );

    await queryRunner.query(
      `CREATE TABLE "password_reset_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" character varying NOT NULL, "expires_at" TIMESTAMP NOT NULL, "used_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7f3f7f7af2ae7b6dbd41cc834de" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4e6bd8d9d9d5e89b8a9d7645c1" ON "password_reset_tokens" ("token_hash")`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_8ad30f0f040f51d3cc1e8e6ad78" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "deadline" date, "status" "public"."project_status_enum" NOT NULL DEFAULT 'ACTIVE', "admin_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_5e6a8d7b31c4f8d962fae7e8dfb" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "project_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role_label" "public"."project_members_role_label_enum" NOT NULL DEFAULT 'VIEWER', "is_admin" boolean NOT NULL DEFAULT false, "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3e79a1d6acb4e7f7f2aa2d26a6b" PRIMARY KEY ("id"), CONSTRAINT "UQ_8f8b2b4b5d8fa2c42f4d1f7a61c" UNIQUE ("project_id", "user_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_members" ADD CONSTRAINT "FK_9df2f5f8c2fca60e8cd5ac48a7f" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_members" ADD CONSTRAINT "FK_7fa0c3f97dbb5fb84c9f74f4a3b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "invites" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "invited_by" uuid NOT NULL, "email" character varying NOT NULL, "role_label" "public"."invites_role_label_enum" NOT NULL DEFAULT 'VIEWER', "token_hash" character varying NOT NULL, "status" "public"."invites_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_1eac3f6d3e8c0f9f1d76df5c0c5" PRIMARY KEY ("id"), CONSTRAINT "UQ_1d5d4f4a6e8f5ce9b27db8ff9c7" UNIQUE ("token_hash"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ADD CONSTRAINT "FK_0b10b8db0f5f7f0e0dd7ad5fdcb" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ADD CONSTRAINT "FK_9d1a1ffb7efc90b0cd7bffb2ad7" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invites" DROP CONSTRAINT "FK_9d1a1ffb7efc90b0cd7bffb2ad7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" DROP CONSTRAINT "FK_0b10b8db0f5f7f0e0dd7ad5fdcb"`,
    );
    await queryRunner.query(`DROP TABLE "invites"`);

    await queryRunner.query(
      `ALTER TABLE "project_members" DROP CONSTRAINT "FK_7fa0c3f97dbb5fb84c9f74f4a3b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_members" DROP CONSTRAINT "FK_9df2f5f8c2fca60e8cd5ac48a7f"`,
    );
    await queryRunner.query(`DROP TABLE "project_members"`);

    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_5e6a8d7b31c4f8d962fae7e8dfb"`,
    );
    await queryRunner.query(`DROP TABLE "projects"`);

    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_8ad30f0f040f51d3cc1e8e6ad78"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4e6bd8d9d9d5e89b8a9d7645c1"`,
    );
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);

    await queryRunner.query(`DROP TYPE "public"."invites_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."invites_role_label_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."project_members_role_label_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."project_status_enum"`);
  }
}
