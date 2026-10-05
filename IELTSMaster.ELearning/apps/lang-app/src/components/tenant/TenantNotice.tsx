import {
  Ban,
  Building2,
  Hourglass,
  Lock,
  ShieldX,
  type LucideIcon,
} from 'lucide-react';
import { vi } from '@/i18n/vi';

export type TenantNoticeKind = keyof typeof vi.tenantAccess;

const ICONS: Record<TenantNoticeKind, LucideIcon> = {
  notFound: Building2,
  pending: Hourglass,
  rejected: Ban,
  suspended: Lock,
  noDashboard: ShieldX,
};

// Thông báo khi không vào được tenant (không tìm thấy, chưa hoạt động, thiếu quyền).
export function TenantNotice({
  kind,
  children,
}: {
  kind: Exclude<TenantNoticeKind, 'active'> | 'active';
  /** Nút điều hướng. */
  children?: React.ReactNode;
}) {
  // `active` không phải trạng thái chặn; phòng khi truyền nhầm thì coi như không tìm thấy.
  const key: TenantNoticeKind = kind === 'active' ? 'notFound' : kind;
  const Icon = ICONS[key];
  const text = vi.tenantAccess[key];
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon size={26} />
      </span>
      <h1 className="mt-5 text-[22px] font-bold text-[var(--heading)]">
        {text.title}
      </h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--body)]">
        {text.text}
      </p>
      {children && (
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {children}
        </div>
      )}
    </div>
  );
}
