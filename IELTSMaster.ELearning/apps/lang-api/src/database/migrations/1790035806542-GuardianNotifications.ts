import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ba loại thông báo cho phụ huynh (req-3 Step 13, R19): con quá hạn chưa nộp,
 * bài của con đã chấm xong, chuyên cần của con dưới ngưỡng. Bảng
 * `notifications` không đổi cấu trúc, chỉ nới CHECK của cột `type`.
 */
export class GuardianNotifications1790035806542 implements MigrationInterface {
  name = 'GuardianNotifications1790035806542';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "CHK_notifications_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "CHK_notifications_type" CHECK ("type" IN ('class_student_added', 'class_teacher_added', 'class_items_assigned', 'retake_assigned', 'class_item_opened', 'item_deadline_soon', 'item_overdue', 'attempt_graded', 'session_cancelled', 'sessions_moved', 'session_makeup_added', 'session_teacher_assigned', 'grading_pending', 'grading_delegated', 'class_curriculum_changed', 'final_comment_published', 'child_item_overdue', 'child_attempt_graded', 'child_attendance_low'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Gỡ thông báo của phụ huynh trước, nếu không CHECK cũ không gắn lại được.
    await queryRunner.query(
      `DELETE FROM "notifications" WHERE "type" IN ('child_item_overdue', 'child_attempt_graded', 'child_attendance_low')`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "CHK_notifications_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "CHK_notifications_type" CHECK ("type" IN ('class_student_added', 'class_teacher_added', 'class_items_assigned', 'retake_assigned', 'class_item_opened', 'item_deadline_soon', 'item_overdue', 'attempt_graded', 'session_cancelled', 'sessions_moved', 'session_makeup_added', 'session_teacher_assigned', 'grading_pending', 'grading_delegated', 'class_curriculum_changed', 'final_comment_published'))`,
    );
  }
}
