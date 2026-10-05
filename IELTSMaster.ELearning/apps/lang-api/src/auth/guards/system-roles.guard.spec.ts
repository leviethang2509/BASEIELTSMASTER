import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { SystemRole } from '@lang/shared';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { SYSTEM_ROLES_KEY } from '../decorators';
import { SystemRolesGuard } from './system-roles.guard';

function run(roles: SystemRole[] | undefined, user?: Partial<RequestUser>) {
  const reflector = {
    getAllAndOverride: (key: string) =>
      key === SYSTEM_ROLES_KEY ? roles : undefined,
  } as unknown as Reflector;
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
  return () => new SystemRolesGuard(reflector).canActivate(context);
}

describe('SystemRolesGuard', () => {
  const managers = [SystemRole.SYSTEM_OWNER, SystemRole.SYSTEM_ADMIN];

  it('route không khai báo role thì cho qua', () => {
    expect(run(undefined, { systemRole: SystemRole.REGISTERED_USER })()).toBe(
      true,
    );
  });

  it('có role phù hợp thì cho qua', () => {
    expect(run(managers, { systemRole: SystemRole.SYSTEM_ADMIN })()).toBe(true);
  });

  it('user thường hoặc chưa xác thực thì 403', () => {
    expect(run(managers, { systemRole: SystemRole.REGISTERED_USER })).toThrow(
      ForbiddenException,
    );
    expect(run(managers)).toThrow(ForbiddenException);
  });
});
