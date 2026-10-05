'use client';

import { createContext, useContext } from 'react';
import Link from 'next/link';
import {
  TENANT_DASHBOARD_ROLES,
  TenantStatus,
  hasAnyRole,
  type MeTenantContext,
} from '@lang/shared';
import { useAuth } from '@/components/auth/AuthProvider';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { TenantNotice } from '@/components/tenant/TenantNotice';
import {
  compactPrimaryButtonClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { DashboardShellWithUser } from './AuthedDashboardShell';

const TenantDashboardContext = createContext<MeTenantContext | null>(null);

/** Tenant và membership của dashboard đang mở (từ `GET /me/contexts`). */
export function useTenantDashboard(): MeTenantContext {
  const value = useContext(TenantDashboardContext);
  if (!value) {
    throw new Error('useTenantDashboard phải nằm trong TenantDashboardShell');
  }
  return value;
}

/**
 * Dashboard tenant: menu theo role thật của membership. Student/Parent, người
 * ngoài và tenant chưa hoạt động thấy thông báo thay cho dashboard. Chỉ là lớp
 * giao diện, API vẫn kiểm bằng `TenantGuard`.
 */
export function TenantDashboardShell({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <TenantGate slug={slug.toLowerCase()}>{children}</TenantGate>
    </RequireAuth>
  );
}

function TenantGate({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const { tenantContexts, contextsReady } = useAuth();

  if (!contextsReady) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-[14px] text-[var(--muted)]">
        {vi.common.loading}
      </div>
    );
  }

  const context = tenantContexts.find((item) => item.tenant.slug === slug);
  const backToMe = (
    <Link href="/me" className={secondaryButtonClass}>
      {vi.site.myWorkspace}
    </Link>
  );

  if (!context || context.tenant.status !== TenantStatus.ACTIVE) {
    return (
      <div className="grid min-h-screen place-items-center">
        <TenantNotice kind={context?.tenant.status ?? 'notFound'}>
          {backToMe}
        </TenantNotice>
      </div>
    );
  }
  if (!hasAnyRole(context.roles, TENANT_DASHBOARD_ROLES)) {
    return (
      <div className="grid min-h-screen place-items-center">
        <TenantNotice kind="noDashboard">
          <Link href={`/t/${slug}`} className={compactPrimaryButtonClass}>
            {vi.me.openTenant}
          </Link>
          {backToMe}
        </TenantNotice>
      </div>
    );
  }

  return (
    <TenantDashboardContext.Provider value={context}>
      <DashboardShellWithUser
        scope={{ kind: 'tenant', slug, roles: context.roles }}
        currentWorkspaceKey={`tenant:${slug}`}
      >
        {children}
      </DashboardShellWithUser>
    </TenantDashboardContext.Provider>
  );
}
