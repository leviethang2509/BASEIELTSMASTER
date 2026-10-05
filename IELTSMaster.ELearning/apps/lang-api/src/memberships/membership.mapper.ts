import { TenantRole, type MembershipListItem } from '@lang/shared';
import type { User } from '../users/user.entity';
import type { Membership } from './membership.entity';

const ROLE_ORDER: readonly TenantRole[] = Object.values(TenantRole);

/** Sắp role theo thứ bậc (Owner → Parent) để client hiển thị ổn định. */
export function sortRoles(roles: readonly TenantRole[]): TenantRole[] {
  return [...roles].sort(
    (a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b),
  );
}

export function toMembershipListItem(
  membership: Membership,
  user: Pick<User, 'email' | 'fullName' | 'dateOfBirth'>,
  roles: readonly TenantRole[],
): MembershipListItem {
  return {
    id: membership.id,
    userId: membership.userId,
    email: user.email,
    fullName: user.fullName,
    dateOfBirth: user.dateOfBirth,
    status: membership.status,
    roles: sortRoles(roles),
    joinedAt: membership.joinedAt.toISOString(),
    lastActiveAt: membership.lastActiveAt?.toISOString() ?? null,
  };
}
