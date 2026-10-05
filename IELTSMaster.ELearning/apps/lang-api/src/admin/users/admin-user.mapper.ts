import type { AdminUser } from '@lang/shared';
import type { User } from '../../users/user.entity';

export function toAdminUser(user: User): AdminUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    phone: user.phone,
    address: user.address,
    systemRole: user.systemRole,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
