import {
  SYSTEM_MANAGER_ROLES,
  TENANT_DASHBOARD_ROLES,
  TenantStatus,
  hasAnyRole,
  type AuthUser,
  type MeTenantContext,
  type TenantRole,
} from '@lang/shared';

export function isSystemManager(user: Pick<AuthUser, 'systemRole'>): boolean {
  return SYSTEM_MANAGER_ROLES.includes(user.systemRole);
}

/**
 * Chỉ nhận đường dẫn nội bộ (chặn open redirect kiểu `//evil.com`), bỏ qua
 * trang đăng nhập/đăng ký để không quay vòng.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || /^\/[/\\]/.test(next)) return null;
  if (/^\/(login|register)(?:[/?#]|$)/.test(next)) return null;
  return next;
}

/** Vào tenant: dashboard khi có role quản trị/Teacher, còn lại trang trung tâm. */
export function tenantEntryPath(
  slug: string,
  roles: readonly TenantRole[],
): string {
  return hasAnyRole(roles, TENANT_DASHBOARD_ROLES)
    ? `/t/${slug}/dashboard`
    : `/t/${slug}`;
}

/**
 * Trang đích sau đăng nhập (plan mục 6.1). Ngữ cảnh gồm quản trị hệ thống và
 * mọi tenant user là thành viên; tenant chưa hoạt động vẫn tính để user thấy
 * trạng thái trên `/me`.
 */
export function destinationAfterLogin(
  user: AuthUser,
  tenants: readonly MeTenantContext[],
  next?: string | null,
): string {
  if (user.mustChangePassword) return '/me/account';
  const nextPath = safeNextPath(next);
  if (nextPath) return nextPath;

  const system = isSystemManager(user);
  if (system && tenants.length === 0) return '/admin';
  if (!system && tenants.length === 1) {
    const { tenant, roles } = tenants[0];
    if (tenant.status === TenantStatus.ACTIVE) {
      return tenantEntryPath(tenant.slug, roles);
    }
  }
  return '/me';
}
