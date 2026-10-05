import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Thông báo trong ứng dụng (req-3 Step 12, plan 4.7): gửi theo user để chuông
 * gộp mọi trung tâm; `dedupe_key` (unique một phần theo user) giữ cron 15 phút
 * chạy lại không tạo thông báo trùng.
 */
export class CreateNotifications1789922543142 implements MigrationInterface {
  name = 'CreateNotifications1789922543142';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "tenant_id" uuid, "type" character varying(32) NOT NULL, "params" jsonb NOT NULL DEFAULT '{}', "link" character varying(255), "dedupe_key" character varying(120), "read_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_notifications_type" CHECK ("type" IN ('class_student_added', 'class_teacher_added', 'class_items_assigned', 'retake_assigned', 'class_item_opened', 'item_deadline_soon', 'item_overdue', 'attempt_graded', 'session_cancelled', 'sessions_moved', 'session_makeup_added', 'session_teacher_assigned', 'grading_pending', 'grading_delegated', 'class_curriculum_changed', 'final_comment_published')), CONSTRAINT "PK_notifications" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_notifications_dedupe_key" ON "notifications" ("user_id", "dedupe_key") WHERE "dedupe_key" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_created_at" ON "notifications" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_created_at" ON "notifications" ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_tenant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_notifications_user_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_notifications_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_notifications_dedupe_key"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
