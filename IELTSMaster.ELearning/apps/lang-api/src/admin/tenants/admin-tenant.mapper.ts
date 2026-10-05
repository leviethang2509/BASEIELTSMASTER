import type {
  AdminTenant,
  AdminTenantDetail,
  TenantAiSettings,
} from '@lang/shared';
import { toPlanSummary } from '../../plans/plan.mapper';
import type { ServicePlan } from '../../plans/service-plan.entity';
import type { Tenant } from '../../tenants/tenant.entity';
import type { User } from '../../users/user.entity';

const toPerson = (user: User) => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
});

/** Cần `plan`, `owner` (và `reviewer` nếu có) đã được join. */
export function toAdminTenant(
  tenant: Tenant,
  activeMembers: number,
): AdminTenant {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    logoUrl: tenant.logoUrl,
    description: tenant.description,
    email: tenant.email,
    phone: tenant.phone,
    address: tenant.address,
    status: tenant.status,
    rejectionReason: tenant.rejectionReason,
    suspensionReason: tenant.suspensionReason,
    plan: toPlanSummary(tenant.plan as ServicePlan),
    owner: toPerson(tenant.owner as User),
    activeMembers,
    createdAt: tenant.createdAt.toISOString(),
    reviewedAt: tenant.reviewedAt?.toISOString() ?? null,
    reviewer: tenant.reviewer ? toPerson(tenant.reviewer) : null,
  };
}

export function toTenantAiSettings(
  tenant: Tenant,
  usedThisMonth: number,
): TenantAiSettings {
  return {
    enabled: tenant.aiEnabled,
    monthlyQuota: tenant.aiMonthlyQuota,
    usedThisMonth,
  };
}

export function toAdminTenantDetail(
  tenant: Tenant,
  activeMembers: number,
  aiUsedThisMonth: number,
): AdminTenantDetail {
  return {
    ...toAdminTenant(tenant, activeMembers),
    ai: toTenantAiSettings(tenant, aiUsedThisMonth),
  };
}
