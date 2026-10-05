import { QueryFailedError } from 'typeorm';

function hasPostgresCode(error: unknown, code: string): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === code
  );
}

/** Lỗi vi phạm unique của Postgres (vd. hai request tạo cùng email/slug). */
export function isUniqueViolation(error: unknown): boolean {
  return hasPostgresCode(error, '23505');
}

/** Lỗi vi phạm khoá ngoại (vd. xoá bản ghi vẫn đang được tham chiếu). */
export function isForeignKeyViolation(error: unknown): boolean {
  return hasPostgresCode(error, '23503');
}
