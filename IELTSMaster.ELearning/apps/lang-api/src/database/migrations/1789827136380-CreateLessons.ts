import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bài học và nội dung theo version (req-3 Step 4). Sinh bằng
 * migration:generate. Chép cấu trúc `exams`/`exam_sections`/`exam_parts`/
 * `exam_questions` nhưng section không có thời lượng; bài học mặc định
 * `visibility = private`; FK mẫu bài học NO ACTION (chặn xoá mẫu đang dùng).
 */
export class CreateLessons1789827136380 implements MigrationInterface {
  name = 'CreateLessons1789827136380';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "lessons" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "blueprint_id" uuid NOT NULL, "title" character varying(200) NOT NULL, "description" text, "status" character varying(16) NOT NULL DEFAULT 'draft', "visibility" character varying(16) NOT NULL DEFAULT 'private', "cloned_from_id" uuid, "current_version" integer NOT NULL DEFAULT '1', "content_revision" integer NOT NULL DEFAULT '1', "published_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_lessons_visibility" CHECK ("visibility" IN ('tenant', 'private')), CONSTRAINT "CHK_lessons_current_version" CHECK ("current_version" >= 1), CONSTRAINT "CHK_lessons_status" CHECK ("status" IN ('draft', 'published', 'archived')), CONSTRAINT "PK_lessons" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lessons_tenant_id" ON "lessons" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lessons_blueprint_id" ON "lessons" ("blueprint_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lessons_created_by" ON "lessons" ("created_by") `,
    );
    await queryRunner.query(
      `CREATE TABLE "lesson_sections" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "lesson_id" uuid NOT NULL, "version" integer NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'active', "module_id" uuid, "name" character varying(100) NOT NULL, "sort_order" integer NOT NULL, "raw_data" jsonb NOT NULL, "content_public" jsonb NOT NULL, "explanations" jsonb NOT NULL DEFAULT '[]', "question_count" integer NOT NULL DEFAULT '0', "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_lesson_sections_version" CHECK ("version" >= 1), CONSTRAINT "CHK_lesson_sections_status" CHECK ("status" IN ('active', 'deactivated')), CONSTRAINT "PK_lesson_sections" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lesson_sections_lesson_version" ON "lesson_sections" ("lesson_id", "version") `,
    );
    await queryRunner.query(
      `CREATE TABLE "lesson_parts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "section_id" uuid NOT NULL, "parent_part_id" uuid, "kind" character varying(16) NOT NULL, "node_id" character varying(64) NOT NULL, "sort_order" integer NOT NULL, "first_number" integer, "last_number" integer, CONSTRAINT "UQ_lesson_parts_section_node" UNIQUE ("section_id", "node_id"), CONSTRAINT "CHK_lesson_parts_kind" CHECK ("kind" IN ('part', 'subpart')), CONSTRAINT "PK_lesson_parts" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lesson_parts_parent_part_id" ON "lesson_parts" ("parent_part_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "lesson_questions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "section_id" uuid NOT NULL, "part_id" uuid, "number" integer NOT NULL, "node_id" character varying(64) NOT NULL, "sub_index" integer NOT NULL, "qtype" character varying(16) NOT NULL, "grading" character varying(8) NOT NULL, "answer_key" jsonb, "options" jsonb, "params" jsonb NOT NULL DEFAULT '{}', "max_score" numeric(4,1) NOT NULL, CONSTRAINT "UQ_lesson_questions_section_number" UNIQUE ("section_id", "number"), CONSTRAINT "CHK_lesson_questions_number" CHECK ("number" >= 1), CONSTRAINT "CHK_lesson_questions_grading" CHECK ("grading" IN ('auto', 'manual')), CONSTRAINT "CHK_lesson_questions_qtype" CHECK ("qtype" IN ('mc-single', 'mc-multi', 'pick-n', 'matching', 'tfng', 'ynng', 'fill-blank', 'ordering', 'polytomous', 'speaking', 'writing')), CONSTRAINT "PK_lesson_questions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lesson_questions_part_id" ON "lesson_questions" ("part_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "lessons" ADD CONSTRAINT "FK_lessons_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lessons" ADD CONSTRAINT "FK_lessons_blueprint_id" FOREIGN KEY ("blueprint_id") REFERENCES "lesson_blueprints"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lessons" ADD CONSTRAINT "FK_lessons_cloned_from_id" FOREIGN KEY ("cloned_from_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lessons" ADD CONSTRAINT "FK_lessons_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lessons" ADD CONSTRAINT "FK_lessons_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_sections" ADD CONSTRAINT "FK_lesson_sections_lesson_id" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_sections" ADD CONSTRAINT "FK_lesson_sections_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_parts" ADD CONSTRAINT "FK_lesson_parts_section_id" FOREIGN KEY ("section_id") REFERENCES "lesson_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_parts" ADD CONSTRAINT "FK_lesson_parts_parent_part_id" FOREIGN KEY ("parent_part_id") REFERENCES "lesson_parts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_questions" ADD CONSTRAINT "FK_lesson_questions_section_id" FOREIGN KEY ("section_id") REFERENCES "lesson_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_questions" ADD CONSTRAINT "FK_lesson_questions_part_id" FOREIGN KEY ("part_id") REFERENCES "lesson_parts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // DROP TABLE xoá luôn index và constraint của bảng; bảng con xoá trước.
    await queryRunner.query(`DROP TABLE "lesson_questions"`);
    await queryRunner.query(`DROP TABLE "lesson_parts"`);
    await queryRunner.query(`DROP TABLE "lesson_sections"`);
    await queryRunner.query(`DROP TABLE "lessons"`);
  }
}
