import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  hasAllPermissions,
  hasAnyRole,
  type PermissionKey,
  type TenantRole,
} from '@lang/shared';
import { AUTH_PERMISSIONS_KEY } from '../auth/decorators';
import { IdentityProviderClient } from '../auth/identity-provider.client';
import {
  TENANT_ROLES_KEY,
  type TenantContext,
  type TenantRequest,
} from './tenant-context';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly identity: IdentityProviderClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const { user, accessToken } = request;
    if (!user || !accessToken) {
      throw new UnauthorizedException('Ban chua dang nhap');
    }

    const slug = String(request.params.slug ?? '').toLowerCase();
    if (!slug) {
      throw new ForbiddenException(
        'Ban khong phai thanh vien cua trung tam nay',
      );
    }

    const contexts = await this.identity.contexts(
      accessToken,
      clientInfo(request),
    );
    const tenantContext = contexts.tenants.find(
      (item) => item.tenant.slug.toLowerCase() === slug,
    );
    if (!tenantContext) {
      throw new ForbiddenException(
        'Ban khong phai thanh vien cua trung tam nay',
      );
    }

    const required = this.reflector.getAllAndOverride<TenantRole[] | undefined>(
      TENANT_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredPermissions = this.reflector.getAllAndOverride<
      PermissionKey[] | undefined
    >(AUTH_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (
      requiredPermissions?.length &&
      !hasAllPermissions(tenantContext.permissions, requiredPermissions)
    ) {
      throw new ForbiddenException('Ban khong co quyen thuc hien thao tac nay');
    }

    if (required?.length && !hasAnyRole(tenantContext.roles, required)) {
      throw new ForbiddenException('Ban khong co quyen thuc hien thao tac nay');
    }

    const tenantCtx: TenantContext = {
      tenantId: tenantContext.tenant.id,
      slug: tenantContext.tenant.slug,
      name: tenantContext.tenant.name,
      status: tenantContext.tenant.status,
      membershipId: tenantContext.membershipId,
      roles: tenantContext.roles,
      permissions: tenantContext.permissions,
    };
    request.tenantCtx = tenantCtx;
    return true;
  }
}

function clientInfo(request: TenantRequest) {
  const headers = request.headers ?? {};
  const forwarded = headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const userAgent = request.get?.('user-agent') ?? headers['user-agent'];
  return {
    userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 512) : null,
    ip: (ip ?? request.ip)?.slice(0, 64) ?? null,
  };
}
