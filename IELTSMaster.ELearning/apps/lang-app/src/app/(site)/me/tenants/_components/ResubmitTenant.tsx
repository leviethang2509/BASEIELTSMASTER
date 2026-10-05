'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TenantStatus, type OwnedTenant } from '@lang/shared';
import { FormAlert, secondaryButtonClass } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { TenantForm } from './TenantForm';

// Chỉ chủ trung tâm, chỉ khi bị từ chối (API cũng chặn).
export function ResubmitTenant({ id }: { id: string }) {
  // `undefined`: đang tải; `null`: không có trong danh sách của user.
  const [tenant, setTenant] = useState<OwnedTenant | null | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<OwnedTenant[]>('/tenants/mine').then(
      (tenants) => {
        if (!cancelled)
          setTenant(tenants.find((item) => item.id === id) ?? null);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (tenant && tenant.status === TenantStatus.REJECTED) {
    return <TenantForm mode="resubmit" tenant={tenant} />;
  }

  const message = error
    ? error
    : tenant === null
      ? vi.tenantForm.notFound
      : tenant
        ? vi.tenantForm.notRejected
        : null;
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-4 px-5 py-16">
      {message ? (
        <>
          <FormAlert tone="error">{message}</FormAlert>
          <Link href="/me" className={secondaryButtonClass}>
            {vi.tenantForm.backToMe}
          </Link>
        </>
      ) : (
        <p className="text-[14px] text-[var(--muted)]">{vi.common.loading}</p>
      )}
    </div>
  );
}
