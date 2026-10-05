'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Plus,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import {
  TENANT_DASHBOARD_ROLES,
  TenantStatus,
  hasAnyRole,
  type MeTenantContext,
  type OwnedTenant,
} from '@lang/shared';
import { useAuth } from '@/components/auth/AuthProvider';
import { TenantAvatar } from '@/components/tenant/TenantAvatar';
import { TENANT_STATUS_TONE } from '@/components/tenant/tenant-status';
import {
  Badge,
  compactPrimaryButtonClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { isSystemManager } from '@/lib/auth-redirect';

function WorkspaceCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 transition hover:border-[var(--border-strong)] hover:shadow-[0_6px_18px_var(--shadow-1)]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-[var(--heading)]">
          {title}
        </span>
        <span className="mt-0.5 block text-[13.5px] text-[var(--body)]">
          {description}
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-[var(--muted)]" />
    </Link>
  );
}

const STATUS_HINT: Partial<Record<TenantStatus, string>> = {
  pending: vi.me.pendingHint,
  rejected: vi.me.rejectedHint,
  suspended: vi.me.suspendedHint,
};

function TenantContextCard({
  context,
  owned,
}: {
  context: MeTenantContext;
  /** Có khi user là chủ trung tâm (`GET /tenants/mine`). */
  owned: OwnedTenant | undefined;
}) {
  const { tenant, roles } = context;
  const active = tenant.status === TenantStatus.ACTIVE;
  // Lý do tạm khoá chỉ chủ trung tâm thấy.
  const reason =
    tenant.status === TenantStatus.REJECTED
      ? tenant.rejectionReason
      : tenant.status === TenantStatus.SUSPENDED
        ? (owned?.suspensionReason ?? null)
        : null;
  const hint = STATUS_HINT[tenant.status];

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:flex-row sm:items-start">
      <TenantAvatar name={tenant.name} logoUrl={tenant.logoUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15.5px] font-semibold text-[var(--heading)]">
            {tenant.name}
          </span>
          <Badge tone={TENANT_STATUS_TONE[tenant.status]}>
            {vi.tenantStatus[tenant.status]}
          </Badge>
        </div>
        <div className="mt-0.5 text-[13px] text-[var(--muted)]">
          <span className="font-mono">/t/{tenant.slug}</span> ·{' '}
          {roles.map((role) => vi.tenantRoles[role]).join(', ')}
        </div>
        {owned && (
          <div className="mt-0.5 text-[13px] text-[var(--muted)]">
            {vi.me.plan(owned.plan.name, owned.plan.maxMembers)}
          </div>
        )}
        {hint && (
          <p className="mt-2.5 text-[13.5px] text-[var(--body)]">{hint}</p>
        )}
        {reason && (
          <p className="mt-2 whitespace-pre-line rounded-xl bg-[var(--danger-bg)] px-3.5 py-2.5 text-[13.5px] text-[var(--danger)]">
            <span className="font-semibold">{vi.me.reason}:</span> {reason}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {active && hasAnyRole(roles, TENANT_DASHBOARD_ROLES) && (
          <Link
            href={`/t/${tenant.slug}/dashboard`}
            className={compactPrimaryButtonClass}
          >
            {vi.me.openDashboard}
          </Link>
        )}
        {active && (
          <Link href={`/t/${tenant.slug}`} className={secondaryButtonClass}>
            {vi.me.openTenant}
          </Link>
        )}
        {tenant.status === TenantStatus.REJECTED && owned && (
          <Link
            href={`/me/tenants/${owned.id}/edit`}
            className={compactPrimaryButtonClass}
          >
            {vi.me.editAndResubmit}
          </Link>
        )}
      </div>
    </li>
  );
}

export function MeOverview() {
  const { user, tenantContexts, contextsReady } = useAuth();
  const [owned, setOwned] = useState<Map<string, OwnedTenant>>(new Map());
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    api.get<OwnedTenant[]>('/tenants/mine').then(
      (tenants) => {
        if (!cancelled) {
          setOwned(new Map(tenants.map((tenant) => [tenant.id, tenant])));
        }
      },
      () => {
        // Thiếu thông tin chủ trung tâm chỉ ẩn nút sửa & gửi lại.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!user) return null;

  return (
    <section className="mx-auto max-w-4xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[var(--heading)]">
            {vi.me.title}
          </h1>
          <p className="mt-1 text-[15px] text-[var(--body)]">
            {vi.me.greeting(user.fullName)}
          </p>
        </div>
        <Link href="/me/tenants/new" className={compactPrimaryButtonClass}>
          <Plus size={16} /> {vi.me.registerTenant}
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {isSystemManager(user) && (
          <WorkspaceCard
            href="/admin"
            icon={ShieldCheck}
            title={vi.shell.systemWorkspace}
            description={vi.me.systemDescription}
          />
        )}
        <WorkspaceCard
          href="/me/account"
          icon={UserRound}
          title={vi.account.title}
          description={vi.me.accountDescription}
        />
      </div>

      <h2 className="mt-10 text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
        {vi.me.tenantsHeading}
      </h2>
      {!contextsReady ? (
        <p className="mt-3 py-8 text-center text-[14px] text-[var(--muted)]">
          {vi.common.loading}
        </p>
      ) : tenantContexts.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-[var(--border-strong)] px-4 py-8 text-center">
          <p className="text-[14.5px] font-medium text-[var(--heading)]">
            {vi.me.noTenants}
          </p>
          <p className="mx-auto mt-1 max-w-md text-[13.5px] text-[var(--body)]">
            {vi.me.noTenantsHint}
          </p>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {tenantContexts.map((context) => (
            <TenantContextCard
              key={context.membershipId}
              context={context}
              owned={owned.get(context.tenant.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
