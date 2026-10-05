import { PASSWORD_MIN_LENGTH } from '@lang/shared';

export type PasswordStrength = 0 | 1 | 2 | 3;

/**
 * Độ mạnh mật khẩu theo design/Auth.html: đủ độ dài, có cả chữ hoa và chữ
 * thường, có số hoặc ký tự đặc biệt. Chỉ để gợi ý, không chặn khi gửi.
 */
export function passwordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]|[^\w\s]/.test(password)) score += 1;
  return score as PasswordStrength;
}
