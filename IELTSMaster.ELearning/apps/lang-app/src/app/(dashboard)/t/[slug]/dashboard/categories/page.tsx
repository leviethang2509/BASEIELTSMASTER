'use client';

import { CatalogScope, TENANT_MANAGER_ROLES, hasAnyRole } from '@lang/shared';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import { CategoriesView } from '@/components/catalog/CategoriesView';

// Owner/Admin quản lý danh mục của trung tâm; Teacher chỉ xem.
export default function TenantCategoriesPage() {
  const { tenant, roles } = useTenantDashboard();
  return (
    <CategoriesView
      apiBase={`/t/${tenant.slug}`}
      scope={CatalogScope.TENANT}
      canManage={hasAnyRole(roles, TENANT_MANAGER_ROLES)}
    />
  );
}
