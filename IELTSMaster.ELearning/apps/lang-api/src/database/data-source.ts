import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.validation';
import { buildDataSourceOptions } from './database.config';

// DataSource cho TypeORM CLI (migration:generate/revert) và script migrate.
// Dev đọc `.env` của lang-api; production nhận biến môi trường từ container.
const envFile = join(__dirname, '../../.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const env = validateEnv(process.env);

export default new DataSource({
  ...buildDataSourceOptions(env),
  entities: [join(__dirname, '../**/*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations/*.{ts,js}')],
});
