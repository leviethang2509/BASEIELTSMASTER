import { normalizeEmail } from '@lang/shared';

type TransformArgs = { value: unknown };

/** `@Transform` bỏ khoảng trắng hai đầu cho giá trị chuỗi. */
export const trimString = ({ value }: TransformArgs) =>
  typeof value === 'string' ? value.trim() : value;

/** Bỏ khoảng trắng hai đầu; chuỗi rỗng thành `null` (trường tuỳ chọn để trống). */
export const trimToNull = ({ value }: TransformArgs) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** Chuỗi rỗng coi như không gửi (vd. mật khẩu tạm để trống). */
export const emptyToUndefined = ({ value }: TransformArgs) =>
  value === '' ? undefined : value;

/** Chuẩn hoá email bằng `normalizeEmail`. */
export const toEmail = ({ value }: TransformArgs) =>
  typeof value === 'string' ? normalizeEmail(value) : value;
