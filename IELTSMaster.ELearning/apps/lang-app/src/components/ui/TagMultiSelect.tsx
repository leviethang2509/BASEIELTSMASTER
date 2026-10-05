'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface TagOption {
  id: string;
  label: string;
  /** Chữ phụ hiển thị mờ bên phải mỗi dòng. */
  sublabel?: string;
}

interface MenuPos {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
}

const MENU_MAX_H = 260;

interface TagMultiSelectProps {
  options: TagOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  /** Hiện ô nhập text trong dropdown để lọc nhanh danh sách. */
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  /** `single` chỉ chọn được một mục (dùng cho bộ lọc). */
  mode?: 'single' | 'multi';
  /** Các mục cố định đứng đầu danh sách, vd `Tất cả`. */
  specialOptions?: { key: string; label: string }[];
  /** Key của special option đang chọn (chỉ dùng với mode `single`). */
  specialValue?: string | null;
  onSpecialChange?: (key: string) => void;
}

/**
 * Dropdown chọn tag dùng chung (copy từ lightc-general, id chuyển sang uuid).
 * Menu render qua portal + `position: fixed` để không bị cắt bởi vùng cuộn và
 * luôn nổi trên cùng.
 */
export function TagMultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Chọn…',
  searchable = false,
  searchPlaceholder = 'Tìm…',
  emptyText = 'Không có mục nào khớp.',
  mode = 'multi',
  specialOptions,
  specialValue,
  onSpecialChange,
}: TagMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState<MenuPos | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.filter((option) => value.includes(option.id));
  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(keyword) ||
        (option.sublabel ?? '').toLowerCase().includes(keyword),
    );
  }, [options, query]);

  const computePosition = useCallback(() => {
    const element = triggerRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeTop = spaceBelow < MENU_MAX_H + 8 && rect.top > spaceBelow;
    setPos({
      left: rect.left,
      width: rect.width,
      top: placeTop ? undefined : rect.bottom + 4,
      bottom: placeTop ? window.innerHeight - rect.top + 4 : undefined,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) computePosition();
  }, [open, value, computePosition]);

  useEffect(() => {
    if (!open) return;
    const handler = () => computePosition();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open, computePosition]);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const pick = (id: string) => {
    if (mode === 'single') {
      onChange([id]);
      setOpen(false);
      return;
    }
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  // Nhãn hiển thị trên trigger ở chế độ single.
  const singleLabel =
    specialOptions?.find((special) => special.key === specialValue)?.label ??
    selected[0]?.label ??
    null;

  return (
    <div ref={triggerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--sidebar)] px-2.5 py-1.5 text-left transition focus:border-[var(--accent)]"
      >
        {mode === 'single' ? (
          <span
            className={`px-1 text-[14px] ${
              singleLabel ? 'text-[var(--heading)]' : 'text-[var(--muted)]'
            }`}
          >
            {singleLabel ?? placeholder}
          </span>
        ) : (
          <>
            {selected.length === 0 && (
              <span className="px-1 text-[14px] text-[var(--muted)]">
                {placeholder}
              </span>
            )}
            {selected.map((option) => (
              <span
                key={option.id}
                className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[12.5px] font-medium text-[var(--accent)]"
              >
                {option.label}
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(event) => {
                    event.stopPropagation();
                    pick(option.id);
                  }}
                  className="grid place-items-center rounded hover:bg-[var(--hover)]"
                >
                  <X size={13} />
                </span>
              </span>
            ))}
          </>
        )}
        <ChevronDown
          size={16}
          className={`ml-auto shrink-0 text-[var(--muted)] transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              left: pos.left,
              width: pos.width,
              top: pos.top,
              bottom: pos.bottom,
              maxHeight: MENU_MAX_H,
            }}
            className="z-[70] flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[0_10px_26px_var(--shadow-2)]"
          >
            {searchable && (
              <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-2.5 py-2">
                <Search size={15} className="shrink-0 text-[var(--muted)]" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[var(--heading)] outline-none placeholder:text-[var(--muted)]"
                />
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-auto p-1">
              {specialOptions?.map((special) => (
                <button
                  key={special.key}
                  type="button"
                  onClick={() => {
                    onSpecialChange?.(special.key);
                    onChange([]);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] transition hover:bg-[var(--hover)] ${
                    specialValue === special.key
                      ? 'font-semibold text-[var(--accent)]'
                      : 'text-[var(--body)]'
                  }`}
                >
                  {special.label}
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="px-2.5 py-3 text-[13px] text-[var(--muted)]">
                  {emptyText}
                </div>
              )}

              {filtered.map((option) => {
                const checked = value.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onSpecialChange?.('');
                      pick(option.id);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] text-[var(--body)] transition hover:bg-[var(--hover)]"
                  >
                    {mode === 'multi' && (
                      <span
                        className={`grid h-4 w-4 shrink-0 place-items-center rounded border transition ${
                          checked
                            ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-white'
                            : 'border-[var(--border-strong)] text-transparent'
                        }`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                    <span
                      className={`flex-1 ${
                        mode === 'single' && checked
                          ? 'font-semibold text-[var(--accent)]'
                          : ''
                      }`}
                    >
                      {option.label}
                    </span>
                    {option.sublabel && (
                      <span className="text-[12px] text-[var(--muted)]">
                        {option.sublabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
