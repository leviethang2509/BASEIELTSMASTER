import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLessonAttempts1789828790860 implements MigrationInterface {
  name = 'CreateLessonAttempts1789828790860';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "lesson_attempts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "lesson_id" uuid NOT NULL, "lesson_version" integer NOT NULL, "user_id" uuid NOT NULL, "membership_id" uuid NOT NULL, "class_item_id" uuid, "status" character varying(16) NOT NULL DEFAULT 'in_progress', "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "completed_at" TIMESTAMP WITH TIME ZONE, "submitted_at" TIMESTAMP WITH TIME ZONE, "graded_at" TIMESTAMP WITH TIME ZONE, "auto_correct" integer NOT NULL DEFAULT '0', "auto_total" integer NOT NULL DEFAULT '0', "manual_count" integer NOT NULL DEFAULT '0', "manual_graded_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_lesson_attempts_status" CHECK ("status" IN ('in_progress', 'completed')), CONSTRAINT "PK_lesson_attempts" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lesson_attempts_tenant_id" ON "lesson_attempts" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lesson_attempts_user_id" ON "lesson_attempts" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lesson_attempts_membership_id" ON "lesson_attempts" ("membership_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_lesson_attempts_class_item" ON "lesson_attempts" ("lesson_id", "lesson_version", "user_id", "class_item_id") WHERE "class_item_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_lesson_attempts_free" ON "lesson_attempts" ("lesson_id", "lesson_version", "user_id") WHERE "class_item_id" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "lesson_attempt_sections" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "attempt_id" uuid NOT NULL, "section_id" uuid NOT NULL, "sort_order" integer NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'open', "viewed_at" TIMESTAMP WITH TIME ZONE, "responses" jsonb NOT NULL DEFAULT '{"order": {}, "picks": {}, "value": {}}', "recordings" jsonb NOT NULL DEFAULT '{}', "order_seed" integer NOT NULL, "submitted_responses" jsonb, "submitted_at" TIMESTAMP WITH TIME ZONE, "submit_count" integer NOT NULL DEFAULT '0', "correct" integer, "total" integer, "manual_count" integer NOT NULL DEFAULT '0', "manual_graded_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_lesson_attempt_sections_attempt_order" UNIQUE ("attempt_id", "sort_order"), CONSTRAINT "CHK_lesson_attempt_sections_status" CHECK ("status" IN ('open', 'submitted')), CONSTRAINT "PK_lesson_attempt_sections" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lesson_attempt_sections_section_id" ON "lesson_attempt_sections" ("section_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "lesson_attempt_answers" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "attempt_id" uuid NOT NULL, "attempt_section_id" uuid NOT NULL, "question_id" uuid NOT NULL, "response" jsonb, "is_correct" boolean, "score" numeric(4,1), "comment" text, "recording_key" character varying(255), "graded_by" uuid, "graded_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_lesson_attempt_answers_section_question" UNIQUE ("attempt_section_id", "question_id"), CONSTRAINT "PK_lesson_attempt_answers" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lesson_attempt_answers_attempt_id" ON "lesson_attempt_answers" ("attempt_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lesson_attempt_answers_question_id" ON "lesson_attempt_answers" ("question_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_attempts" ADD CONSTRAINT "FK_lesson_attempts_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_attempts" ADD CONSTRAINT "FK_lesson_attempts_lesson_id" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_attempts" ADD CONSTRAINT "FK_lesson_attempts_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_attempts" ADD CONSTRAINT "FK_lesson_attempts_membership_id" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_attempt_sections" ADD CONSTRAINT "FK_lesson_attempt_sections_attempt_id" FOREIGN KEY ("attempt_id") REFERENCES "lesson_attempts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_attempt_sections" ADD CONSTRAINT "FK_lesson_attempt_sections_section_id" FOREIGN KEY ("section_id") REFERENCES "lesson_sections"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_attempt_answers" ADD CONSTRAINT "FK_lesson_attempt_answers_attempt_id" FOREIGN KEY ("attempt_id") REFERENCES "lesson_attempts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_attempt_answers" ADD CONSTRAINT "FK_lesson_attempt_answers_attempt_section_id" FOREIGN KEY ("attempt_section_id") REFERENCES "lesson_attempt_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_attempt_answers" ADD CONSTRAINT "FK_lesson_attempt_answers_question_id" FOREIGN KEY ("question_id") REFERENCES "lesson_questions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_attempt_answers" ADD CONSTRAINT "FK_lesson_attempt_answers_graded_by" FOREIGN KEY ("graded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // DROP TABLE xoá luôn index và constraint của bảng; bảng con xoá trước.
    await queryRunner.query(`DROP TABLE "lesson_attempt_answers"`);
    await queryRunner.query(`DROP TABLE "lesson_attempt_sections"`);
    await queryRunner.query(`DROP TABLE "lesson_attempts"`);
  }
}
