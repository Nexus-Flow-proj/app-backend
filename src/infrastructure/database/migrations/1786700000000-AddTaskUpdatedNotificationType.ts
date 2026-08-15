import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskUpdatedNotificationType1786700000000
  implements MigrationInterface
{
  name = 'AddTaskUpdatedNotificationType1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'TASK_UPDATED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support safely removing enum values directly.
  }
}
