const toneClass = {
  error:
    'bg-[var(--danger-bg)] text-[var(--danger)] ring-[var(--danger-border)]',
  success: 'bg-[var(--ok-soft)] text-[var(--ok-text)] ring-[var(--ok-border)]',
  warning:
    'bg-[var(--warn-soft)] text-[var(--warn-text)] ring-[var(--warn-border)]',
  info: 'bg-[var(--info-soft)] text-[var(--info-text)] ring-[var(--info-border)]',
} as const;

// Thông báo lỗi/cảnh báo/thành công/thông tin (dưới form, đầu trang).
export function FormAlert({
  tone,
  children,
}: {
  tone: keyof typeof toneClass;
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-xl px-3.5 py-2.5 text-sm ring-1 ${toneClass[tone]}`}
    >
      {children}
    </div>
  );
}
