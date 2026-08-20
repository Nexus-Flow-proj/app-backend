import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatFeature1788000000000 implements MigrationInterface {
  name = 'CreateChatFeature1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."chat_messages_type_enum" AS ENUM('STANDARD', 'ANNOUNCEMENT', 'SYSTEM')`,
    );

    await queryRunner.query(
      `CREATE TABLE "chat_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "sender_id" uuid NOT NULL, "content" text NOT NULL, "type" "public"."chat_messages_type_enum" NOT NULL DEFAULT 'STANDARD', "is_pinned" boolean NOT NULL DEFAULT false, "pinned_by" uuid, "pinned_at" TIMESTAMP WITH TIME ZONE, "parent_message_id" uuid, "is_edited" boolean NOT NULL DEFAULT false, "edited_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_chat_messages" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_chat_messages_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_chat_messages_sender" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_chat_messages_pinned_by" FOREIGN KEY ("pinned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_chat_messages_parent" FOREIGN KEY ("parent_message_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_messages_project_created" ON "chat_messages" ("project_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_messages_project_pinned" ON "chat_messages" ("project_id", "is_pinned") WHERE "is_pinned" = true`,
    );

    await queryRunner.query(
      `CREATE TABLE "chat_message_attachments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "message_id" uuid NOT NULL, "file_name" character varying(255) NOT NULL, "file_url" text NOT NULL, "file_type" character varying(100) NOT NULL, "file_size" integer NOT NULL, "storage_path" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_chat_message_attachments" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message_attachments" ADD CONSTRAINT "FK_chat_message_attachments_message" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_message_attachments_message" ON "chat_message_attachments" ("message_id")`,
    );

    await queryRunner.query(
      `CREATE TABLE "chat_message_reactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "message_id" uuid NOT NULL, "user_id" uuid NOT NULL, "emoji" character varying(32) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_chat_message_reactions" PRIMARY KEY ("id"), CONSTRAINT "UQ_chat_message_reactions_message_user_emoji" UNIQUE ("message_id", "user_id", "emoji"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message_reactions" ADD CONSTRAINT "FK_chat_message_reactions_message" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message_reactions" ADD CONSTRAINT "FK_chat_message_reactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_message_reactions_message" ON "chat_message_reactions" ("message_id")`,
    );

    await queryRunner.query(
      `CREATE TABLE "chat_read_states" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "user_id" uuid NOT NULL, "last_read_message_id" uuid, "last_read_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_chat_read_states" PRIMARY KEY ("id"), CONSTRAINT "UQ_chat_read_states_project_user" UNIQUE ("project_id", "user_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_read_states" ADD CONSTRAINT "FK_chat_read_states_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_read_states" ADD CONSTRAINT "FK_chat_read_states_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_read_states" ADD CONSTRAINT "FK_chat_read_states_last_read" FOREIGN KEY ("last_read_message_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "chat_read_states"`);
    await queryRunner.query(`DROP TABLE "chat_message_reactions"`);
    await queryRunner.query(`DROP TABLE "chat_message_attachments"`);
    await queryRunner.query(`DROP TABLE "chat_messages"`);
    await queryRunner.query(`DROP TYPE "public"."chat_messages_type_enum"`);
  }
}
