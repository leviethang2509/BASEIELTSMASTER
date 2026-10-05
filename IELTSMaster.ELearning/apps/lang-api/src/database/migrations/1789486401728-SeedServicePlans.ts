import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 3 gói dịch vụ mặc định (Step 6). Chỉ thêm gói có `code` chưa tồn tại để không
 * ghi đè gói System Admin đã sửa.
 */
export class SeedServicePlans1789486401728 implements MigrationInterface {
  name = 'SeedServicePlans1789486401728';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "service_plans" ("code", "name", "max_members", "sort_order")
      VALUES
        ('basic', 'Basic', 100, 1),
        ('standard', 'Standard', 500, 2),
        ('pro', 'Pro', 1000, 3)
      ON CONFLICT ("code") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Gói đang có tenant dùng thì giữ lại (FK RESTRICT).
    await queryRunner.query(`
      DELETE FROM "service_plans" p
      WHERE p."code" IN ('basic', 'standard', 'pro')
        AND NOT EXISTS (SELECT 1 FROM "tenants" t WHERE t."plan_id" = p."id")
    `);
  }
}
