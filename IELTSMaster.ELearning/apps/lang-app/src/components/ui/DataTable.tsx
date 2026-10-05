'use client';

import { Loader2 } from 'lucide-react';
import { vi } from '@/i18n/vi';

export interface DataColumn<T> {
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /**
   * Class `sm:grid-cols-[…]` viết nguyên văn ở nơi gọi để Tailwind sinh được
   * class (không ghép chuỗi động).
   */
  gridClass: string;
  loading: boolean;
  emptyText: string;
  footer?: React.ReactNode;
}

// Bảng dạng lưới theo OxfordTable của lightc-general: header dính, thân tự
// cuộn; trên mobile mỗi dòng xếp dọc, ô kèm nhãn cột.
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  gridClass,
  loading,
  emptyText,
  footer,
}: DataTableProps<T>) {
  return (
    <div className="flex min-h-[240px] flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <div
        className={`hidden ${gridClass} items-center gap-3 border-b border-[var(--border)] bg-[var(--sidebar)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted)] sm:grid`}
      >
        {columns.map((column) => (
          <div key={column.header} className={column.className}>
            {column.header}
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            className={`flex flex-col gap-2 border-b border-[var(--border)] px-4 py-3 transition hover:bg-[var(--hover)] sm:grid ${gridClass} sm:items-center sm:gap-3`}
          >
            {columns.map((column, index) => (
              <div
                key={column.header}
                className={`min-w-0 ${column.className ?? ''}`}
              >
                {index > 0 && (
                  <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted)] sm:hidden">
                    {column.header}
                  </span>
                )}
                {column.render(row)}
              </div>
            ))}
          </div>
        ))}

        {rows.length === 0 && !loading && (
          <div className="grid place-items-center py-16 text-[14px] text-[var(--muted)]">
            {emptyText}
          </div>
        )}
        {rows.length === 0 && loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-[14px] text-[var(--muted)]">
            <Loader2 size={18} className="animate-spin" /> {vi.common.loading}
          </div>
        )}
      </div>

      {footer}
    </div>
  );
}
