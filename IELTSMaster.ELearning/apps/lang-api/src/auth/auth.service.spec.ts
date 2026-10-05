import { HttpException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { SystemRole, UserStatus } from '@lang/shared';
import type { EnvironmentVariables } from '../config/env.validation';
import { InMemoryRepository } from '../testing/in-memory-repository';
import type { User } from '../users/user.entity';
import { AuthService } from './auth.service';
import { IdentityProviderClient } from './identity-provider.client';

/**
 * SSO Phase 2: lang-api chuyển tiếp xác thực sang IELTSMaster.AuthService.
 * Test kiểm tra việc gọi đúng endpoint, bóc `BaseResponse` và ánh xạ lỗi.
 */
const client = { userAgent: 'jest', ip: '127.0.0.1' };
const authUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'an@example.com',
  fullName: 'Nguyễn An',
  dateOfBirth: '2000-01-01',
  gender: null,
  phone: null,
  address: null,
  avatarUrl: null,
  locale: 'vi',
  timezone: 'Asia/Ho_Chi_Minh',
  systemRole: SystemRole.REGISTERED_USER,
  mustChangePassword: false,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function setup() {
  const users = new InMemoryRepository<User>(() => ({
    systemRole: SystemRole.REGISTERED_USER,
    status: UserStatus.ACTIVE,
    mustChangePassword: false,
    tokenVersion: 0,
    gender: null,
    phone: null,
    address: null,
    avatarUrl: null,
    locale: 'vi',
    timezone: 'Asia/Ho_Chi_Minh',
    lastLoginAt: null,
  }));
  const config = {
    get: (key: string) => (key === 'AUTH_SERVICE_URL' ? 'http://auth.test' : ''),
  } as unknown as ConfigService<EnvironmentVariables, true>;
  const identity = new IdentityProviderClient(config);
  const service = new AuthService(users.asRepository(), identity);
  const fetchMock = jest.spyOn(global, 'fetch');
  return { service, users, fetchMock };
}

describe('AuthService (SSO qua IELTSMaster.AuthService)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('login: gọi /api/auth/login và bóc BaseResponse', async () => {
    const { service, fetchMock } = setup();
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        success: true,
        statusCode: 200,
        data: { accessToken: 'at', refreshToken: 'rt', user: authUser },
      }),
    );

    const session = await service.login(
      { email: authUser.email, password: 'matkhau123' },
      client,
    );

    expect(session).toEqual({ accessToken: 'at', refreshToken: 'rt', user: authUser });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://auth.test/api/auth/login');
    expect(JSON.parse(String(init?.body))).toEqual({
      email: authUser.email,
      password: 'matkhau123',
    });
  });

  it('login: AuthService trả 400 thì lang-api trả 401 kèm thông báo gốc', async () => {
    const { service, fetchMock } = setup();
    fetchMock.mockResolvedValue(
      jsonResponse(400, { success: false, message: 'Email hoặc mật khẩu không chính xác' }),
    );

    const error = await service
      .login({ email: authUser.email, password: 'sai' }, client)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(401);
    expect((error as HttpException).message).toBe('Email hoặc mật khẩu không chính xác');
  });

  it('refresh: không có cookie thì 401, không gọi AuthService', async () => {
    const { service, fetchMock } = setup();
    await expect(service.refresh(undefined, client)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refresh: lỗi từ AuthService được ánh xạ thành 401', async () => {
    const { service, fetchMock } = setup();
    fetchMock.mockResolvedValue(jsonResponse(400, { success: false, message: 'hết hạn' }));
    const error = await service.refresh('rt', client).catch((e: unknown) => e);
    expect((error as HttpException).getStatus()).toBe(401);
  });

  it('logout: bỏ qua khi không có refresh token', async () => {
    const { service, fetchMock } = setup();
    await service.logout(undefined, client);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('changePassword: chuyển tiếp Bearer token và cookie ls_rt', async () => {
    const { service, fetchMock } = setup();
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        success: true,
        data: { accessToken: 'at2', refreshToken: 'rt2', user: authUser },
      }),
    );
    const session = await service.changePassword(
      'at',
      { currentPassword: 'cu123456', newPassword: 'moi123456' },
      'rt',
      client,
    );
    expect(session.refreshToken).toBe('rt2');
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer at');
    expect(headers.Cookie).toBe('ls_rt=rt');
  });

  it('switchTenant: gọi AuthService để lấy access token theo tenant context', async () => {
    const { service, fetchMock } = setup();
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        success: true,
        data: { accessToken: 'tenant-at', refreshToken: 'tenant-rt', user: authUser },
      }),
    );

    const session = await service.switchTenant(
      'at',
      { tenantSlug: 'a-chau' },
      client,
    );

    expect(session.accessToken).toBe('tenant-at');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://auth.test/api/auth/switch-tenant');
    expect(JSON.parse(String(init?.body))).toEqual({ tenantSlug: 'a-chau' });
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer at');
  });

  it('AuthService không chạy thì trả 503', async () => {
    const { service, fetchMock } = setup();
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const error = await service
      .login({ email: authUser.email, password: 'x' }, client)
      .catch((e: unknown) => e);
    expect((error as HttpException).getStatus()).toBe(503);
  });

  it('getMe: đọc user cục bộ từ public.users', async () => {
    const { service, users } = setup();
    const saved = await users.asRepository().save(
      users.asRepository().create({
        email: authUser.email,
        passwordHash: 'x',
        fullName: authUser.fullName,
        dateOfBirth: authUser.dateOfBirth,
      }),
    );
    const me = await service.getMe(saved.id);
    expect(me.email).toBe(authUser.email);
    await expect(service.getMe('khong-ton-tai')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
