import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  SystemRole,
  TENANT_MANAGER_ROLES,
  TenantRole,
  TenantStatus,
} from '@lang/shared';
import type { IdentityProviderClient } from '../auth/identity-provider.client';
import { TenantRoles, type TenantRequest } from './tenant-context';
import { TenantGuard } from './tenant.guard';

class MembersController {
  @TenantRoles(...TENANT_MANAGER_ROLES)
  manage() {}

  view() {}
}

function setup(roles: TenantRole[] = [TenantRole.STUDENT]) {
  const identity = {
    contexts: jest.fn().mockResolvedValue({
      systemRole: SystemRole.REGISTERED_USER,
      tenants: [
        {
          membershipId: 'm1',
          roles,
          permissions: [],
          joinedAt: '2026-09-15T08:00:00Z',
          tenant: {
            id: 't1',
            slug: 'a-chau',
            name: 'A Chau',
            logoUrl: null,
            status: TenantStatus.ACTIVE,
            rejectionReason: null,
          },
        },
      ],
    }),
  } as unknown as jest.Mocked<IdentityProviderClient>;
  const guard = new TenantGuard(new Reflector(), identity);

  function run(
    handler: keyof MembersController = 'view',
    slug = 'a-chau',
    hasUser = true,
  ) {
    const request = {
      params: { slug },
      accessToken: hasUser ? 'access-token' : undefined,
      user: hasUser
        ? {
            id: 'user-1',
            email: 'user@example.com',
            systemRole: SystemRole.REGISTERED_USER,
          }
        : undefined,
    } as unknown as TenantRequest;
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => MembersController.prototype[handler],
      getClass: () => MembersController,
    } as unknown as ExecutionContext;
    return { request, result: guard.canActivate(context), identity };
  }

  return { run, identity };
}

describe('TenantGuard', () => {
  it('chua co user/accessToken thi 401', async () => {
    const { run } = setup();
    await expect(run('view', 'a-chau', false).result).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('khong co tenant trong context AuthService thi 403', async () => {
    const { run } = setup();
    await expect(run('view', 'khong-co').result).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('@TenantRoles: Student bi chan, Tenant Admin qua va co tenantCtx', async () => {
    await expect(
      setup([TenantRole.STUDENT]).run('manage').result,
    ).rejects.toBeInstanceOf(ForbiddenException);

    const { request, result } = setup([
      TenantRole.TENANT_ADMIN,
      TenantRole.TEACHER,
    ]).run('manage');
    await expect(result).resolves.toBe(true);
    expect(request.tenantCtx).toEqual({
      tenantId: 't1',
      slug: 'a-chau',
      name: 'A Chau',
      status: TenantStatus.ACTIVE,
      membershipId: 'm1',
      roles: [TenantRole.TENANT_ADMIN, TenantRole.TEACHER],
      permissions: [],
    });
  });

  it('nhan slug khong phan biet hoa thuong', async () => {
    await expect(setup().run('view', 'A-Chau').result).resolves.toBe(true);
  });
});
