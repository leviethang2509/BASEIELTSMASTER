'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';
import type { OutlineItem } from '@lang/exam-core';
import { vi } from '@/i18n/vi';

// Mini map đi theo indicator: click để cuộn tới, và tự sáng mục đang xem.

interface MinimapProps {
  items: OutlineItem[];
  /** Vùng cuộn của editor — dùng làm root cho IntersectionObserver. */
  scrollerRef: React.RefObject<HTMLDivElement>;
  /** Tab ẩn thì không theo dõi. */
  active: boolean;
}

export function Minimap({ items, scrollerRef, active }: MinimapProps) {
  const text = vi.examEditor.minimap;
  const [activeId, setActiveId] = useState<string | null>(null);
  const visibleRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const root = scrollerRef.current;
    if (!active || !root || !items.length) {
      setActiveId(null);
      return;
    }

    const visible = visibleRef.current;
    visible.clear();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.indicatorId;
          if (!id) continue;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        // Mục đang xem = indicator đầu tiên (theo thứ tự bài) còn nhìn thấy.
        setActiveId(items.find((item) => visible.has(item.id))?.id ?? null);
      },
      { root, rootMargin: '0px 0px -55% 0px', threshold: 0 },
    );

    items.forEach((item) => {
      const el = root.querySelector(`[data-indicator-id="${item.id}"]`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [active, items, scrollerRef]);

  return (
    <aside className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--sidebar)]">
      <div className="border-b border-[var(--border)] px-3.5 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
        {text.title(items.length)}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-1.5">
        {items.length === 0 ? (
          <p className="px-2 py-3 text-[13px] leading-relaxed text-[var(--muted)]">
            {text.empty}
          </p>
        ) : (
          items.map((item) => {
            const current = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  scrollerRef.current
                    ?.querySelector(`[data-indicator-id="${item.id}"]`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                style={{ paddingLeft: 10 + item.depth * 14 }}
                className={`mb-0.5 flex w-full items-center gap-2 rounded-lg py-1.5 pr-2.5 text-left transition ${
                  current
                    ? 'bg-[var(--accent-soft)]'
                    : 'hover:bg-[var(--hover)]'
                }`}
              >
                <span
                  className="ls-tint ls-tint-dot h-2 w-2 shrink-0 rounded-full"
                  style={{ '--tint-raw': item.color } as CSSProperties}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[13px] ${
                      current
                        ? 'font-semibold text-[var(--accent)]'
                        : 'text-[var(--body)]'
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.sub && (
                    <span className="block truncate text-[11.5px] text-[var(--muted)]">
                      {item.sub}
                    </span>
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
