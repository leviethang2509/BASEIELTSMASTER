import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AuthUser,
  Gender,
  MeContexts,
  SystemRole,
  TenantRole,
  TenantStatus,
} from '@lang/shared';
import type { EnvironmentVariables } from '../config/env.validation';

export interface IdentitySession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface ForwardedClient {
  userAgent: string | null;
  ip: string | null;
}

export interface IdentityTenantSummary {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  status: TenantStatus;
}

export interface TokenIntrospection {
  active: boolean;
  userId: string | null;
  email: string | null;
  fullName: string | null;
  systemRole: SystemRole | null;
  mustChangePassword: boolean;
  tenant: IdentityTenantSummary | null;
  membershipId: string | null;
  roles: TenantRole[];
  permissions: string[];
  elearning: {
    canAccess: boolean;
    canBypassAuthorization: boolean;
    permissions: string[];
  };
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryTtlCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly defaultTtlSeconds: number = 30,
    private readonly maxEntries: number = 1000,
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlSeconds?: number): void {
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    const ttlMs = (ttlSeconds ?? this.defaultTtlSeconds) * 1000;
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const UNAVAILABLE = 'Khong ket noi duoc may chu xac thuc, vui long thu lai sau';

@Injectable()
export class IdentityProviderClient {
  private readonly logger = new Logger(IdentityProviderClient.name);
  private readonly baseUrl: string;

  private readonly introspectCache = new MemoryTtlCache<TokenIntrospection>(30, 2000);
  private readonly contextsCache = new MemoryTtlCache<MeContexts>(30, 1000);
  private readonly meCache = new MemoryTtlCache<AuthUser>(30, 1000);

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.baseUrl = config.get('AUTH_SERVICE_URL', { infer: true });
  }

  login(
    body: { email: string; password: string },
    client: ForwardedClient,
  ): Promise<IdentitySession> {
    return this.post('/api/auth/login', body, client, {
      [HttpStatus.BAD_REQUEST]: HttpStatus.UNAUTHORIZED,
    });
  }

  register(
    body: {
      email: string;
      password: string;
      fullName: string;
      dateOfBirth: string;
    },
    client: ForwardedClient,
  ): Promise<IdentitySession> {
    return this.post('/api/auth/register', body, client);
  }

  refresh(
    refreshToken: string,
    client: ForwardedClient,
  ): Promise<IdentitySession> {
    return this.post('/api/auth/refresh', { refreshToken }, client, {
      [HttpStatus.BAD_REQUEST]: HttpStatus.UNAUTHORIZED,
      [HttpStatus.INTERNAL_SERVER_ERROR]: HttpStatus.UNAUTHORIZED,
    });
  }

  async logout(refreshToken: string, client: ForwardedClient): Promise<void> {
    this.clearCaches();
    await this.post<unknown>('/api/auth/logout', { refreshToken }, client);
  }

  changePassword(
    body: { currentPassword: string; newPassword: string },
    accessToken: string,
    refreshToken: string | undefined,
    client: ForwardedClient,
  ): Promise<IdentitySession> {
    this.clearCaches();
    return this.post(
      '/api/auth/change-password',
      body,
      client,
      {},
      {
        Authorization: `Bearer ${accessToken}`,
        ...(refreshToken ? { Cookie: `ls_rt=${refreshToken}` } : {}),
      },
    );
  }

  switchTenant(
    body: { tenantSlug: string },
    accessToken: string,
    client: ForwardedClient,
  ): Promise<IdentitySession> {
    this.clearCaches();
    return this.post(
      '/api/auth/switch-tenant',
      body,
      client,
      {},
      {
        Authorization: `Bearer ${accessToken}`,
      },
    );
  }

  async introspect(
    token: string,
    client: ForwardedClient = { userAgent: null, ip: null },
  ): Promise<TokenIntrospection> {
    const cached = this.introspectCache.get(token);
    if (cached) return cached;

    const { res, payload } = await this.postRaw(
      '/api/auth/introspect',
      { token },
      client,
    );
    if (!res.ok) this.throwAuthError(payload, res.status);
    const result = normalizeIntrospection(payload?.data ?? payload?.Data ?? payload);
    if (result.active) {
      this.introspectCache.set(token, result, 30);
    }
    return result;
  }

  async contexts(
    accessToken: string,
    client: ForwardedClient = { userAgent: null, ip: null },
  ): Promise<MeContexts> {
    const cached = this.contextsCache.get(accessToken);
    if (cached) return cached;

    const payload = await this.getRaw('/api/auth/contexts', client, {
      Authorization: `Bearer ${accessToken}`,
    });
    const result = normalizeContexts(payload?.data ?? payload?.Data ?? payload);
    this.contextsCache.set(accessToken, result, 30);
    return result;
  }

  async me(
    accessToken: string,
    client: ForwardedClient = { userAgent: null, ip: null },
  ): Promise<AuthUser> {
    const cached = this.meCache.get(accessToken);
    if (cached) return cached;

    const payload = await this.getRaw('/api/auth/me', client, {
      Authorization: `Bearer ${accessToken}`,
    });
    const result = normalizeAuthUser(payload?.data ?? payload?.Data ?? payload);
    this.meCache.set(accessToken, result, 30);
    return result;
  }

  clearCaches(): void {
    this.introspectCache.clear();
    this.contextsCache.clear();
    this.meCache.clear();
  }

  private async post<T>(
    path: string,
    body: unknown,
    client: ForwardedClient,
    statusMap: Partial<Record<number, number>> = {},
    extraHeaders: Record<string, string> = {},
  ): Promise<T> {
    const { res, payload } = await this.postRaw(
      path,
      body,
      client,
      extraHeaders,
    );

    const isSuccess = payload?.success ?? payload?.Success;
    if (!res.ok || isSuccess === false) {
      const status = res.ok
        ? (payload?.statusCode ?? payload?.StatusCode ?? 400)
        : res.status;
      const mapped = statusMap[status] ?? status;
      this.throwAuthError(payload, mapped);
    }

    const rawData = payload?.data ?? payload?.Data;
    if (!rawData) {
      return rawData as T;
    }

    if (rawData.accessToken || rawData.AccessToken) {
      const u = rawData.user || rawData.User;
      const normalizedSession = {
        accessToken: rawData.accessToken || rawData.AccessToken,
        refreshToken: rawData.refreshToken || rawData.RefreshToken,
        user: u
          ? {
              id: u.id || u.Id,
              email: u.email || u.Email,
              fullName: u.fullName || u.FullName,
              dateOfBirth: u.dateOfBirth || u.DateOfBirth,
              gender: u.gender || u.Gender,
              phone: u.phone || u.Phone,
              address: u.address || u.Address,
              avatarUrl: u.avatarUrl || u.AvatarUrl,
              locale: u.locale || u.Locale || 'vi',
              timezone: u.timezone || u.Timezone || 'Asia/Ho_Chi_Minh',
              systemRole: u.systemRole || u.SystemRole,
              mustChangePassword:
                u.mustChangePassword ?? u.MustChangePassword ?? false,
            }
          : u,
      };
      return normalizedSession as unknown as T;
    }

    return rawData as T;
  }

  private async postRaw(
    path: string,
    body: unknown,
    client: ForwardedClient,
    extraHeaders: Record<string, string> = {},
  ): Promise<{ res: Response; payload: any }> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: this.headers(client, {
          'Content-Type': 'application/json',
          ...extraHeaders,
        }),
        body: JSON.stringify(body),
      });
    } catch (error) {
      this.logger.error(`Goi AuthService that bai: ${path}`, error as Error);
      throw new ServiceUnavailableException(UNAVAILABLE);
    }
    return { res, payload: (await res.json().catch(() => null)) as any };
  }

  private async getRaw(
    path: string,
    client: ForwardedClient,
    extraHeaders: Record<string, string> = {},
  ): Promise<any> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: this.headers(client, extraHeaders),
      });
    } catch (error) {
      this.logger.error(`Goi AuthService that bai: ${path}`, error as Error);
      throw new ServiceUnavailableException(UNAVAILABLE);
    }

    const payload = (await res.json().catch(() => null)) as any;
    const isSuccess = payload?.success ?? payload?.Success;
    if (!res.ok || isSuccess === false) {
      const status = res.ok
        ? (payload?.statusCode ?? payload?.StatusCode ?? 400)
        : res.status;
      this.throwAuthError(payload, status);
    }
    return payload;
  }

  private headers(
    client: ForwardedClient,
    extraHeaders: Record<string, string> = {},
  ): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...extraHeaders,
    };
    if (client.userAgent) headers['User-Agent'] = client.userAgent;
    if (client.ip) headers['X-Forwarded-For'] = client.ip;
    return headers;
  }

  private throwAuthError(payload: any, status: number): never {
    const message =
      payload?.message ||
      payload?.Message ||
      (status >= 500 ? UNAVAILABLE : 'Yeu cau that bai');
    throw new HttpException(message, status);
  }
}

function prop<T = any>(
  source: any,
  camel: string,
  pascal: string,
): T | undefined {
  return source?.[camel] ?? source?.[pascal];
}

function normalizeTenant(raw: any): IdentityTenantSummary | null {
  if (!raw) return null;
  return {
    id: String(prop(raw, 'id', 'Id') ?? ''),
    slug: String(prop(raw, 'slug', 'Slug') ?? ''),
    name: String(prop(raw, 'name', 'Name') ?? ''),
    logoUrl: prop(raw, 'logoUrl', 'LogoUrl') ?? null,
    status: prop<TenantStatus>(raw, 'status', 'Status') as TenantStatus,
  };
}

function normalizeRoles(raw: any): TenantRole[] {
  return Array.isArray(raw) ? (raw.filter(Boolean) as TenantRole[]) : [];
}

function normalizeStringArray(raw: any): string[] {
  return Array.isArray(raw) ? raw.filter((item) => typeof item === 'string') : [];
}

function normalizeIntrospection(raw: any): TokenIntrospection {
  const elearning = prop(raw, 'elearning', 'Elearning');
  return {
    active: Boolean(prop(raw, 'active', 'Active')),
    userId: prop(raw, 'userId', 'UserId') ?? null,
    email: prop(raw, 'email', 'Email') ?? null,
    fullName: prop(raw, 'fullName', 'FullName') ?? null,
    systemRole: (prop(raw, 'systemRole', 'SystemRole') ??
      null) as SystemRole | null,
    mustChangePassword: Boolean(
      prop(raw, 'mustChangePassword', 'MustChangePassword'),
    ),
    tenant: normalizeTenant(prop(raw, 'tenant', 'Tenant')),
    membershipId: prop(raw, 'membershipId', 'MembershipId') ?? null,
    roles: normalizeRoles(prop(raw, 'roles', 'Roles')),
    permissions: normalizeStringArray(prop(raw, 'permissions', 'Permissions')),
    elearning: {
      canAccess: Boolean(prop(elearning, 'canAccess', 'CanAccess')),
      canBypassAuthorization: Boolean(
        prop(elearning, 'canBypassAuthorization', 'CanBypassAuthorization'),
      ),
      permissions: normalizeStringArray(prop(elearning, 'permissions', 'Permissions')),
    },
  };
}

function normalizeContexts(raw: any): MeContexts {
  const tenants = prop<any[]>(raw, 'tenants', 'Tenants') ?? [];
  return {
    systemRole: prop<SystemRole>(raw, 'systemRole', 'SystemRole') as SystemRole,
    tenants: tenants.map((item) => {
      const tenant = normalizeTenant(prop(item, 'tenant', 'Tenant'));
      return {
        membershipId: String(prop(item, 'membershipId', 'MembershipId') ?? ''),
        roles: normalizeRoles(prop(item, 'roles', 'Roles')),
        permissions: normalizeStringArray(prop(item, 'permissions', 'Permissions')),
        joinedAt: String(prop(item, 'joinedAt', 'JoinedAt') ?? ''),
        tenant: {
          id: tenant?.id ?? '',
          slug: tenant?.slug ?? '',
          name: tenant?.name ?? '',
          logoUrl: tenant?.logoUrl ?? null,
          status: (tenant?.status ?? 'ACTIVE') as TenantStatus,
          rejectionReason: null,
        },
      };
    }),
  };
}

function normalizeAuthUser(raw: any): AuthUser {
  return {
    id: String(prop(raw, 'id', 'Id') ?? ''),
    email: String(prop(raw, 'email', 'Email') ?? ''),
    fullName: String(prop(raw, 'fullName', 'FullName') ?? ''),
    dateOfBirth: String(prop(raw, 'dateOfBirth', 'DateOfBirth') ?? ''),
    gender: (prop(raw, 'gender', 'Gender') ?? null) as Gender | null,
    phone: prop(raw, 'phone', 'Phone') ?? null,
    address: prop(raw, 'address', 'Address') ?? null,
    avatarUrl: prop(raw, 'avatarUrl', 'AvatarUrl') ?? null,
    locale: String(prop(raw, 'locale', 'Locale') ?? 'vi'),
    timezone: String(prop(raw, 'timezone', 'Timezone') ?? 'Asia/Ho_Chi_Minh'),
    systemRole: prop(raw, 'systemRole', 'SystemRole') as SystemRole,
    mustChangePassword: Boolean(
      prop(raw, 'mustChangePassword', 'MustChangePassword'),
    ),
  };
}
