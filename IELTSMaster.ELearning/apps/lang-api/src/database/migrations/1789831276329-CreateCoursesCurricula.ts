import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Khoá học và giáo trình tham khảo (req-3 Step 6). Sinh bằng
 * migration:generate. Khoá học m-m giáo trình qua `course_curricula`; mục giáo
 * trình trỏ bài học hoặc đề thi (FK NO ACTION: đang dùng thì không xoá được).
 */
export class CreateCoursesCurricula1789831276329 implements MigrationInterface {
  name = 'CreateCoursesCurricula1789831276329';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "curricula" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "name" character varying(200) NOT NULL, "description" text, "revision" integer NOT NULL DEFAULT '1', "cloned_from_id" uuid, "created_by" uuid, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_curricula_revision" CHECK ("revision" >= 1), CONSTRAINT "PK_curricula" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_curricula_tenant_id" ON "curricula" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_curricula_created_by" ON "curricula" ("created_by") `,
    );
    await queryRunner.query(
      `CREATE TABLE "curriculum_groups" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "curriculum_id" uuid NOT NULL, "title" character varying(200) NOT NULL, "sort_order" integer NOT NULL, CONSTRAINT "PK_curriculum_groups" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_curriculum_groups_curriculum_id" ON "curriculum_groups" ("curriculum_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "curriculum_items" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "curriculum_id" uuid NOT NULL, "group_id" uuid, "sort_order" integer NOT NULL, "item_type" character varying(16) NOT NULL, "lesson_id" uuid, "exam_id" uuid, "title" character varying(200), "label" character varying(16) NOT NULL, "note" text, CONSTRAINT "UQ_curriculum_items_exam" UNIQUE ("curriculum_id", "exam_id"), CONSTRAINT "UQ_curriculum_items_lesson" UNIQUE ("curriculum_id", "lesson_id"), CONSTRAINT "CHK_curriculum_items_content" CHECK (("item_type" = 'lesson' AND "lesson_id" IS NOT NULL AND "exam_id" IS NULL) OR ("item_type" = 'exam' AND "exam_id" IS NOT NULL AND "lesson_id" IS NULL)), CONSTRAINT "CHK_curriculum_items_label" CHECK ("label" IN ('lesson', 'homework', 'quiz', 'final')), CONSTRAINT "CHK_curriculum_items_item_type" CHECK ("item_type" IN ('lesson', 'exam')), CONSTRAINT "PK_curriculum_items" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_curriculum_items_group_id" ON "curriculum_items" ("group_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_curriculum_items_lesson_id" ON "curriculum_items" ("lesson_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_curriculum_items_exam_id" ON "curriculum_items" ("exam_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "courses" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "code" character varying(32) NOT NULL, "name" character varying(200) NOT NULL, "description" text, "category_id" uuid, "cover_url" character varying(1024), "level" character varying(50), "planned_sessions" integer, "status" character varying(16) NOT NULL DEFAULT 'active', "created_by" uuid, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_courses_planned_sessions" CHECK ("planned_sessions" IS NULL OR "planned_sessions" >= 1), CONSTRAINT "CHK_courses_status" CHECK ("status" IN ('active', 'archived')), CONSTRAINT "CHK_courses_code_format" CHECK ("code" ~ '^[A-Z0-9]+([-_][A-Z0-9]+)*$'), CONSTRAINT "PK_courses" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_courses_category_id" ON "courses" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_courses_tenant_code" ON "courses" ("tenant_id", "code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "course_curricula" ("course_id" uuid NOT NULL, "curriculum_id" uuid NOT NULL, "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_course_curricula" PRIMARY KEY ("course_id", "curriculum_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_course_curricula_curriculum_id" ON "course_curricula" ("curriculum_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "curricula" ADD CONSTRAINT "FK_curricula_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "curricula" ADD CONSTRAINT "FK_curricula_cloned_from_id" FOREIGN KEY ("cloned_from_id") REFERENCES "curricula"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "curricula" ADD CONSTRAINT "FK_curricula_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "curricula" ADD CONSTRAINT "FK_curricula_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "curriculum_groups" ADD CONSTRAINT "FK_curriculum_groups_curriculum_id" FOREIGN KEY ("curriculum_id") REFERENCES "curricula"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "curriculum_items" ADD CONSTRAINT "FK_curriculum_items_curriculum_id" FOREIGN KEY ("curriculum_id") REFERENCES "curricula"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "curriculum_items" ADD CONSTRAINT "FK_curriculum_items_group_id" FOREIGN KEY ("group_id") REFERENCES "curriculum_groups"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "curriculum_items" ADD CONSTRAINT "FK_curriculum_items_lesson_id" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "curriculum_items" ADD CONSTRAINT "FK_curriculum_items_exam_id" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ADD CONSTRAINT "FK_courses_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ADD CONSTRAINT "FK_courses_category_id" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ADD CONSTRAINT "FK_courses_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ADD CONSTRAINT "FK_courses_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_curricula" ADD CONSTRAINT "FK_course_curricula_course_id" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_curricula" ADD CONSTRAINT "FK_course_curricula_curriculum_id" FOREIGN KEY ("curriculum_id") REFERENCES "curricula"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_curricula" ADD CONSTRAINT "FK_course_curricula_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // DROP TABLE xoá luôn index và constraint của bảng; bảng con xoá trước.
    await queryRunner.query(`DROP TABLE "course_curricula"`);
    await queryRunner.query(`DROP TABLE "courses"`);
    await queryRunner.query(`DROP TABLE "curriculum_items"`);
    await queryRunner.query(`DROP TABLE "curriculum_groups"`);
    await queryRunner.query(`DROP TABLE "curricula"`);
  }
}
