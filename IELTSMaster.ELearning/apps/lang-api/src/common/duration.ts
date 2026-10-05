/** Thời lượng dạng `<số dương><s|m|h|d>`, vd. `15m`, `30d`. */
export const DURATION_PATTERN = /^[1-9]\d*(s|m|h|d)$/;

const UNIT_SECONDS = { s: 1, m: 60, h: 3600, d: 86400 } as const;

/** Đổi thời lượng (`15m`, `30d`…) sang số giây. */
export function durationToSeconds(value: string): number {
  const match = DURATION_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Thời lượng không hợp lệ: ${value}`);
  }
  const unit = match[1] as keyof typeof UNIT_SECONDS;
  return Number.parseInt(value, 10) * UNIT_SECONDS[unit];
}
