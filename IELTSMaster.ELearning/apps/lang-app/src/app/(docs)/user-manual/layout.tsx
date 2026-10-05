import type { Metadata } from 'next';
import { UserManualShell } from '@/components/user-manual/UserManualShell';
import { vi } from '@/i18n/vi';

export const metadata: Metadata = {
  title: `${vi.userManual.title} · ${vi.app.name}`,
};

// Tài liệu nội bộ (req-2): layout riêng kiểu trang docs, chỉ System Owner/Admin.
export default function UserManualLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UserManualShell>{children}</UserManualShell>;
}
