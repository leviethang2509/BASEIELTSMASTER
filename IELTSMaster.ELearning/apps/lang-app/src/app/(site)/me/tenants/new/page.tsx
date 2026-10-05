import type { Metadata } from 'next';
import { vi } from '@/i18n/vi';
import { TenantForm } from '../_components/TenantForm';

export const metadata: Metadata = {
  title: `${vi.tenantForm.createTitle} · ${vi.app.name}`,
};

// `?plan=` chọn sẵn gói từ landing.
export default function NewTenantPage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  return <TenantForm mode="create" initialPlanId={searchParams.plan} />;
}
