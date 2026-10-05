'use client';

import { CatalogScope, TENANT_MANAGER_ROLES, hasAnyRole } from '@lang/shared';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import { LessonBlueprintsView } from '@/components/catalog/LessonBlueprintsView';

// Owner/Admin quản lý mẫu bài học của trung tâm; Teacher chỉ xem.
export default function TenantLessonBlueprintsPage() {
  const { tenant, roles } = useTenantDashboard();
  return (
    <LessonBlueprintsView
      apiBase={`/t/${tenant.slug}`}
      scope={CatalogScope.TENANT}
      canManage={hasAnyRole(roles, TENANT_MANAGER_ROLES)}
    />
  );
}
