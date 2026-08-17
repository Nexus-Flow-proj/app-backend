import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationDeduplicationKey1787300000000
  implements MigrationInterface
{
  name = 'AddNotificationDeduplicationKey1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE \"notifications\" ADD \"deduplication_key\" character varying",
    );
    await queryRunner.query(
      "CREATE UNIQUE INDEX \"UQ_notifications_deduplication_key\" ON \"notifications\" (\"deduplication_key\") WHERE \"deduplication_key\" IS NOT NULL",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "DROP INDEX \"public\".\"UQ_notifications_deduplication_key\"",
    );
    await queryRunner.query(
      "ALTER TABLE \"notifications\" DROP COLUMN \"deduplication_key\"",
    );
  }
}
