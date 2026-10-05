import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Danh mục đề, loại đề và module (Step 11). Sinh bằng migration:generate.
 * `tenant_id` NULL là dữ liệu hệ thống; mã unique theo phạm vi bằng 2 partial
 * index. Unique mã module deferred để lưu cả danh sách module trong 1
 * transaction mà đổi chéo mã được.
 */
export class CreateExamCatalog1789565466681 implements MigrationInterface {
  name = 'CreateExamCatalog1789565466681';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "exam_categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid,
        "name" character varying(100) NOT NULL,
        "code" character varying(32) NOT NULL,
        "description" text,
        "icon" character varying(32) NOT NULL DEFAULT 'book-open',
        "color" character varying(16) NOT NULL DEFAULT 'blue',
        "sort_order" integer NOT NULL DEFAULT '0',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_exam_categories_color" CHECK ("color" IN ('yellow', 'orange', 'red', 'magenta', 'violet', 'blue', 'cyan', 'green')),
        CONSTRAINT "CHK_exam_categories_icon" CHECK ("icon" IN ('languages', 'globe', 'book-open', 'graduation-cap', 'library', 'award', 'headphones', 'mic', 'pen-line', 'message-circle', 'file-text', 'brain')),
        CONSTRAINT "CHK_exam_categories_code_format" CHECK ("code" ~ '^[A-Z0-9]+([-_][A-Z0-9]+)*$'),
        CONSTRAINT "PK_exam_categories" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_exam_categories_tenant_code" ON "exam_categories" ("tenant_id", "code") WHERE "tenant_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_exam_categories_system_code" ON "exam_categories" ("code") WHERE "tenant_id" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "exam_blueprints" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid,
        "category_id" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "code" character varying(32) NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_exam_blueprints_code_format" CHECK ("code" ~ '^[A-Z0-9]+([-_][A-Z0-9]+)*$'),
        CONSTRAINT "PK_exam_blueprints" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_exam_blueprints_category_id" ON "exam_blueprints" ("category_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_exam_blueprints_tenant_code" ON "exam_blueprints" ("tenant_id", "code") WHERE "tenant_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_exam_blueprints_system_code" ON "exam_blueprints" ("code") WHERE "tenant_id" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "exam_modules" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "blueprint_id" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "code" character varying(32) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT '0',
        "reference_duration_minutes" integer NOT NULL,
        "description" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_exam_modules_blueprint_code" UNIQUE ("blueprint_id", "code") DEFERRABLE INITIALLY DEFERRED,
        CONSTRAINT "CHK_exam_modules_reference_duration" CHECK ("reference_duration_minutes" BETWEEN 5 AND 180 AND "reference_duration_minutes" % 5 = 0),
        CONSTRAINT "CHK_exam_modules_code_format" CHECK ("code" ~ '^[A-Z0-9]+([-_][A-Z0-9]+)*$'),
        CONSTRAINT "PK_exam_modules" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "exam_categories" ADD CONSTRAINT "FK_exam_categories_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_categories" ADD CONSTRAINT "FK_exam_categories_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_categories" ADD CONSTRAINT "FK_exam_categories_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_blueprints" ADD CONSTRAINT "FK_exam_blueprints_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_blueprints" ADD CONSTRAINT "FK_exam_blueprints_category_id" FOREIGN KEY ("category_id") REFERENCES "exam_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_blueprints" ADD CONSTRAINT "FK_exam_blueprints_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_blueprints" ADD CONSTRAINT "FK_exam_blueprints_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_modules" ADD CONSTRAINT "FK_exam_modules_blueprint_id" FOREIGN KEY ("blueprint_id") REFERENCES "exam_blueprints"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // DROP TABLE xoá luôn index và constraint của bảng; bảng con xoá trước.
    await queryRunner.query(`DROP TABLE "exam_modules"`);
    await queryRunner.query(`DROP TABLE "exam_blueprints"`);
    await queryRunner.query(`DROP TABLE "exam_categories"`);
  }
}
