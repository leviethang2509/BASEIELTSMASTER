import { randomBytes, randomInt } from 'node:crypto';
import { compare, hash } from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

// Bỏ ký tự dễ nhầm (0/O, 1/l/I) vì mật khẩu tạm thường được đọc hoặc chép tay.
const TEMPORARY_PASSWORD_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const TEMPORARY_PASSWORD_LENGTH = 12;

/** Mật khẩu tạm ngẫu nhiên cho account do Tenant Owner/Admin tạo. */
export function generateTemporaryPassword(): string {
  return Array.from(
    { length: TEMPORARY_PASSWORD_LENGTH },
    () =>
      TEMPORARY_PASSWORD_ALPHABET[
        randomInt(TEMPORARY_PASSWORD_ALPHABET.length)
      ],
  ).join('');
}

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, passwordHash: string) {
  return compare(plain, passwordHash);
}

let dummyHash: Promise<string> | undefined;

/**
 * Hash ngẫu nhiên để vẫn chạy bcrypt khi email không tồn tại, tránh dò email
 * qua thời gian phản hồi của đăng nhập.
 */
export function getDummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
  return dummyHash;
}
