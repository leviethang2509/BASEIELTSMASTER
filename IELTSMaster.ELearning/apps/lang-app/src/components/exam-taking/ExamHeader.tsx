import Link from 'next/link';
import { X } from 'lucide-react';
import { vi } from '@/i18n/vi';

/** Thanh trên cùng của trang thi: tên đề, section đang làm, phần bên phải (đồng hồ). */
export function ExamHeader({
  examTitle,
  sectionLabel,
  exitHref,
  onExit,
  children,
}: {
  examTitle: string;
  sectionLabel: string;
  exitHref: string;
  onExit?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-3 py-2 sm:px-5">
      <Link
        prefetch={false}
        href={exitHref}
        onClick={onExit}
        title={vi.examTaking.exit}
        aria-label={vi.examTaking.exit}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--accent)]"
      >
        <X size={18} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] text-[var(--muted)]">{examTitle}</p>
        <p className="truncate text-[14.5px] font-semibold text-[var(--heading)]">
          {sectionLabel}
        </p>
      </div>
      {children && (
        <div className="flex shrink-0 items-center gap-3">{children}</div>
      )}
    </header>
  );
}
