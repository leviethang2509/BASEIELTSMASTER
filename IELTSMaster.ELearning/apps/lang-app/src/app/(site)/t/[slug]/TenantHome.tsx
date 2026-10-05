'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import {
  TENANT_DASHBOARD_ROLES,
  TenantRole,
  TenantStatus,
  hasAnyRole,
  type PublicTenant,
  type TenantMembershipInfo,
} from '@lang/shared';
import { useAuth } from '@/components/auth/AuthProvider';
import { MyClassList } from '@/components/class-learning/MyClassList';
import { MyChildrenList } from '@/components/guardian/MyChildrenList';
import { LearnerExamList } from '@/components/learner/LearnerExamList';
import { LearnerLessonList } from '@/components/lesson-learning/LearnerLessonList';
import { MyRecentAttempts } from '@/components/learner/MyRecentAttempts';
import { TenantAvatar } from '@/components/tenant/TenantAvatar';
import { TenantNotice } from '@/components/tenant/TenantNotice';
import {
  Badge,
  FormAlert,
  compactPrimaryButtonClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { ApiError, api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';

type View =
  | { kind: 'loading' }
  | { kind: 'member'; info: TenantMembershipInfo }
  | { kind: 'public'; tenant: PublicTenant }
  | { kind: 'notFound' }
  | { kind: 'error'; message: string };

const loadingBlock = (
  <p className="py-24 text-center text-[14px] text-[var(--muted)]">
    {vi.common.loading}
  </p>
);

export function TenantHome({ slug: rawSlug }: { slug: string }) {
  const slug = rawSlug.toLowerCase();
  const { status, user, tenantContexts, contextsReady } = useAuth();
  const [view, setView] = useState<View>({ kind: 'loading' });

  // Chờ biết user có là thành viên không (còn phải đổi mật khẩu thì xem như khách).
  const waiting =
    status === 'loading' ||
    (!!user && !user.mustChangePassword && !contextsReady);
  const context = tenantContexts.find((item) => item.tenant.slug === slug);
  const tenantStatus = context?.tenant.status;
  const unavailable =
    tenantStatus && tenantStatus !== TenantStatus.ACTIVE ? tenantStatus : null;
  const isMember = tenantStatus === TenantStatus.ACTIVE;

  useEffect(() => {
    if (waiting || unavailable) return;
    let cancelled = false;
    setView({ kind: 'loading' });
    // Thành viên gọi API của tenant (cũng ghi lần vào tenant), khách xem trang công khai.
    const load: Promise<View> = isMember
      ? api
          .get<TenantMembershipInfo>(`/t/${slug}/me`)
          .then((info) => ({ kind: 'member', info }))
      : api
          .get<PublicTenant>(`/public/tenants/${encodeURIComponent(slug)}`)
          .then((tenant) => ({ kind: 'public', tenant }));
    load.then(
      (next) => {
        if (!cancelled) setView(next);
      },
      (err: unknown) => {
        if (cancelled) return;
        setView(
          err instanceof ApiError && err.status === 404
            ? { kind: 'notFound' }
            : {
                kind: 'error',
                message: errorMessage(err, vi.common.loadFailed),
              },
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, waiting, unavailable, isMember]);

  if (waiting) return loadingBlock;

  if (unavailable) {
    return (
      <TenantNotice kind={unavailable}>
        <Link href="/me" className={secondaryButtonClass}>
          {vi.site.myWorkspace}
        </Link>
      </TenantNotice>
    );
  }

  switch (view.kind) {
    case 'loading':
      return loadingBlock;
    case 'notFound':
      return (
        <TenantNotice kind="notFound">
          <Link href="/" className={secondaryButtonClass}>
            {vi.common.backHome}
          </Link>
        </TenantNotice>
      );
    case 'error':
      return (
        <div className="mx-auto max-w-xl px-5 py-16">
          <FormAlert tone="error">{view.message}</FormAlert>
        </div>
      );
  }

  const member = view.kind === 'member' ? view.info : null;
  const tenant = member
    ? member.tenant
    : (view as { tenant: PublicTenant }).tenant;
  const contacts = [
    { icon: Mail, value: tenant.email },
    { icon: Phone, value: tenant.phone },
    { icon: MapPin, value: tenant.address },
  ].filter((item) => item.value);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <section className="flex flex-col gap-6 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_18px_44px_var(--shadow-1)] sm:flex-row sm:items-start sm:p-8">
        <TenantAvatar name={tenant.name} logoUrl={tenant.logoUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-[var(--heading)] sm:text-[32px]">
            {tenant.name}
          </h1>
          <p className="mt-1 font-mono text-[13px] text-[var(--muted)]">
            /t/{tenant.slug}
          </p>
          {tenant.description && (
            <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-[var(--body)]">
              {tenant.description}
            </p>
          )}
          {contacts.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-[var(--body)]">
              {contacts.map(({ icon: Icon, value }) => (
                <li key={value} className="flex min-w-0 items-center gap-2">
                  <Icon size={16} className="shrink-0 text-[var(--muted)]" />
                  <span className="break-words">{value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {member && hasAnyRole(member.roles, TENANT_DASHBOARD_ROLES) && (
          <Link
            href={`/t/${tenant.slug}/dashboard`}
            className={`${compactPrimaryButtonClass} shrink-0 self-start`}
          >
            {vi.me.openDashboard}
          </Link>
        )}
      </section>

      {member ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[13.5px] text-[var(--body)]">
            {vi.tenantPage.yourRoles}:
            {member.roles.map((role) => (
              <Badge key={role} tone="accent">
                {vi.tenantRoles[role]}
              </Badge>
            ))}
          </div>
          <MyClassList slug={tenant.slug} />
          {member.roles.includes(TenantRole.PARENT) && (
            <MyChildrenList slug={tenant.slug} />
          )}
          <MyRecentAttempts slug={tenant.slug} />
          <section className="mt-10">
            <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
              {vi.lessonLearning.heading}
            </h2>
            <LearnerLessonList slug={tenant.slug} />
          </section>
          <section className="mt-10">
            <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
              {vi.tenantPage.examsHeading}
            </h2>
            <LearnerExamList slug={tenant.slug} />
          </section>
        </>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border-strong)] px-5 py-7 text-center">
          <p className="text-[14px] text-[var(--body)]">
            {user ? vi.tenantPage.notMember : vi.tenantPage.loginToJoin}
          </p>
          {!user && (
            <Link
              href={`/login?next=${encodeURIComponent(`/t/${tenant.slug}`)}`}
              className={compactPrimaryButtonClass}
            >
              {vi.auth.login}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
