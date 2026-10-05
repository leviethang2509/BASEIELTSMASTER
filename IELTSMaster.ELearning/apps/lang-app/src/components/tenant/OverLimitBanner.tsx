import { TriangleAlert } from 'lucide-react';
import type { MemberQuota } from '@lang/shared';
import { vi } from '@/i18n/vi';

/** Nút/link đặt trong banner cảnh báo. */
export const warningButtonClass =
  'inline-flex shrink-0 items-center rounded-lg border border-[var(--warn-border)] px-3 py-1.5 text-[13px] font-semibold text-[var(--warn-text)] transition hover:bg-[var(--warn-soft)]';

// Tenant vượt giới hạn gói sau khi hạ gói (plan Step 8).
export function OverLimitBanner({
  quota,
  children,
}: {
  quota: MemberQuota;
  children?: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl bg-[var(--warn-soft)] px-3.5 py-2.5 text-[13.5px] text-[var(--warn-text)]"
    >
      <TriangleAlert size={18} className="shrink-0" />
      <p className="min-w-0 flex-1 basis-60">
        {vi.tenantDashboard.overLimit(quota)}
      </p>
      {children}
    </div>
  );
}
