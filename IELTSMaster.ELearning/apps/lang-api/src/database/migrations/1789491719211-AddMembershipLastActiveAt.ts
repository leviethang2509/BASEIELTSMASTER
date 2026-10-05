import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lần gần nhất thành viên vào tenant (Step 8), dùng gợi ý ngừng kích hoạt khi
 * vượt gói. Chỉ thêm cột cho phép null, tương thích bản cũ.
 */
export class AddMembershipLastActiveAt1789491719211 implements MigrationInterface {
  name = 'AddMembershipLastActiveAt1789491719211';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "memberships" ADD "last_active_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "memberships" DROP COLUMN "last_active_at"`,
    );
  }
}
