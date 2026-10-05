const toneClass = {
  neutral: 'bg-[var(--hover)] text-[var(--body)]',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent)]',
  success: 'bg-[var(--ok-soft)] text-[var(--ok-text)]',
  warning: 'bg-[var(--warn-soft)] text-[var(--warn-text)]',
  danger: 'bg-[var(--danger-bg)] text-[var(--danger)]',
} as const;

export type BadgeTone = keyof typeof toneClass;

// Nhãn nhỏ cho trạng thái/vai trò trong bảng.
export function Badge({
  tone = 'neutral',
  title,
  children,
}: {
  tone?: BadgeTone;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-semibold ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}
