import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameInviteAcceptedNotificationType1786800000000
  implements MigrationInterface
{
  name = 'RenameInviteAcceptedNotificationType1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'notifications_type_enum'
            AND e.enumlabel = 'INVITE_ACCEPTED'
        ) AND NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'notifications_type_enum'
            AND e.enumlabel = 'INVITATION_ACCEPTED'
        ) THEN
          ALTER TYPE "public"."notifications_type_enum"
            RENAME VALUE 'INVITE_ACCEPTED' TO 'INVITATION_ACCEPTED';
        ELSIF EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'notifications_type_enum'
            AND e.enumlabel = 'INVITE_ACCEPTED'
        ) AND EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'notifications_type_enum'
            AND e.enumlabel = 'INVITATION_ACCEPTED'
        ) THEN
          UPDATE "public"."notifications"
          SET "type" = 'INVITATION_ACCEPTED'
          WHERE "type" = 'INVITE_ACCEPTED';
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support safely reverting enum value renames directly.
  }
}
