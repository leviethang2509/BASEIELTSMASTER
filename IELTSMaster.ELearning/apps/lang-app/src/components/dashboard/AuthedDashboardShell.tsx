'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { RequireAuth } from '@/components/auth/RequireAuth';
import type { NavScope } from '@/config/navigation';
import { DashboardShell } from './DashboardShell';

interface AuthedDashboardShellProps {
  scope: NavScope;
  currentWorkspaceKey: string;
  children: React.ReactNode;
}

/** `DashboardShell` lấy user/không gian từ AuthProvider; `/admin` chỉ cho Owner/Admin. */
export function AuthedDashboardShell(props: AuthedDashboardShellProps) {
  return (
    <RequireAuth systemManager={props.scope.kind === 'system'}>
      <DashboardShellWithUser {...props} />
    </RequireAuth>
  );
}

/** Dùng bên trong `RequireAuth`. */
export function DashboardShellWithUser({
  scope,
  currentWorkspaceKey,
  children,
}: AuthedDashboardShellProps) {
  const { user, contexts, logout } = useAuth();
  return (
    <DashboardShell
      scope={scope}
      user={user}
      workspaces={contexts}
      currentWorkspaceKey={currentWorkspaceKey}
      onLogout={() => void logout()}
    >
      {children}
    </DashboardShell>
  );
}
