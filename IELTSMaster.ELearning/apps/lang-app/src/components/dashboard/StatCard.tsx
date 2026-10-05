import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  /** `null` khi chưa có số liệu. */
  value: number | string | null;
  icon: LucideIcon;
  /** Bấm vào thẻ để tới trang chi tiết. */
  href?: string;
}

const cardClass =
  'flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4';

export function StatCard({ label, value, icon, href }: StatCardProps) {
  if (href) {
    return (
      <Link
        href={href}
        className={`${cardClass} transition hover:border-[var(--accent)]`}
      >
        <StatCardBody label={label} value={value} icon={icon} />
      </Link>
    );
  }
  return (
    <div className={cardClass}>
      <StatCardBody label={label} value={value} icon={icon} />
    </div>
  );
}

function StatCardBody({
  label,
  value,
  icon: Icon,
}: Omit<StatCardProps, 'href'>) {
  return (
    <>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon size={20} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] text-[var(--muted)]">{label}</span>
        <span className="block text-[22px] font-bold text-[var(--heading)]">
          {typeof value === 'number'
            ? value.toLocaleString('vi-VN')
            : (value ?? '—')}
        </span>
      </span>
    </>
  );
}
