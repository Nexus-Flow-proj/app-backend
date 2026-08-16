import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKnowledgeChunks1787100000000 implements MigrationInterface {
  name = 'AddKnowledgeChunks1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "knowledge_chunks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "content" text NOT NULL,
        "source_type" character varying(50) NOT NULL DEFAULT 'policy',
        "embedding" jsonb NOT NULL,
        "created_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_knowledge_chunks_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_knowledge_chunks_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_knowledge_chunks_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_knowledge_chunks_project_id" ON "knowledge_chunks" ("project_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_knowledge_chunks_source_type" ON "knowledge_chunks" ("source_type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_knowledge_chunks_source_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_knowledge_chunks_project_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_chunks"`);
  }
}
