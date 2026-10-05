import type { Metadata } from 'next';
import { vi } from '@/i18n/vi';
import { ResubmitTenant } from '../../_components/ResubmitTenant';

export const metadata: Metadata = {
  title: `${vi.tenantForm.resubmitTitle} · ${vi.app.name}`,
};

export default function EditTenantPage({ params }: { params: { id: string } }) {
  return <ResubmitTenant id={params.id} />;
}
