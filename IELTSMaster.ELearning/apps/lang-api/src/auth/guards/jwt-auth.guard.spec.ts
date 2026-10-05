import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { SystemRole } from '@lang/shared';
import type { AuthenticatedRequest } from '../../common/decorators/current-user.decorator';
import {
  ALLOW_PENDING_PASSWORD_CHANGE_KEY,
  IS_PUBLIC_KEY,
} from '../decorators';
import type { IdentityProviderClient } from '../identity-provider.client';
import { JwtAuthGuard } from './jwt-auth.guard';

function contextFor(request: Partial<AuthenticatedRequest>): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function reflectorWith(metadata: Record<string, unknown> = {}): Reflector {
  return {
    getAllAndOverride: (key: string) => metadata[key],
  } as unknown as Reflector;
}

function validIntrospection() {
  return {
    active: true,
    userId: 'user-1',
    email: 'an@example.com',
    fullName: null,
    systemRole: SystemRole.REGISTERED_USER,
    mustChangePassword: false,
    tenant: null,
    membershipId: null,
    roles: [],
    permissions: [],
    elearning: {
      canAccess: true,
      canBypassAuthorization: false,
      permissions: [],
    },
  };
}

function setup(metadata?: Record<string, unknown>) {
  const identity = {
    introspect: jest.fn().mockResolvedValue(validIntrospection()),
  } as unknown as jest.Mocked<IdentityProviderClient>;
  const guard = new JwtAuthGuard(reflectorWith(metadata), identity);
  const request: Partial<AuthenticatedRequest> = {
    headers: { authorization: 'Bearer access-token' },
  };
  return { guard, identity, request };
}

describe('JwtAuthGuard', () => {
  it('route @Public() khong can token', async () => {
    const { guard, identity } = setup({ [IS_PUBLIC_KEY]: true });
    await expect(guard.canActivate(contextFor({ headers: {} }))).resolves.toBe(
      true,
    );
    expect(identity.introspect).not.toHaveBeenCalled();
  });

  it('thieu token hoac AuthService bao inactive thi 401', async () => {
    const { guard, identity, request } = setup();
    await expect(
      guard.canActivate(contextFor({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    identity.introspect.mockResolvedValueOnce({
      active: false,
      userId: null,
      email: null,
      fullName: null,
      systemRole: null,
      mustChangePassword: false,
      tenant: null,
      membershipId: null,
      roles: [],
      permissions: [],
      elearning: {
        canAccess: false,
        canBypassAuthorization: false,
        permissions: [],
      },
    });
    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('token hop le thi gan user va accessToken vao request', async () => {
    const { guard, request } = setup();
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.accessToken).toBe('access-token');
    expect(request.user).toEqual({
      id: 'user-1',
      email: 'an@example.com',
      systemRole: SystemRole.REGISTERED_USER,
    });
  });

  it('con co bat doi mat khau thi 403, tru route cho phep', async () => {
    const blocked = setup();
    blocked.identity.introspect.mockResolvedValueOnce({
      ...validIntrospection(),
      mustChangePassword: true,
    });
    await expect(
      blocked.guard.canActivate(contextFor(blocked.request)),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const allowed = setup({ [ALLOW_PENDING_PASSWORD_CHANGE_KEY]: true });
    allowed.identity.introspect.mockResolvedValueOnce({
      ...validIntrospection(),
      mustChangePassword: true,
    });
    await expect(
      allowed.guard.canActivate(contextFor(allowed.request)),
    ).resolves.toBe(true);
  });
});
