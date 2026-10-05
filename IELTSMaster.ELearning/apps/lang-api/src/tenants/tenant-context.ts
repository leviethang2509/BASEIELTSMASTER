import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';
import type { TenantRole, TenantStatus } from '@lang/shared';
import type { AuthenticatedRequest } from '../common/decorators/current-user.decorator';

/** Tenant và membership của user hiện tại, do `TenantGuard` gắn vào request. */
export interface TenantContext {
  tenantId: string;
  slug: string;
  name: string;
  status: TenantStatus;
  membershipId: string;
  roles: TenantRole[];
  permissions: string[];
}

export type TenantRequest = AuthenticatedRequest & {
  tenantCtx?: TenantContext;
};

export const TENANT_ROLES_KEY = 'tenant:roles';

/** Chỉ membership có ít nhất một role này được gọi (kiểm tra ở `TenantGuard`). */
export const TenantRoles = (...roles: TenantRole[]) =>
  SetMetadata(TENANT_ROLES_KEY, roles);

/** Lấy `TenantContext`; route phải gắn `@UseGuards(TenantGuard)`. */
export const TenantCtx = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantContext => {
    const { tenantCtx } = context.switchToHttp().getRequest<TenantRequest>();
    if (!tenantCtx) throw new Error('@TenantCtx() cần TenantGuard');
    return tenantCtx;
  },
);
