import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiFormat1790838260071 implements MigrationInterface {
  name = 'AiFormat1790838260071';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "ai_format_runs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid NOT NULL, "user_id" uuid, "exam_id" uuid, "section_id" uuid, "status" character varying(16) NOT NULL DEFAULT 'running', "attempts" smallint NOT NULL DEFAULT '0', "counted" boolean NOT NULL DEFAULT false, "prompt_tokens" integer NOT NULL DEFAULT '0', "output_tokens" integer NOT NULL DEFAULT '0', "issue_count" integer, "error" character varying(500), "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "finished_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "CHK_ai_format_runs_status" CHECK ("status" IN ('running', 'succeeded', 'partial', 'failed', 'cancelled')), CONSTRAINT "PK_ai_format_runs" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ai_format_runs_user_id" ON "ai_format_runs" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ai_format_runs_exam_id" ON "ai_format_runs" ("exam_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ai_format_runs_tenant_started_at" ON "ai_format_runs" ("tenant_id", "started_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "ai_enabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD "ai_monthly_quota" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" ADD CONSTRAINT "CHK_tenants_ai_monthly_quota" CHECK ("ai_monthly_quota" IN (100, 1000))`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_format_runs" ADD CONSTRAINT "FK_ai_format_runs_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_format_runs" ADD CONSTRAINT "FK_ai_format_runs_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_format_runs" ADD CONSTRAINT "FK_ai_format_runs_exam_id" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ai_format_runs" DROP CONSTRAINT "FK_ai_format_runs_exam_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_format_runs" DROP CONSTRAINT "FK_ai_format_runs_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_format_runs" DROP CONSTRAINT "FK_ai_format_runs_tenant_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP CONSTRAINT "CHK_tenants_ai_monthly_quota"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN "ai_monthly_quota"`,
    );
    await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "ai_enabled"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ai_format_runs_tenant_started_at"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_ai_format_runs_exam_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ai_format_runs_user_id"`);
    await queryRunner.query(`DROP TABLE "ai_format_runs"`);
  }
}
