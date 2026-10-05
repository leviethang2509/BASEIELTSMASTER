import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Section của lượt làm (timer, câu trả lời, số câu đúng) và câu trả lời từng câu
 * (chấm tay, thống kê) – Step 13; index unique một lượt làm dở mỗi (đề, người).
 * Sinh bằng migration:generate. FK tới section/câu hỏi của đề là NO ACTION: đề
 * có bài làm không bị xoá cứng, còn xoá cứng tenant vẫn CASCADE được.
 */
export class CreateAttemptSectionsAndAnswers1789572935771 implements MigrationInterface {
  name = 'CreateAttemptSectionsAndAnswers1789572935771';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "exam_attempt_sections" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "attempt_id" uuid NOT NULL, "section_id" uuid NOT NULL, "sort_order" integer NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'not_started', "started_at" TIMESTAMP WITH TIME ZONE, "deadline_at" TIMESTAMP WITH TIME ZONE, "submitted_at" TIMESTAMP WITH TIME ZONE, "auto_submitted" boolean NOT NULL DEFAULT false, "responses" jsonb NOT NULL DEFAULT '{"value": {}, "picks": {}, "order": {}}', "order_seed" integer NOT NULL, "correct" integer, "total" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_exam_attempt_sections_attempt_order" UNIQUE ("attempt_id", "sort_order"), CONSTRAINT "CHK_exam_attempt_sections_status" CHECK ("status" IN ('not_started', 'in_progress', 'submitted')), CONSTRAINT "PK_exam_attempt_sections" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exam_attempt_sections_section_id" ON "exam_attempt_sections" ("section_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exam_attempt_sections_open_deadline" ON "exam_attempt_sections" ("deadline_at") WHERE "status" = 'in_progress'`,
    );
    await queryRunner.query(
      `CREATE TABLE "exam_attempt_answers" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "attempt_id" uuid NOT NULL, "attempt_section_id" uuid NOT NULL, "question_id" uuid NOT NULL, "response" jsonb, "is_correct" boolean, "score" numeric(4,1), "comment" text, "recording_key" character varying(255), "graded_by" uuid, "graded_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_exam_attempt_answers_attempt_question" UNIQUE ("attempt_id", "question_id"), CONSTRAINT "PK_exam_attempt_answers" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exam_attempt_answers_attempt_section_id" ON "exam_attempt_answers" ("attempt_section_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_exam_attempt_answers_question_id" ON "exam_attempt_answers" ("question_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_exam_attempts_in_progress" ON "exam_attempts" ("exam_id", "user_id") WHERE "status" = 'in_progress'`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempt_sections" ADD CONSTRAINT "FK_exam_attempt_sections_attempt_id" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempt_sections" ADD CONSTRAINT "FK_exam_attempt_sections_section_id" FOREIGN KEY ("section_id") REFERENCES "exam_sections"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempt_answers" ADD CONSTRAINT "FK_exam_attempt_answers_attempt_id" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempt_answers" ADD CONSTRAINT "FK_exam_attempt_answers_attempt_section_id" FOREIGN KEY ("attempt_section_id") REFERENCES "exam_attempt_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempt_answers" ADD CONSTRAINT "FK_exam_attempt_answers_question_id" FOREIGN KEY ("question_id") REFERENCES "exam_questions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempt_answers" ADD CONSTRAINT "FK_exam_attempt_answers_graded_by" FOREIGN KEY ("graded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exam_attempt_answers" DROP CONSTRAINT "FK_exam_attempt_answers_graded_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempt_answers" DROP CONSTRAINT "FK_exam_attempt_answers_question_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempt_answers" DROP CONSTRAINT "FK_exam_attempt_answers_attempt_section_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempt_answers" DROP CONSTRAINT "FK_exam_attempt_answers_attempt_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempt_sections" DROP CONSTRAINT "FK_exam_attempt_sections_section_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempt_sections" DROP CONSTRAINT "FK_exam_attempt_sections_attempt_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_exam_attempts_in_progress"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_exam_attempt_answers_question_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_exam_attempt_answers_attempt_section_id"`,
    );
    await queryRunner.query(`DROP TABLE "exam_attempt_answers"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_exam_attempt_sections_open_deadline"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_exam_attempt_sections_section_id"`,
    );
    await queryRunner.query(`DROP TABLE "exam_attempt_sections"`);
  }
}
