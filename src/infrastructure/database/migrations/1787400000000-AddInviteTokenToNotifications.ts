import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInviteTokenToNotifications1787400000000
  implements MigrationInterface
{
  name = 'AddInviteTokenToNotifications1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "notifications" ADD "invite_token" character varying',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "notifications" DROP COLUMN "invite_token"',
    );
  }
}
