'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  FileText,
  Monitor,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { vi } from '@/i18n/vi';
import { useTheme } from './ThemeProvider';
import { THEME_PREFS, ThemePref } from './theme';

const text = vi.theme;

const ICONS: Record<ThemePref, LucideIcon> = {
  [ThemePref.LIGHT]: Sun,
  [ThemePref.SOLARIZED_LIGHT]: FileText,
  [ThemePref.DARK]: Moon,
  [ThemePref.SYSTEM]: Monitor,
};

/**
 * Nút đổi giao diện ở góc phải header. Icon theo **lựa chọn** (không theo bảng
 * màu đang áp) để server và client render giống nhau: bảng màu của `system`
 * chỉ biết được sau khi có `matchMedia`.
 */
export function ThemeToggle() {
  const { pref, setPref } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const Icon = ICONS[pref];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={text.current(text.names[pref])}
        title={text.current(text.names[pref])}
        className="grid h-9 w-9 place-items-center rounded-[10px] text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--accent)]"
      >
        <Icon size={18} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-[210px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] py-1 shadow-[0_10px_26px_var(--shadow-2)]"
        >
          <div className="px-3 pb-1 pt-0.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
            {text.label}
          </div>
          {THEME_PREFS.map((option) => {
            const OptionIcon = ICONS[option];
            const active = option === pref;
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setPref(option);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-[var(--hover)] ${
                  active ? 'text-[var(--accent)]' : 'text-[var(--body)]'
                }`}
              >
                <OptionIcon size={16} className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium">
                    {text.names[option]}
                  </span>
                  <span className="block text-[11.5px] text-[var(--muted)]">
                    {text.hints[option]}
                  </span>
                </span>
                {active && <Check size={15} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
