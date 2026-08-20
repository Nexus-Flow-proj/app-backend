import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillChatRolePermissions1788000000001 implements MigrationInterface {
  name = 'BackfillChatRolePermissions1788000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE "project_roles"
            SET "permissions" = "permissions" || '{"chat": {"read": true, "send": true, "pin": true, "deleteAny": true, "sendAnnouncement": true}}'::jsonb
            WHERE "level" >= 80
        `);
    await queryRunner.query(`
            UPDATE "project_roles"
            SET "permissions" = "permissions" || '{"chat": {"read": true, "send": true, "pin": true, "deleteAny": false, "sendAnnouncement": false}}'::jsonb
            WHERE "level" >= 60 AND "level" < 80
        `);
    await queryRunner.query(`
            UPDATE "project_roles"
            SET "permissions" = "permissions" || '{"chat": {"read": true, "send": true, "pin": false, "deleteAny": false, "sendAnnouncement": false}}'::jsonb
            WHERE "level" >= 40 AND "level" < 60
        `);
    await queryRunner.query(`
            UPDATE "project_roles"
            SET "permissions" = "permissions" || '{"chat": {"read": true, "send": false, "pin": false, "deleteAny": false, "sendAnnouncement": false}}'::jsonb
            WHERE "level" < 40
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE "project_roles"
            SET "permissions" = "permissions" - 'chat'
        `);
  }
}
