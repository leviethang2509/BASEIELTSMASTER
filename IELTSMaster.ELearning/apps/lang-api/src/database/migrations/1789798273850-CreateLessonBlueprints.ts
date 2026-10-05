import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Mẫu bài học và phần (req-3 Step 2). Sinh bằng migration:generate. Giống
 * `exam_blueprints`/`exam_modules` (CreateExamCatalog) nhưng phần không có thời
 * lượng; mẫu thuộc bảng `categories` dùng chung.
 */
export class CreateLessonBlueprints1789798273850 implements MigrationInterface {
  name = 'CreateLessonBlueprints1789798273850';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "lesson_blueprints" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tenant_id" uuid, "category_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "code" character varying(32) NOT NULL, "description" text, "is_active" boolean NOT NULL DEFAULT true, "created_by" uuid, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_lesson_blueprints_code_format" CHECK ("code" ~ '^[A-Z0-9]+([-_][A-Z0-9]+)*$'), CONSTRAINT "PK_lesson_blueprints" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lesson_blueprints_category_id" ON "lesson_blueprints" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_lesson_blueprints_tenant_code" ON "lesson_blueprints" ("tenant_id", "code") WHERE "tenant_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_lesson_blueprints_system_code" ON "lesson_blueprints" ("code") WHERE "tenant_id" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "lesson_modules" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "blueprint_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "code" character varying(32) NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', "description" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_lesson_modules_blueprint_code" UNIQUE ("blueprint_id", "code") DEFERRABLE INITIALLY DEFERRED, CONSTRAINT "CHK_lesson_modules_code_format" CHECK ("code" ~ '^[A-Z0-9]+([-_][A-Z0-9]+)*$'), CONSTRAINT "PK_lesson_modules" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_blueprints" ADD CONSTRAINT "FK_lesson_blueprints_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_blueprints" ADD CONSTRAINT "FK_lesson_blueprints_category_id" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_blueprints" ADD CONSTRAINT "FK_lesson_blueprints_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_blueprints" ADD CONSTRAINT "FK_lesson_blueprints_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_modules" ADD CONSTRAINT "FK_lesson_modules_blueprint_id" FOREIGN KEY ("blueprint_id") REFERENCES "lesson_blueprints"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // DROP TABLE xoá luôn index và constraint của bảng; bảng con xoá trước.
    await queryRunner.query(`DROP TABLE "lesson_modules"`);
    await queryRunner.query(`DROP TABLE "lesson_blueprints"`);
  }
}
