import type { AuthUser } from '@lang/shared';
import type { User } from './user.entity';

/** Dữ liệu user trả cho client; không bao giờ trả thẳng entity (có password_hash). */
export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    phone: user.phone,
    address: user.address,
    avatarUrl: user.avatarUrl,
    locale: user.locale,
    timezone: user.timezone,
    systemRole: user.systemRole,
    mustChangePassword: user.mustChangePassword,
  };
}
