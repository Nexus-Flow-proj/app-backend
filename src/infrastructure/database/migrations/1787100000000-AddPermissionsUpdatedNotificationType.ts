import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPermissionsUpdatedNotificationType1787100000000 implements MigrationInterface {
  name = 'AddPermissionsUpdatedNotificationType1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'PERMISSIONS_UPDATED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support safely removing enum values directly.
  }
}
