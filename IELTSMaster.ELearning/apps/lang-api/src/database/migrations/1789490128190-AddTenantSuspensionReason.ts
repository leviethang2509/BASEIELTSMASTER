import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Lý do tạm khoá tenant (Step 7). Chỉ thêm cột cho phép null, tương thích bản cũ. */
export class AddTenantSuspensionReason1789490128190 implements MigrationInterface {
  name = 'AddTenantSuspensionReason1789490128190';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "suspension_reason" character varying(1000)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN "suspension_reason"`,
    );
  }
}
