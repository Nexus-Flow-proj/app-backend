import { MigrationInterface, QueryRunner } from 'typeorm';

export class $npmConfigName1781691504546 implements MigrationInterface {
  name = ' $npmConfigName1781691504546';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "google_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_0bd5012aeb82628e07f6a1be53b" UNIQUE ("google_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_0bd5012aeb82628e07f6a1be53b"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "google_id"`);
  }
}
