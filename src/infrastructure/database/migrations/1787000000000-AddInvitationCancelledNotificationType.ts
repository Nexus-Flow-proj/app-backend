import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvitationCancelledNotificationType1787000000000
  implements MigrationInterface
{
  name = 'AddInvitationCancelledNotificationType1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'INVITATION_CANCELLED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support safely removing enum values directly.
  }
}
