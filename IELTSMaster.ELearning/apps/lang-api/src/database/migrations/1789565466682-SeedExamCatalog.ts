import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Danh mục/loại đề mẫu của hệ thống (plan giả định 12). Chỉ thêm mục có mã
 * chưa tồn tại và chỉ thêm module cho loại đề chưa có module, để không ghi đè
 * dữ liệu System Admin đã sửa.
 */
export class SeedExamCatalog1789565466682 implements MigrationInterface {
  name = 'SeedExamCatalog1789565466682';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "exam_categories" ("code", "name", "icon", "color", "sort_order")
      VALUES
        ('EN', 'Tiếng Anh', 'languages', 'blue', 1),
        ('JA', 'Tiếng Nhật', 'languages', 'red', 2)
      ON CONFLICT ("code") WHERE "tenant_id" IS NULL DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "exam_blueprints" ("category_id", "code", "name")
      SELECT c."id", v."code", v."name"
      FROM (VALUES
        ('EN', 'TOEIC', 'TOEIC'),
        ('EN', 'IELTS', 'IELTS'),
        ('JA', 'JLPT_N2', 'JLPT N2')
      ) AS v("category_code", "code", "name")
      JOIN "exam_categories" c
        ON c."code" = v."category_code" AND c."tenant_id" IS NULL
      ON CONFLICT ("code") WHERE "tenant_id" IS NULL DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "exam_modules"
        ("blueprint_id", "code", "name", "sort_order", "reference_duration_minutes")
      SELECT b."id", v."code", v."name", v."sort_order", v."minutes"
      FROM (VALUES
        ('TOEIC', 'LISTENING', 'Listening', 0, 45),
        ('TOEIC', 'READING', 'Reading', 1, 75),
        ('IELTS', 'LISTENING', 'Listening', 0, 30),
        ('IELTS', 'READING', 'Reading', 1, 60),
        ('IELTS', 'WRITING', 'Writing', 2, 60),
        ('IELTS', 'SPEAKING', 'Speaking', 3, 15),
        ('JLPT_N2', 'LANGUAGE_READING', 'Kiến thức ngôn ngữ & Đọc hiểu', 0, 105),
        ('JLPT_N2', 'LISTENING', 'Nghe hiểu', 1, 50)
      ) AS v("blueprint_code", "code", "name", "sort_order", "minutes")
      JOIN "exam_blueprints" b
        ON b."code" = v."blueprint_code" AND b."tenant_id" IS NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM "exam_modules" m WHERE m."blueprint_id" = b."id"
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Module xoá theo CASCADE; danh mục còn loại đề (kể cả của tenant) thì giữ lại.
    await queryRunner.query(`
      DELETE FROM "exam_blueprints"
      WHERE "tenant_id" IS NULL AND "code" IN ('TOEIC', 'IELTS', 'JLPT_N2')
    `);
    await queryRunner.query(`
      DELETE FROM "exam_categories" c
      WHERE c."tenant_id" IS NULL AND c."code" IN ('EN', 'JA')
        AND NOT EXISTS (
          SELECT 1 FROM "exam_blueprints" b WHERE b."category_id" = c."id"
        )
    `);
  }
}
