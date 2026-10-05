import { Logger } from '@nestjs/common';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import dataSource from './data-source';

const logger = new Logger('Migrate');

// Chạy khi container khởi động (trước api) hoặc `pnpm --filter lang-api migrate`.
async function main() {
  const { schema } = dataSource.options as PostgresConnectionOptions;
  await dataSource.initialize();
  try {
    // Schema phải có trước khi TypeORM tạo bảng typeorm_migrations bên trong.
    // Chỉ tạo khi chưa có: CREATE SCHEMA (kể cả IF NOT EXISTS) luôn đòi quyền CREATE
    // trên database, user chỉ có quyền trên schema sẵn có (vd. public) sẽ bị từ chối.
    const existing: unknown[] = await dataSource.query(
      'SELECT 1 FROM pg_namespace WHERE nspname = $1',
      [schema],
    );
    if (existing.length === 0) {
      // Tên schema đã được kiểm tra ký tự ở env.validation.ts.
      await dataSource.query(`CREATE SCHEMA "${schema}"`);
      logger.log(`Đã tạo schema "${schema}"`);
    }

    const applied = await dataSource.runMigrations({ transaction: 'each' });
    if (applied.length === 0) {
      logger.log(`Schema "${schema}" đã ở phiên bản mới nhất`);
    }
    for (const migration of applied) {
      logger.log(`Đã chạy migration ${migration.name}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  logger.error(
    'Migration thất bại',
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
});
