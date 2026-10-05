import { DEFAULT_TIMEZONE } from '@lang/shared';

/** Ngày từ chuỗi ISO, theo giờ Việt Nam (vd. 15/09/2026). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', {
    timeZone: DEFAULT_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Ngày giờ từ chuỗi ISO, theo giờ Việt Nam (vd. 22:05 15/09/2026). */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    timeZone: DEFAULT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Giá lưu dạng chuỗi `numeric`; `null` là chưa đặt giá. */
export function formatPrice(price: string | null): string {
  return price === null ? '—' : `${Number(price).toLocaleString('vi-VN')} ₫`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('vi-VN');
}

/** Dung lượng file (vd. 320 KB, 12,4 MB). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} KB`;
  }
  return `${(kb / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} MB`;
}
