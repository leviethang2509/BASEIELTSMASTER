import { DURATION_MAX_MINUTES, DURATION_STEP_MINUTES } from '@lang/shared';

/** Escape `%`, `_`, `\` để tìm kiếm LIKE/ILIKE theo đúng chuỗi người dùng nhập. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

/** Biểu thức CHECK `"column" IN ('a', 'b')` từ object enum `as const`. */
export function sqlInList(
  column: string,
  values: Record<string, string>,
): string {
  return `"${column}" IN (${Object.values(values)
    .map((value) => `'${value}'`)
    .join(', ')})`;
}

/** CHECK thời lượng phút: bội số 5, từ 5 tới 180 (`isValidDurationMinutes`). */
export function sqlDurationMinutes(column: string): string {
  return `"${column}" BETWEEN ${DURATION_STEP_MINUTES} AND ${DURATION_MAX_MINUTES} AND "${column}" % ${DURATION_STEP_MINUTES} = 0`;
}

/** Postgres trả `numeric` dạng chuỗi; đổi về number khi đọc. */
export const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};
