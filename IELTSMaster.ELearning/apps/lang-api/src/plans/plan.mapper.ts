import type { ServicePlanSummary } from '@lang/shared';
import type { ServicePlan } from './service-plan.entity';

export function toPlanSummary(plan: ServicePlan): ServicePlanSummary {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    maxMembers: plan.maxMembers,
    price: plan.price,
    description: plan.description,
  };
}
