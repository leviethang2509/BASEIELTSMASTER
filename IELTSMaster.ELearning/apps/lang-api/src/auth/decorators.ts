import { SetMetadata } from '@nestjs/common';
import type { PermissionKey, SystemRole } from '@lang/shared';

export const IS_PUBLIC_KEY = 'auth:public';
export const ALLOW_PENDING_PASSWORD_CHANGE_KEY =
  'auth:allowPendingPasswordChange';
export const SYSTEM_ROLES_KEY = 'auth:systemRoles';
export const AUTH_PERMISSIONS_KEY = 'auth:permissions';

/** Bỏ qua `JwtAuthGuard` (mặc định mọi route đều cần đăng nhập). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Vẫn cho gọi khi user còn cờ `must_change_password` (xem mình, đổi mật khẩu). */
export const AllowPendingPasswordChange = () =>
  SetMetadata(ALLOW_PENDING_PASSWORD_CHANGE_KEY, true);

/** Chỉ các system role này được gọi (kiểm tra ở `SystemRolesGuard`). */
export const SystemRoles = (...roles: SystemRole[]) =>
  SetMetadata(SYSTEM_ROLES_KEY, roles);

/** Chỉ user có đủ permission keys này được gọi. Permission do AuthService cấp. */
export const Permissions = (...permissions: PermissionKey[]) =>
  SetMetadata(AUTH_PERMISSIONS_KEY, permissions);
