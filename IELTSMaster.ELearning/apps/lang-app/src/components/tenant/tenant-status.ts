import type { TenantStatus } from '@lang/shared';
import type { BadgeTone } from '@/components/ui';

export const TENANT_STATUS_TONE: Record<TenantStatus, BadgeTone> = {
  pending: 'warning',
  active: 'success',
  rejected: 'danger',
  suspended: 'neutral',
};
