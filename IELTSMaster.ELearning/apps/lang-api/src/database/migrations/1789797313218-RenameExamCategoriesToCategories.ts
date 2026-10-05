import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Danh mục dùng chung cho đề thi và bài học (req-3 Step 1): đổi tên bảng
 * `exam_categories` → `categories` cùng PK, unique index, CHECK và FK của bảng.
 * Viết tay vì `migration:generate` coi đổi tên bảng là xoá + tạo mới. Dữ liệu
 * và FK `exam_blueprints.category_id` (theo OID bảng) giữ nguyên.
 */
export class RenameExamCategoriesToCategories1789797313218 implements MigrationInterface {
  name = 'RenameExamCategoriesToCategories1789797313218';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await rename(queryRunner, 'exam_categories', 'categories');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await rename(queryRunner, 'categories', 'exam_categories');
  }
}

const CONSTRAINTS = [
  'PK_{t}',
  'CHK_{t}_color',
  'CHK_{t}_icon',
  'CHK_{t}_code_format',
  'FK_{t}_tenant_id',
  'FK_{t}_created_by',
  'FK_{t}_updated_by',
];

const INDEXES = ['UQ_{t}_tenant_code', 'UQ_{t}_system_code'];

async function rename(
  queryRunner: QueryRunner,
  from: string,
  to: string,
): Promise<void> {
  const named = (pattern: string, table: string) =>
    pattern.replace('{t}', table);

  await queryRunner.query(`ALTER TABLE "${from}" RENAME TO "${to}"`);
  for (const pattern of CONSTRAINTS) {
    await queryRunner.query(
      `ALTER TABLE "${to}" RENAME CONSTRAINT "${named(pattern, from)}" TO "${named(pattern, to)}"`,
    );
  }
  for (const pattern of INDEXES) {
    await queryRunner.query(
      `ALTER INDEX "${named(pattern, from)}" RENAME TO "${named(pattern, to)}"`,
    );
  }
}
