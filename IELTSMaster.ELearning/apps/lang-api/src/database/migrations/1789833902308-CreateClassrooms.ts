import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lớp học & giáo trình lớp (req-3 Step 7). Sinh bằng migration:generate.
 * `exam_attempts` thêm `class_item_id`/`voided_*`; index "1 lượt đang làm" tách
 * thành lượt tự do (theo đề) và lượt trong lớp (theo mục lớp, E9).
 * `lesson_attempts.class_item_id` (có từ Step 5) thêm khoá ngoại.
 */
export class CreateClassrooms1789833902308 implements MigrationInterface {
  name = 'CreateClassrooms1789833902308';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_exam_attempts_in_progress"`,
    );
    await queryRunner.query(
      `CREATE TABLE "classrooms" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "course_id" uuid NOT NULL, "code" character varying(32) NOT NULL, "name" character varying(200) NOT NULL, "description" text, "start_date" date NOT NULL, "planned_sessions" integer NOT NULL, "end_date" date, "max_students" integer, "location" character varying(500), "status" character varying(16) NOT NULL DEFAULT 'upcoming', "source_curriculum_id" uuid, "curriculum_revision" integer NOT NULL DEFAULT '1', "created_by" uuid, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_classrooms_max_students" CHECK ("max_students" IS NULL OR "max_students" >= 1), CONSTRAINT "CHK_classrooms_planned_sessions" CHECK ("planned_sessions" >= 1), CONSTRAINT "CHK_classrooms_status" CHECK ("status" IN ('upcoming', 'ongoing', 'finished', 'cancelled')), CONSTRAINT "CHK_classrooms_code_format" CHECK ("code" ~ '^[A-Z0-9]+([-_][A-Z0-9]+)*$'), CONSTRAINT "PK_classrooms" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_classrooms_course_id" ON "classrooms" ("course_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_classrooms_tenant_code" ON "classrooms" ("tenant_id", "code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "class_groups" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "classroom_id" uuid NOT NULL, "title" character varying(200) NOT NULL, "sort_order" integer NOT NULL, "opens_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_class_groups" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_groups_classroom_id" ON "class_groups" ("classroom_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "class_items" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "classroom_id" uuid NOT NULL, "group_id" uuid, "sort_order" integer NOT NULL, "item_type" character varying(16) NOT NULL, "lesson_id" uuid, "exam_id" uuid, "title" character varying(200), "label" character varying(16) NOT NULL, "note" text, "opens_at" TIMESTAMP WITH TIME ZONE, "deadline_at" TIMESTAMP WITH TIME ZONE, "accept_late" boolean NOT NULL DEFAULT true, "pass_threshold" integer NOT NULL DEFAULT '50', "retake_of_item_id" uuid, "removed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_class_items_pass_threshold" CHECK ("pass_threshold" >= 0 AND "pass_threshold" <= 100), CONSTRAINT "CHK_class_items_content" CHECK (("item_type" = 'lesson' AND "lesson_id" IS NOT NULL AND "exam_id" IS NULL) OR ("item_type" = 'exam' AND "exam_id" IS NOT NULL AND "lesson_id" IS NULL)), CONSTRAINT "CHK_class_items_label" CHECK ("label" IN ('lesson', 'homework', 'quiz', 'final')), CONSTRAINT "CHK_class_items_item_type" CHECK ("item_type" IN ('lesson', 'exam')), CONSTRAINT "PK_class_items" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_items_classroom_id" ON "class_items" ("classroom_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_items_group_id" ON "class_items" ("group_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_items_lesson_id" ON "class_items" ("lesson_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_items_exam_id" ON "class_items" ("exam_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_items_retake_of_item_id" ON "class_items" ("retake_of_item_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "classroom_teachers" ("classroom_id" uuid NOT NULL, "membership_id" uuid NOT NULL, "added_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_classroom_teachers" PRIMARY KEY ("classroom_id", "membership_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_classroom_teachers_membership_id" ON "classroom_teachers" ("membership_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "classroom_students" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "classroom_id" uuid NOT NULL, "membership_id" uuid NOT NULL, "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "removed_at" TIMESTAMP WITH TIME ZONE, "added_by" uuid, CONSTRAINT "UQ_classroom_students_member" UNIQUE ("classroom_id", "membership_id"), CONSTRAINT "PK_classroom_students" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_classroom_students_membership_id" ON "classroom_students" ("membership_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "class_change_logs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "classroom_id" uuid NOT NULL, "actor_user_id" uuid, "action" character varying(32) NOT NULL, "detail" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_class_change_logs" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_change_logs_classroom_created" ON "class_change_logs" ("classroom_id", "created_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempts" ADD "class_item_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempts" ADD "voided_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "exam_attempts" ADD "voided_by" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_lesson_attempts_class_item_id" ON "lesson_attempts" ("class_item_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exam_attempts_class_item_id" ON "exam_attempts" ("class_item_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_exam_attempts_in_progress_class" ON "exam_attempts" ("class_item_id", "user_id") WHERE "status" = 'in_progress' AND "class_item_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_exam_attempts_in_progress_free" ON "exam_attempts" ("exam_id", "user_id") WHERE "status" = 'in_progress' AND "class_item_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" ADD CONSTRAINT "FK_classrooms_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" ADD CONSTRAINT "FK_classrooms_course_id" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" ADD CONSTRAINT "FK_classrooms_source_curriculum_id" FOREIGN KEY ("source_curriculum_id") REFERENCES "curricula"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" ADD CONSTRAINT "FK_classrooms_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" ADD CONSTRAINT "FK_classrooms_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_groups" ADD CONSTRAINT "FK_class_groups_classroom_id" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_items" ADD CONSTRAINT "FK_class_items_classroom_id" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_items" ADD CONSTRAINT "FK_class_items_group_id" FOREIGN KEY ("group_id") REFERENCES "class_groups"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_items" ADD CONSTRAINT "FK_class_items_lesson_id" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_items" ADD CONSTRAINT "FK_class_items_exam_id" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_items" ADD CONSTRAINT "FK_class_items_retake_of_item_id" FOREIGN KEY ("retake_of_item_id") REFERENCES "class_items"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_attempts" ADD CONSTRAINT "FK_lesson_attempts_class_item_id" FOREIGN KEY ("class_item_id") REFERENCES "class_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "classroom_teachers" ADD CONSTRAINT "FK_classroom_teachers_classroom_id" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "classroom_teachers" ADD CONSTRAINT "FK_classroom_teachers_membership_id" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "classroom_teachers" ADD CONSTRAINT "FK_classroom_teachers_added_by" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "classroom_students" ADD CONSTRAINT "FK_classroom_students_classroom_id" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "classroom_students" ADD CONSTRAINT "FK_classroom_students_membership_id" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "classroom_students" ADD CONSTRAINT "FK_classroom_students_added_by" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_change_logs" ADD CONSTRAINT "FK_class_change_logs_classroom_id" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_change_logs" ADD CONSTRAINT "FK_class_change_logs_actor_user_id" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempts" ADD CONSTRAINT "FK_exam_attempts_class_item_id" FOREIGN KEY ("class_item_id") REFERENCES "class_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempts" ADD CONSTRAINT "FK_exam_attempts_voided_by" FOREIGN KEY ("voided_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // DROP TABLE CASCADE bỏ luôn FK từ lượt làm/lượt học trỏ vào class_items.
    await queryRunner.query(
      `DROP INDEX "public"."UQ_exam_attempts_in_progress_free"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_exam_attempts_in_progress_class"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_exam_attempts_class_item_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_lesson_attempts_class_item_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempts" DROP COLUMN "voided_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempts" DROP COLUMN "voided_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempts" DROP COLUMN "class_item_id"`,
    );
    await queryRunner.query(`DROP TABLE "class_change_logs"`);
    await queryRunner.query(`DROP TABLE "classroom_students"`);
    await queryRunner.query(`DROP TABLE "classroom_teachers"`);
    await queryRunner.query(`DROP TABLE "class_items" CASCADE`);
    await queryRunner.query(`DROP TABLE "class_groups"`);
    await queryRunner.query(`DROP TABLE "classrooms"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_exam_attempts_in_progress" ON "exam_attempts" ("exam_id", "user_id") WHERE ((status)::text = 'in_progress'::text)`,
    );
  }
}
