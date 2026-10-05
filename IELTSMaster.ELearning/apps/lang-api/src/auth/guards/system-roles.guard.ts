import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  hasAllPermissions,
  type PermissionKey,
  type SystemRole,
} from '@lang/shared';
import type { AuthenticatedRequest } from '../../common/decorators/current-user.decorator';
import { TENANT_ROLES_KEY } from '../../tenants/tenant-context';
import { AUTH_PERMISSIONS_KEY, SYSTEM_ROLES_KEY } from '../decorators';

/** Guard toàn cục, chạy sau `JwtAuthGuard`; chỉ kiểm tra route có `@SystemRoles()`. */
@Injectable()
export class SystemRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const tenantRoles = this.reflector.getAllAndOverride<unknown[] | undefined>(
      TENANT_ROLES_KEY,
      targets,
    );
    const permissions = this.reflector.getAllAndOverride<
      PermissionKey[] | undefined
    >(AUTH_PERMISSIONS_KEY, targets);
    const roles = this.reflector.getAllAndOverride<SystemRole[] | undefined>(
      SYSTEM_ROLES_KEY,
      targets,
    );
    const { user, authContext } = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    if (!tenantRoles?.length && permissions?.length) {
      if (
        !authContext ||
        !hasAllPermissions(authContext.permissions, permissions)
      ) {
        throw new ForbiddenException(
          'Bạn không có quyền thực hiện thao tác này',
        );
      }
    }

    if (!roles?.length) return true;

    if (!user || !roles.includes(user.systemRole)) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }
    return true;
  }
}
