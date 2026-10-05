'use client';

import type { CSSProperties } from 'react';

export interface SlashItem {
  key: string;
  label: string;
  hint: string;
  color?: string;
  run: () => void;
}

interface SlashMenuProps {
  items: SlashItem[];
  activeIndex: number;
  position: { top: number; left: number };
  onSelect: (item: SlashItem) => void;
}

/** Menu chèn nhanh khi gõ `/` — bám theo vị trí con trỏ. */
export function SlashMenu({
  items,
  activeIndex,
  position,
  onSelect,
}: SlashMenuProps) {
  if (!items.length) return null;
  return (
    <div
      role="listbox"
      style={{ top: position.top, left: position.left }}
      className="fixed z-40 max-h-[280px] w-[280px] overflow-auto rounded-xl border border-[var(--border-strong)] bg-[var(--raised)] p-1.5 shadow-lg"
    >
      {items.map((item, index) => (
        <button
          key={item.key}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(item);
          }}
          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition ${
            index === activeIndex ? 'bg-[var(--hover)]' : ''
          }`}
        >
          {item.color && (
            <span
              className="ls-tint ls-tint-dot h-2 w-2 shrink-0 rounded-full"
              style={{ '--tint-raw': item.color } as CSSProperties}
            />
          )}
          <span className="flex-1 text-[13.5px] text-[var(--body)]">
            {item.label}
          </span>
          <span className="text-[11.5px] text-[var(--muted)]">{item.hint}</span>
        </button>
      ))}
    </div>
  );
}
