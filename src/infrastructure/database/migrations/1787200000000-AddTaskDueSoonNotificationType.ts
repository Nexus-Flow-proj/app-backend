import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskDueSoonNotificationType1787200000000
  implements MigrationInterface
{
  name = 'AddTaskDueSoonNotificationType1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'TASK_DUE_SOON'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support safely removing enum values directly.
  }
}
