'use client';

import { CatalogScope, TENANT_MANAGER_ROLES, hasAnyRole } from '@lang/shared';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import { ExamBlueprintsView } from '@/components/catalog/ExamBlueprintsView';

// Owner/Admin quản lý loại đề của trung tâm; Teacher chỉ xem.
export default function TenantExamBlueprintsPage() {
  const { tenant, roles } = useTenantDashboard();
  return (
    <ExamBlueprintsView
      apiBase={`/t/${tenant.slug}`}
      scope={CatalogScope.TENANT}
      canManage={hasAnyRole(roles, TENANT_MANAGER_ROLES)}
    />
  );
}
