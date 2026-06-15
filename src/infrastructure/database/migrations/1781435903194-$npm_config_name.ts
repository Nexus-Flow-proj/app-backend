import { MigrationInterface, QueryRunner } from 'typeorm';

export class $npmConfigName1781435903194 implements MigrationInterface {
  name = ' $npmConfigName1781435903194';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0adc0a8834ea0f252e96d154de"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "full_name"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "first_name" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "last_name" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "reset_password_token_hash" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "reset_password_expires" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "reset_password_expires"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "reset_password_token_hash"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_name"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "first_name"`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "full_name" character varying NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0adc0a8834ea0f252e96d154de" ON "users" USING btree ("full_name") `,
    );
  }
}
