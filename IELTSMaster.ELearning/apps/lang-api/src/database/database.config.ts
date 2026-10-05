import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { EnvironmentVariables } from '../config/env.validation';

export type DatabaseEnv = Pick<
  EnvironmentVariables,
  | 'DB_HOST'
  | 'DB_PORT'
  | 'DB_USERNAME'
  | 'DB_PASSWORD'
  | 'DB_NAME'
  | 'DB_SCHEMA'
  | 'DB_LOGGING'
>;

/** Cấu hình kết nối dùng chung cho Nest app, TypeORM CLI và script migrate. */
export function buildDataSourceOptions(
  env: DatabaseEnv,
): PostgresConnectionOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    // Mọi bảng nằm trong schema riêng, không đụng `public` của lightc-general.
    schema: env.DB_SCHEMA,
    applicationName: 'lang-api',
    synchronize: false,
    migrationsRun: false,
    migrationsTableName: 'typeorm_migrations',
    logging: env.DB_LOGGING,
    // uuid sinh bằng gen_random_uuid() có sẵn từ Postgres 13; không tự tạo
    // extension vì DB user trên VPS có thể không có quyền.
    uuidExtension: 'pgcrypto',
    installExtensions: false,
  };
}
