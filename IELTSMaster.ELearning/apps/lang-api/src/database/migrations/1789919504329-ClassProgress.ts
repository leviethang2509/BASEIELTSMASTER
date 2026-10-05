import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Chuyên cần, bảng điểm, nhận xét cuối khoá (req-3 Step 11, plan 4.5):
 * `classrooms.late_weight`/`warning_threshold` ghi đè tham số của trung tâm
 * (`null` = theo trung tâm, R11.1–2); `classroom_students.final_comment*` giữ
 * nhận xét cuối khoá của từng học viên (T5).
 */
export class ClassProgress1789919504329 implements MigrationInterface {
  name = 'ClassProgress1789919504329';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "classrooms" ADD "late_weight" numeric(3,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" ADD "warning_threshold" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "classroom_students" ADD "final_comment" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "classroom_students" ADD "final_comment_by" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "classroom_students" ADD "final_comment_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" ADD CONSTRAINT "CHK_classrooms_warning_threshold" CHECK ("warning_threshold" IS NULL OR ("warning_threshold" >= 0 AND "warning_threshold" <= 100))`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" ADD CONSTRAINT "CHK_classrooms_late_weight" CHECK ("late_weight" IS NULL OR ("late_weight" >= 0 AND "late_weight" <= 1))`,
    );
    await queryRunner.query(
      `ALTER TABLE "classroom_students" ADD CONSTRAINT "FK_classroom_students_final_comment_by" FOREIGN KEY ("final_comment_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "classroom_students" DROP CONSTRAINT "FK_classroom_students_final_comment_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" DROP CONSTRAINT "CHK_classrooms_late_weight"`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" DROP CONSTRAINT "CHK_classrooms_warning_threshold"`,
    );
    await queryRunner.query(
      `ALTER TABLE "classroom_students" DROP COLUMN "final_comment_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "classroom_students" DROP COLUMN "final_comment_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "classroom_students" DROP COLUMN "final_comment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" DROP COLUMN "warning_threshold"`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" DROP COLUMN "late_weight"`,
    );
  }
}
