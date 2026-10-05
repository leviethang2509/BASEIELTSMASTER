import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExamVisibilityCloneExplanations1789799812859 implements MigrationInterface {
  name = 'ExamVisibilityCloneExplanations1789799812859';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exams" ADD "visibility" character varying(16) NOT NULL DEFAULT 'tenant'`,
    );
    await queryRunner.query(`ALTER TABLE "exams" ADD "cloned_from_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "exam_sections" ADD "explanations" jsonb NOT NULL DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "exams" ADD CONSTRAINT "CHK_exams_visibility" CHECK ("visibility" IN ('tenant', 'private'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "exams" ADD CONSTRAINT "FK_exams_cloned_from_id" FOREIGN KEY ("cloned_from_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exams" DROP CONSTRAINT "FK_exams_cloned_from_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exams" DROP CONSTRAINT "CHK_exams_visibility"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_sections" DROP COLUMN "explanations"`,
    );
    await queryRunner.query(`ALTER TABLE "exams" DROP COLUMN "cloned_from_id"`);
    await queryRunner.query(`ALTER TABLE "exams" DROP COLUMN "visibility"`);
  }
}
