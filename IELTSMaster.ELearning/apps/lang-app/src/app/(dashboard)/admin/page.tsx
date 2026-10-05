'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  CircleCheck,
  Hourglass,
  Lock,
  UserPlus,
  Users,
} from 'lucide-react';
import type { AdminStats } from '@lang/shared';
import { StatCard } from '@/components/dashboard/StatCard';
import { FormAlert } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';

// Tổng quan hệ thống: số user, tenant theo trạng thái.
export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<AdminStats>('/admin/stats').then(
      (data) => {
        if (!cancelled) setStats(data);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.admin.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 p-5 sm:p-6">
      {error && <FormAlert tone="error">{error}</FormAlert>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label={vi.stats.users}
          value={stats?.users.total ?? null}
          icon={Users}
          href="/admin/users"
        />
        <StatCard
          label={vi.admin.stats.newUsers}
          value={stats?.users.newLast7Days ?? null}
          icon={UserPlus}
        />
        <StatCard
          label={vi.admin.stats.lockedUsers}
          value={stats?.users.locked ?? null}
          icon={Lock}
          href="/admin/users?status=locked"
        />
        <StatCard
          label={vi.stats.tenants}
          value={stats?.tenants.total ?? null}
          icon={Building2}
          href="/admin/tenants?status=all"
        />
        <StatCard
          label={vi.stats.pendingTenants}
          value={stats?.tenants.byStatus.pending ?? null}
          icon={Hourglass}
          href="/admin/tenants?status=pending"
        />
        <StatCard
          label={vi.admin.stats.activeTenants}
          value={stats?.tenants.byStatus.active ?? null}
          icon={CircleCheck}
          href="/admin/tenants?status=active"
        />
      </div>
    </div>
  );
}
