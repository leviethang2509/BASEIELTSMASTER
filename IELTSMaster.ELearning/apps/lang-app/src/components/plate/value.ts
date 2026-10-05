import type { Value } from 'platejs';
import { isExamValue, migrateExamValue } from '@lang/exam-core';

export const emptyValue = (): Value => [
  { type: 'p', children: [{ text: '' }] },
];

/**
 * Nội dung từ server / bản nháp / file JSON → Plate Value: nâng indicator đời
 * cũ lên mô hình hiện tại; sai định dạng hoặc rỗng thì trả `null`.
 */
export function toEditorValue(raw: unknown): Value | null {
  if (!isExamValue(raw) || raw.length === 0) return null;
  return migrateExamValue(raw) as Value;
}
