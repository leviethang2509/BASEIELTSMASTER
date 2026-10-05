import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Chuyển giao chấm (req-3 Step 10, plan 4.7): một Teacher khác được chấm đúng
 * một phạm vi (mục giáo trình lớp, đề/bài học ở phần tự do, hoặc một lượt).
 * `scope_id` đa hình nên không có FK.
 */

export class CreateGradingDelegations1789911880011 implements MigrationInterface {
  name = 'CreateGradingDelegations1789911880011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "grading_delegations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "delegate_membership_id" uuid NOT NULL, "scope_type" character varying(16) NOT NULL, "scope_id" uuid NOT NULL, "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_grading_delegations_scope_type" CHECK ("scope_type" IN ('class_item', 'exam', 'lesson', 'exam_attempt', 'lesson_attempt')), CONSTRAINT "PK_grading_delegations" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_grading_delegations_delegate" ON "grading_delegations" ("delegate_membership_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_grading_delegations_scope" ON "grading_delegations" ("tenant_id", "scope_type", "scope_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_grading_delegations_scope" ON "grading_delegations" ("delegate_membership_id", "scope_type", "scope_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "grading_delegations" ADD CONSTRAINT "FK_grading_delegations_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "grading_delegations" ADD CONSTRAINT "FK_grading_delegations_delegate_membership_id" FOREIGN KEY ("delegate_membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "grading_delegations" ADD CONSTRAINT "FK_grading_delegations_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "grading_delegations" DROP CONSTRAINT "FK_grading_delegations_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "grading_delegations" DROP CONSTRAINT "FK_grading_delegations_delegate_membership_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "grading_delegations" DROP CONSTRAINT "FK_grading_delegations_tenant_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_grading_delegations_scope"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_grading_delegations_scope"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_grading_delegations_delegate"`,
    );
    await queryRunner.query(`DROP TABLE "grading_delegations"`);
  }
}
