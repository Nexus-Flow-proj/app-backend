import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvitationRejectedNotificationType1786900000000
  implements MigrationInterface
{
  name = 'AddInvitationRejectedNotificationType1786900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'INVITATION_REJECTED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support safely removing enum values directly.
  }
}
