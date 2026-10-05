import type { OwnedTenant, PublicTenant } from '@lang/shared';
import { toPlanSummary } from '../plans/plan.mapper';
import type { ServicePlan } from '../plans/service-plan.entity';
import type { Tenant } from './tenant.entity';

export function toPublicTenant(tenant: Tenant): PublicTenant {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    logoUrl: tenant.logoUrl,
    description: tenant.description,
    email: tenant.email,
    phone: tenant.phone,
    address: tenant.address,
  };
}

export function toOwnedTenant(tenant: Tenant, plan: ServicePlan): OwnedTenant {
  return {
    ...toPublicTenant(tenant),
    status: tenant.status,
    rejectionReason: tenant.rejectionReason,
    suspensionReason: tenant.suspensionReason,
    plan: toPlanSummary(plan),
    createdAt: tenant.createdAt.toISOString(),
    reviewedAt: tenant.reviewedAt?.toISOString() ?? null,
  };
}
