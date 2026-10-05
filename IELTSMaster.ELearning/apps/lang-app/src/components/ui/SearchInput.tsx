'use client';

import { Search } from 'lucide-react';

// Ô tìm kiếm của thanh công cụ danh sách (theo toolbar của lightc-general).
export function SearchInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-[220px] flex-1 items-center rounded-xl border border-[var(--border-strong)] bg-[var(--sidebar)] transition focus-within:border-[var(--accent)]">
      <Search size={18} className="ml-3 shrink-0 text-[var(--muted)]" />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent px-2.5 py-2.5 text-[14px] text-[var(--heading)] outline-none placeholder:text-[var(--muted)]"
      />
    </label>
  );
}
