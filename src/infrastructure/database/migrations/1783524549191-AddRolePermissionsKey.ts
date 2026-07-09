import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRolePermissionsKey1783524549191 implements MigrationInterface {
    name = 'AddRolePermissionsKey1783524549191'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "project_roles"
            SET "permissions" = "permissions" || '{"roles": {"create": true, "update": true, "delete": true}}'::jsonb
            WHERE "level" >= 80
        `);
        await queryRunner.query(`
            UPDATE "project_roles"
            SET "permissions" = "permissions" || '{"roles": {"create": false, "update": false, "delete": false}}'::jsonb
            WHERE "level" < 80
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "project_roles"
            SET "permissions" = "permissions" - 'roles'
        `);
    }
}
