import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationTypeValues1784000000001
  implements MigrationInterface
{
  name = 'AddNotificationTypeValues1784000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'COMMENT_ADDED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'INVITE_RECEIVED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'REMOVED_FROM_PROJECT'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support safely removing enum values directly without recreating the type.
  }
}
