'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { vi } from '@/i18n/vi';

// Popover nhập một con số, neo vào marker của dòng. Cố tình không dùng Modal:
// thao tác lặp lại cho từng dòng trong danh sách nên phải nhẹ tay.

export type NumberMode = 'ordering' | 'polytomous';

interface NumberPopoverProps {
  anchor: HTMLElement;
  mode: NumberMode;
  value?: number;
  /** Các số đã dùng ở dòng khác trong cùng list (chỉ dùng cho `ordering`). */
  taken: number[];
  onSubmit: (value: number | undefined) => void;
  onClose: () => void;
}

export function NumberPopover({
  anchor,
  mode,
  value,
  taken,
  onSubmit,
  onClose,
}: NumberPopoverProps) {
  const text = vi.examEditor.numberPopover;
  const ref = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState(value === undefined ? '' : String(value));
  const [pos, setPos] = useState({ top: -9999, left: -9999 });

  useLayoutEffect(() => {
    const rect = anchor.getBoundingClientRect();
    const width = ref.current?.offsetWidth ?? 240;
    setPos({
      top: rect.bottom + 6,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
    });
  }, [anchor]);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  const trimmed = input.trim();
  const num = Number(trimmed);
  const min = mode === 'ordering' ? 1 : 0;

  let error = '';
  if (trimmed) {
    if (!Number.isInteger(num) || num < min) {
      error = text.invalid(min);
    } else if (mode === 'ordering' && taken.includes(num)) {
      error = text.taken(num);
    }
  }

  const submit = () => {
    if (error) return;
    onSubmit(trimmed ? num : undefined);
  };

  return (
    <div
      ref={ref}
      contentEditable={false}
      style={{ top: pos.top, left: pos.left }}
      className="fixed z-50 w-[264px] rounded-xl border border-[var(--border-strong)] bg-[var(--raised)] p-3 shadow-lg"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <span className="mb-1.5 block text-[12.5px] font-semibold text-[var(--body)]">
        {text.title[mode]}
      </span>
      <input
        autoFocus
        type="number"
        min={min}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
        }}
        className="h-[34px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--sidebar)] px-2.5 text-[14px] text-[var(--heading)] outline-none focus:border-[var(--accent)] focus:bg-[var(--bg)]"
      />
      <p
        className={`mt-1.5 text-[12px] leading-snug ${
          error ? 'text-[var(--danger)]' : 'text-[var(--muted)]'
        }`}
      >
        {error || text.hint[mode]}
      </p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onSubmit(undefined)}
          className="rounded-lg px-2 py-1 text-[12.5px] text-[var(--muted)] transition hover:bg-[var(--hover)]"
        >
          {text.clear}
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border-strong)] px-2.5 py-1 text-[12.5px] font-medium text-[var(--body)] transition hover:bg-[var(--hover)]"
          >
            {vi.common.cancel}
          </button>
          <button
            type="button"
            disabled={!!error}
            onClick={submit}
            className="rounded-lg bg-[var(--accent-bg)] px-3 py-1 text-[12.5px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {text.save}
          </button>
        </div>
      </div>
    </div>
  );
}
