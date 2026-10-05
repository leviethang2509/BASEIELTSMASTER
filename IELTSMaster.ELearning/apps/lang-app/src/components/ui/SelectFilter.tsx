'use client';

// Bộ lọc một giá trị trên thanh công cụ; giá trị rỗng nghĩa là "tất cả".
export function SelectFilter<T extends string>({
  value,
  allLabel,
  options,
  onChange,
}: {
  value: T | '';
  allLabel: string;
  options: { value: T; label: string }[];
  onChange: (value: T | '') => void;
}) {
  return (
    <select
      value={value}
      aria-label={allLabel}
      onChange={(event) => onChange(event.target.value as T | '')}
      className="rounded-xl border border-[var(--border-strong)] bg-[var(--sidebar)] px-3 py-2.5 text-[13.5px] font-medium text-[var(--body)] outline-none transition focus:border-[var(--accent)]"
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
