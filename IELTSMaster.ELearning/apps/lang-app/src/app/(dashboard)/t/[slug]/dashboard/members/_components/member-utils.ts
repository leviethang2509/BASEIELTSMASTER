import {
  ADULT_AGE,
  DEFAULT_TIMEZONE,
  ageOn,
  todayInTimeZone,
  type TenantRole,
} from '@lang/shared';
import type { BadgeTone } from '@/components/ui';

export const ROLE_TONE: Record<TenantRole, BadgeTone> = {
  TENANT_OWNER: 'accent',
  TENANT_ADMIN: 'warning',
  TEACHER: 'success',
  STUDENT: 'neutral',
  PARENT: 'neutral',
};

/** Badge "< 18 tuổi" (tính theo giờ Việt Nam). */
export function isMinor(dateOfBirth: string): boolean {
  return ageOn(dateOfBirth, todayInTimeZone(DEFAULT_TIMEZONE)) < ADULT_AGE;
}

export const membershipsPath = (slug: string) => `/t/${slug}/memberships`;
