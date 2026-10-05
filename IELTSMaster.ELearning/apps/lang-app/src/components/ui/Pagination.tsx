'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { vi } from '@/i18n/vi';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

// Phân trang cho danh sách dài — hiển thị khoảng đang xem, nút Trước/Sau và ô
// nhảy tới số trang.
export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [input, setInput] = useState(String(page));

  useEffect(() => setInput(String(page)), [page]);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const go = (next: number) => {
    const clamped = Math.min(Math.max(1, next), totalPages);
    if (clamped !== page) onChange(clamped);
    else setInput(String(page));
  };

  const buttonClass =
    'grid h-8 w-8 place-items-center rounded-lg border border-[var(--border-strong)] text-[var(--body)] transition hover:bg-[var(--hover)] disabled:opacity-40 disabled:hover:bg-transparent';

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-3 py-2.5 text-[13px] text-[var(--muted)]">
      <div>
        {from.toLocaleString('vi-VN')}–{to.toLocaleString('vi-VN')} /{' '}
        <span className="font-semibold text-[var(--body)]">
          {total.toLocaleString('vi-VN')}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          aria-label={vi.pagination.previous}
          className={buttonClass}
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-1.5">
          <input
            value={input}
            onChange={(event) =>
              setInput(event.target.value.replace(/\D/g, ''))
            }
            onBlur={() => go(Number(input) || page)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') go(Number(input) || page);
            }}
            aria-label={vi.pagination.pageNumber}
            className="h-8 w-12 rounded-lg border border-[var(--border-strong)] bg-[var(--sidebar)] text-center text-[13px] text-[var(--heading)] outline-none transition focus:border-[var(--accent)]"
          />
          <span>/ {totalPages.toLocaleString('vi-VN')}</span>
        </div>

        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          aria-label={vi.pagination.next}
          className={buttonClass}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
