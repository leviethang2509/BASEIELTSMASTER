import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { SystemRole, UserStatus } from '@lang/shared';
import type { RefreshToken } from '../../auth/refresh-token.entity';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { InMemoryDataSource } from '../../testing/in-memory-data-source';
import { InMemoryRepository } from '../../testing/in-memory-repository';
import { User } from '../../users/user.entity';
import { AdminUsersService } from './admin-users.service';

// bcrypt thật chậm; mật khẩu tạm cố định để kiểm tra.
jest.mock('../../auth/password', () => ({
  hashPassword: async (plain: string) => `hashed:${plain}`,
  generateTemporaryPassword: () => 'TamThoi23456',
}));

function setup() {
  const users = new InMemoryRepository<User>(() => ({
    systemRole: SystemRole.REGISTERED_USER,
    status: UserStatus.ACTIVE,
    mustChangePassword: false,
    tokenVersion: 0,
    gender: null,
    phone: null,
    address: null,
    lastLoginAt: null,
    createdAt: new Date(),
    deletedAt: null,
  }));
  const refreshTokens = new InMemoryRepository<RefreshToken>();
  const dataSource = new InMemoryDataSource().register(User, users);
  const service = new AdminUsersService(
    dataSource.asDataSource(),
    users.asRepository(),
    refreshTokens.asRepository(),
  );

  let counter = 0;
  function addUser(
    systemRole: SystemRole = SystemRole.REGISTERED_USER,
    extra: Partial<User> = {},
  ) {
    counter += 1;
    return users.save(
      users.create({
        email: `user${counter}@example.com`,
        fullName: `Người dùng ${counter}`,
        dateOfBirth: '1990-01-01',
        passwordHash: 'hashed:cu',
        systemRole,
        ...extra,
      }),
    );
  }

  function addSession(userId: string) {
    return refreshTokens.save(
      refreshTokens.create({
        userId,
        familyId: randomUUID(),
        tokenHash: randomUUID(),
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        replacedById: null,
      }),
    );
  }

  const actorOf = (user: User): RequestUser => ({
    id: user.id,
    email: user.email,
    systemRole: user.systemRole,
  });
  const row = (id: string) => users.rows.find((item) => item.id === id);

  return { service, users, refreshTokens, addUser, addSession, actorOf, row };
}

describe('AdminUsersService', () => {
  describe('quyền trên tài khoản quản trị', () => {
    it('System Admin không sửa, khoá, reset mật khẩu được System Owner hay System Admin khác', async () => {
      const { service, addUser, actorOf, row } = setup();
      const admin = await addUser(SystemRole.SYSTEM_ADMIN);
      const actor = actorOf(admin);

      for (const target of [
        await addUser(SystemRole.SYSTEM_OWNER),
        await addUser(SystemRole.SYSTEM_ADMIN),
      ]) {
        await expect(
          service.update(actor, target.id, { fullName: 'Đổi tên' }),
        ).rejects.toBeInstanceOf(ForbiddenException);
        await expect(
          service.setStatus(actor, target.id, UserStatus.LOCKED),
        ).rejects.toBeInstanceOf(ForbiddenException);
        await expect(
          service.resetPassword(actor, target.id, {}),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(row(target.id)).toMatchObject({
          fullName: target.fullName,
          status: UserStatus.ACTIVE,
          passwordHash: 'hashed:cu',
        });
      }
    });

    it('System Admin quản lý Registered User; System Owner quản lý được System Admin', async () => {
      const { service, addUser, actorOf, row } = setup();
      const owner = await addUser(SystemRole.SYSTEM_OWNER);
      const admin = await addUser(SystemRole.SYSTEM_ADMIN);
      const user = await addUser();

      await expect(
        service.update(actorOf(admin), user.id, { fullName: 'Tên mới' }),
      ).resolves.toMatchObject({ fullName: 'Tên mới' });
      await expect(
        service.setStatus(actorOf(owner), admin.id, UserStatus.LOCKED),
      ).resolves.toMatchObject({ status: UserStatus.LOCKED });
      expect(row(admin.id)?.status).toBe(UserStatus.LOCKED);
    });
  });

  it('khoá tài khoản thu hồi mọi refresh token; không tự khoá được mình', async () => {
    const { service, refreshTokens, addUser, addSession, actorOf, row } =
      setup();
    const owner = await addUser(SystemRole.SYSTEM_OWNER);
    const user = await addUser();
    await addSession(user.id);
    await addSession(user.id);

    await service.setStatus(actorOf(owner), user.id, UserStatus.LOCKED);
    expect(row(user.id)?.status).toBe(UserStatus.LOCKED);
    expect(refreshTokens.rows.every((token) => token.revokedAt)).toBe(true);

    await expect(
      service.setStatus(actorOf(owner), owner.id, UserStatus.LOCKED),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reset mật khẩu: sinh mật khẩu tạm, bắt đổi mật khẩu, vô hiệu token cũ', async () => {
    const { service, refreshTokens, addUser, addSession, actorOf, row } =
      setup();
    const admin = await addUser(SystemRole.SYSTEM_ADMIN);
    const user = await addUser();
    await addSession(user.id);

    const generated = await service.resetPassword(actorOf(admin), user.id, {});
    expect(generated.temporaryPassword).toBe('TamThoi23456');
    expect(row(user.id)).toMatchObject({
      passwordHash: 'hashed:TamThoi23456',
      mustChangePassword: true,
      tokenVersion: 1,
    });
    expect(refreshTokens.rows[0].revokedAt).toBeInstanceOf(Date);

    const typed = await service.resetPassword(actorOf(admin), user.id, {
      password: 'MatKhauMoi1',
    });
    expect(typed.temporaryPassword).toBeNull();
    expect(row(user.id)).toMatchObject({
      passwordHash: 'hashed:MatKhauMoi1',
      tokenVersion: 2,
    });

    await expect(
      service.resetPassword(actorOf(admin), admin.id, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('tạo user luôn là Registered User và bắt đổi mật khẩu; email trùng → 409', async () => {
    const { service, addUser } = setup();
    const existing = await addUser();

    const result = await service.create({
      email: 'moi@example.com',
      fullName: 'Người Mới',
      dateOfBirth: '2001-02-03',
    });
    expect(result.temporaryPassword).toBe('TamThoi23456');
    expect(result.user).toMatchObject({
      email: 'moi@example.com',
      systemRole: SystemRole.REGISTERED_USER,
      status: UserStatus.ACTIVE,
      mustChangePassword: true,
    });

    await expect(
      service.create({
        email: existing.email,
        fullName: 'Trùng',
        dateOfBirth: '2001-02-03',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('đổi email trùng người khác → 409', async () => {
    const { service, addUser, actorOf } = setup();
    const owner = await addUser(SystemRole.SYSTEM_OWNER);
    const first = await addUser();
    const second = await addUser();

    await expect(
      service.update(actorOf(owner), second.id, { email: first.email }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('không hạ quyền System Owner đang hoạt động cuối cùng', async () => {
    const { service, addUser, row } = setup();
    const owner = await addUser(SystemRole.SYSTEM_OWNER);
    await addUser(SystemRole.SYSTEM_OWNER, { status: UserStatus.LOCKED });
    const user = await addUser();

    await expect(
      service.changeSystemRole(owner.id, {
        systemRole: SystemRole.REGISTERED_USER,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await service.changeSystemRole(user.id, {
      systemRole: SystemRole.SYSTEM_OWNER,
    });
    await expect(
      service.changeSystemRole(owner.id, {
        systemRole: SystemRole.SYSTEM_ADMIN,
      }),
    ).resolves.toMatchObject({ systemRole: SystemRole.SYSTEM_ADMIN });
    expect(row(owner.id)?.systemRole).toBe(SystemRole.SYSTEM_ADMIN);
  });
});
