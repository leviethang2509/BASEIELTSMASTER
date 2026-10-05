import { AuthedDashboardShell } from '@/components/dashboard/AuthedDashboardShell';

// Dashboard System Owner/Admin; user khác bị chuyển về /me.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthedDashboardShell
      scope={{ kind: 'system' }}
      currentWorkspaceKey="system"
    >
      {children}
    </AuthedDashboardShell>
  );
}
