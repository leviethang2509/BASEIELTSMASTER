import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Đề thi, section theo version, part/câu hỏi tách từ nội dung (Step 12) và
 * bảng lượt làm bài (plan 4.5; tạo sớm vì quy tắc version cần đếm bài làm).
 * Sinh bằng migration:generate. FK tới đề/loại đề là NO ACTION để xoá cứng
 * tenant vẫn CASCADE được mà vẫn chặn xoá loại đề/đề đang được dùng.
 */
export class CreateExams1789567469674 implements MigrationInterface {
  name = 'CreateExams1789567469674';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "exams" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "blueprint_id" uuid NOT NULL, "title" character varying(200) NOT NULL, "description" text, "status" character varying(16) NOT NULL DEFAULT 'draft', "current_version" integer NOT NULL DEFAULT '1', "content_revision" integer NOT NULL DEFAULT '1', "published_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_exams_current_version" CHECK ("current_version" >= 1), CONSTRAINT "CHK_exams_status" CHECK ("status" IN ('draft', 'published', 'archived')), CONSTRAINT "PK_exams" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exams_tenant_id" ON "exams" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exams_blueprint_id" ON "exams" ("blueprint_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exams_created_by" ON "exams" ("created_by") `,
    );
    await queryRunner.query(
      `CREATE TABLE "exam_sections" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "exam_id" uuid NOT NULL, "version" integer NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'active', "module_id" uuid, "name" character varying(100) NOT NULL, "sort_order" integer NOT NULL, "duration_minutes" integer NOT NULL, "raw_data" jsonb NOT NULL, "content_public" jsonb NOT NULL, "question_count" integer NOT NULL DEFAULT '0', "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_exam_sections_version" CHECK ("version" >= 1), CONSTRAINT "CHK_exam_sections_duration" CHECK ("duration_minutes" BETWEEN 5 AND 180 AND "duration_minutes" % 5 = 0), CONSTRAINT "CHK_exam_sections_status" CHECK ("status" IN ('active', 'deactivated')), CONSTRAINT "PK_exam_sections" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exam_sections_exam_version" ON "exam_sections" ("exam_id", "version") `,
    );
    await queryRunner.query(
      `CREATE TABLE "exam_parts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "section_id" uuid NOT NULL, "parent_part_id" uuid, "kind" character varying(16) NOT NULL, "node_id" character varying(64) NOT NULL, "sort_order" integer NOT NULL, "first_number" integer, "last_number" integer, CONSTRAINT "UQ_exam_parts_section_node" UNIQUE ("section_id", "node_id"), CONSTRAINT "CHK_exam_parts_kind" CHECK ("kind" IN ('part', 'subpart')), CONSTRAINT "PK_exam_parts" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exam_parts_parent_part_id" ON "exam_parts" ("parent_part_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "exam_questions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "section_id" uuid NOT NULL, "part_id" uuid, "number" integer NOT NULL, "node_id" character varying(64) NOT NULL, "sub_index" integer NOT NULL, "qtype" character varying(16) NOT NULL, "grading" character varying(8) NOT NULL, "answer_key" jsonb, "options" jsonb, "params" jsonb NOT NULL DEFAULT '{}', "max_score" numeric(4,1) NOT NULL, CONSTRAINT "UQ_exam_questions_section_number" UNIQUE ("section_id", "number"), CONSTRAINT "CHK_exam_questions_number" CHECK ("number" >= 1), CONSTRAINT "CHK_exam_questions_grading" CHECK ("grading" IN ('auto', 'manual')), CONSTRAINT "CHK_exam_questions_qtype" CHECK ("qtype" IN ('mc-single', 'mc-multi', 'pick-n', 'matching', 'tfng', 'ynng', 'fill-blank', 'ordering', 'polytomous', 'speaking', 'writing')), CONSTRAINT "PK_exam_questions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exam_questions_part_id" ON "exam_questions" ("part_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "exam_attempts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "exam_id" uuid NOT NULL, "exam_version" integer NOT NULL, "user_id" uuid NOT NULL, "membership_id" uuid NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'in_progress', "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "submitted_at" TIMESTAMP WITH TIME ZONE, "graded_at" TIMESTAMP WITH TIME ZONE, "auto_correct" integer NOT NULL DEFAULT '0', "auto_total" integer NOT NULL DEFAULT '0', "manual_count" integer NOT NULL DEFAULT '0', "manual_graded_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_exam_attempts_status" CHECK ("status" IN ('in_progress', 'submitted', 'graded')), CONSTRAINT "PK_exam_attempts" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exam_attempts_tenant_id" ON "exam_attempts" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exam_attempts_user_id" ON "exam_attempts" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exam_attempts_membership_id" ON "exam_attempts" ("membership_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exam_attempts_exam_version" ON "exam_attempts" ("exam_id", "exam_version") `,
    );
    await queryRunner.query(
      `ALTER TABLE "exams" ADD CONSTRAINT "FK_exams_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exams" ADD CONSTRAINT "FK_exams_blueprint_id" FOREIGN KEY ("blueprint_id") REFERENCES "exam_blueprints"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exams" ADD CONSTRAINT "FK_exams_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exams" ADD CONSTRAINT "FK_exams_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_sections" ADD CONSTRAINT "FK_exam_sections_exam_id" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_sections" ADD CONSTRAINT "FK_exam_sections_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_parts" ADD CONSTRAINT "FK_exam_parts_section_id" FOREIGN KEY ("section_id") REFERENCES "exam_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_parts" ADD CONSTRAINT "FK_exam_parts_parent_part_id" FOREIGN KEY ("parent_part_id") REFERENCES "exam_parts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_questions" ADD CONSTRAINT "FK_exam_questions_section_id" FOREIGN KEY ("section_id") REFERENCES "exam_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_questions" ADD CONSTRAINT "FK_exam_questions_part_id" FOREIGN KEY ("part_id") REFERENCES "exam_parts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempts" ADD CONSTRAINT "FK_exam_attempts_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempts" ADD CONSTRAINT "FK_exam_attempts_exam_id" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempts" ADD CONSTRAINT "FK_exam_attempts_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempts" ADD CONSTRAINT "FK_exam_attempts_membership_id" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exam_attempts" DROP CONSTRAINT "FK_exam_attempts_membership_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempts" DROP CONSTRAINT "FK_exam_attempts_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempts" DROP CONSTRAINT "FK_exam_attempts_exam_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempts" DROP CONSTRAINT "FK_exam_attempts_tenant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_questions" DROP CONSTRAINT "FK_exam_questions_part_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_questions" DROP CONSTRAINT "FK_exam_questions_section_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_parts" DROP CONSTRAINT "FK_exam_parts_parent_part_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_parts" DROP CONSTRAINT "FK_exam_parts_section_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_sections" DROP CONSTRAINT "FK_exam_sections_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_sections" DROP CONSTRAINT "FK_exam_sections_exam_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exams" DROP CONSTRAINT "FK_exams_updated_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exams" DROP CONSTRAINT "FK_exams_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exams" DROP CONSTRAINT "FK_exams_blueprint_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exams" DROP CONSTRAINT "FK_exams_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_exam_attempts_exam_version"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_exam_attempts_membership_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_exam_attempts_user_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_exam_attempts_tenant_id"`,
    );
    await queryRunner.query(`DROP TABLE "exam_attempts"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_exam_questions_part_id"`);
    await queryRunner.query(`DROP TABLE "exam_questions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_exam_parts_parent_part_id"`,
    );
    await queryRunner.query(`DROP TABLE "exam_parts"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_exam_sections_exam_version"`,
    );
    await queryRunner.query(`DROP TABLE "exam_sections"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_exams_created_by"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_exams_blueprint_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_exams_tenant_id"`);
    await queryRunner.query(`DROP TABLE "exams"`);
  }
}
