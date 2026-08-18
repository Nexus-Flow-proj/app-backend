import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameInviteReceivedNotificationType1787500000000
  implements MigrationInterface
{
  name = 'RenameInviteReceivedNotificationType1787500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'notifications_type_enum'
            AND e.enumlabel = 'INVITE_RECEIVED'
        ) AND NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'notifications_type_enum'
            AND e.enumlabel = 'INVITATION_RECEIVED'
        ) THEN
          ALTER TYPE "public"."notifications_type_enum"
            RENAME VALUE 'INVITE_RECEIVED' TO 'INVITATION_RECEIVED';
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'notifications_type_enum'
            AND e.enumlabel = 'INVITATION_RECEIVED'
        ) AND NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'notifications_type_enum'
            AND e.enumlabel = 'INVITE_RECEIVED'
        ) THEN
          ALTER TYPE "public"."notifications_type_enum"
            RENAME VALUE 'INVITATION_RECEIVED' TO 'INVITE_RECEIVED';
        END IF;
      END $$;
    `);
  }
}
