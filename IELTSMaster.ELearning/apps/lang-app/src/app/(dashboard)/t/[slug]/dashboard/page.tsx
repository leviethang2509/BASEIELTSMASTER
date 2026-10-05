'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  ClipboardCheck,
  FilePen,
  FileText,
  GraduationCap,
  ListChecks,
  UserRound,
  Users,
  UsersRound,
} from 'lucide-react';
import type { TenantDashboardStats } from '@lang/shared';
import { StatCard } from '@/components/dashboard/StatCard';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import {
  OverLimitBanner,
  warningButtonClass,
} from '@/components/tenant/OverLimitBanner';
import { FormAlert } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { formatNumber } from '@/lib/format';
import { gradingListPath } from '@/lib/grading-api';

// Tổng quan tenant. Teacher chỉ có bản rút gọn (API trả `management = null`).
export default function TenantOverviewPage() {
  const { tenant } = useTenantDashboard();
  const [stats, setStats] = useState<TenantDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<TenantDashboardStats>(`/t/${tenant.slug}/dashboard/stats`).then(
      (data) => {
        if (!cancelled) setStats(data);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [tenant.slug]);

  const management = stats?.management ?? null;
  const membersHref = `/t/${tenant.slug}/dashboard/members`;
  const text = vi.tenantDashboard;

  return (
    <div className="flex flex-col gap-4 p-5 sm:p-6">
      {error && <FormAlert tone="error">{error}</FormAlert>}
      {management && management.quota.excess > 0 && (
        <OverLimitBanner quota={management.quota}>
          <Link href={membersHref} className={warningButtonClass}>
            {text.manageMembers}
          </Link>
        </OverLimitBanner>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {management && (
          <>
            <StatCard
              label={vi.stats.teachers}
              value={management.teachers}
              icon={UserRound}
              href={`${membersHref}?role=TEACHER`}
            />
            <StatCard
              label={vi.stats.students}
              value={stats?.students ?? null}
              icon={GraduationCap}
              href={`${membersHref}?role=STUDENT`}
            />
            <StatCard
              label={vi.stats.parents}
              value={management.parents}
              icon={UsersRound}
              href={`${membersHref}?role=PARENT`}
            />
            <StatCard
              label={vi.stats.memberQuota}
              value={`${formatNumber(management.quota.activeMembers)} / ${formatNumber(management.quota.maxMembers)}`}
              icon={Users}
              href={membersHref}
            />
          </>
        )}
        {!management && (
          <StatCard
            label={vi.stats.students}
            value={stats?.students ?? null}
            icon={GraduationCap}
          />
        )}
        <StatCard
          label={text.examsPublished}
          value={stats?.exams.published ?? null}
          icon={FileText}
        />
        <StatCard
          label={text.examsDraft}
          value={stats?.exams.draft ?? null}
          icon={FilePen}
        />
        <StatCard
          label={text.examsArchived}
          value={stats?.exams.archived ?? null}
          icon={Archive}
        />
        <StatCard
          label={text.attempts}
          value={stats?.attempts ?? null}
          icon={ListChecks}
        />
        <StatCard
          label={vi.stats.pendingGrading}
          value={stats?.pendingGrading ?? null}
          icon={ClipboardCheck}
          href={gradingListPath(tenant.slug)}
        />
      </div>
    </div>
  );
}
