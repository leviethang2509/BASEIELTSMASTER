import { Logger } from '@nestjs/common';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  SystemRole,
  normalizeEmail,
} from '@lang/shared';
import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  validateSync,
} from 'class-validator';
import { hashPassword } from '../auth/password';
import { trimString } from '../common/transforms';
import { IsDateOfBirth } from '../common/validators/is-date-of-birth';
import { User } from '../users/user.entity';
import dataSource from './data-source';

const logger = new Logger('SeedOwner');

class SeedOwnerEnv {
  @Transform(trimString)
  @IsEmail()
  SEED_OWNER_EMAIL: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  SEED_OWNER_PASSWORD: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  SEED_OWNER_NAME: string;

  @IsDateOfBirth()
  SEED_OWNER_DOB: string;
}

function readEnv(): SeedOwnerEnv {
  const keys = [
    'SEED_OWNER_EMAIL',
    'SEED_OWNER_PASSWORD',
    'SEED_OWNER_NAME',
    'SEED_OWNER_DOB',
  ] as const;
  const env = plainToInstance(
    SeedOwnerEnv,
    Object.fromEntries(keys.map((key) => [key, process.env[key] ?? ''])),
  );
  const errors = validateSync(env);
  if (errors.length > 0) {
    // Chỉ in tên biến, không in giá trị (có mật khẩu).
    const names = errors.map((error) => error.property).join(', ');
    throw new Error(`Thiếu hoặc sai biến: ${names} (xem .env.example)`);
  }
  return env;
}

/**
 * Tạo System Owner đầu tiên từ `SEED_OWNER_*` trong `.env`. Chạy lại không tạo
 * trùng, không đổi mật khẩu; không tự nâng quyền tài khoản đã có.
 */
async function main() {
  const env = readEnv();
  const email = normalizeEmail(env.SEED_OWNER_EMAIL);

  await dataSource.initialize();
  try {
    const users = dataSource.getRepository(User);
    const existing = await users.findOne({
      where: { email },
      withDeleted: true,
    });
    if (existing) {
      if (
        existing.systemRole === SystemRole.SYSTEM_OWNER &&
        !existing.deletedAt
      ) {
        logger.log(`System Owner ${email} đã tồn tại, bỏ qua`);
        return;
      }
      throw new Error(
        `Email ${email} đã thuộc tài khoản khác (không phải System Owner hoặc đã xoá); không tự nâng quyền`,
      );
    }

    await users.save(
      users.create({
        email,
        passwordHash: await hashPassword(env.SEED_OWNER_PASSWORD),
        fullName: env.SEED_OWNER_NAME,
        dateOfBirth: env.SEED_OWNER_DOB,
        systemRole: SystemRole.SYSTEM_OWNER,
      }),
    );
    logger.log(`Đã tạo System Owner ${email}`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  logger.error(
    'Seed System Owner thất bại',
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
