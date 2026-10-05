import 'reflect-metadata';
import {
  Injectable,
  RequestMethod,
  type CallHandler,
  type ExecutionContext,
  type INestApplication,
  type NestInterceptor,
  type Provider,
  type Type,
} from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  MembershipStatus,
  SystemRole,
  TenantRole,
  TenantStatus,
  UserStatus,
  resolvePermissions,
} from '@lang/shared';
import type { Response } from 'express';
import { of } from 'rxjs';
import request from 'supertest';
import { AppModule } from './app.module';
import { AuthModule } from './auth/auth.module';
import { IdentityProviderClient } from './auth/identity-provider.client';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { MembershipRole } from './memberships/membership-role.entity';
import { Membership } from './memberships/membership.entity';
import { Tenant } from './tenants/tenant.entity';
import { InMemoryRepository } from './testing/in-memory-repository';
import { User } from './users/user.entity';

// Test e2e phân quyền (plan mục 5) cho MỌI route của `AppModule`: app Nest thật
// (controller, guard toàn cục của `AuthModule`, `TenantGuard`, filter lỗi) với
// repository trong bộ nhớ; service được thay bằng object rỗng và interceptor
// gắn header `x-access-reached` ngay sau khi qua guard nên không route nào chạy thật.
// Quy tắc nằm trong service (Teacher chỉ sửa đề mình, không chấm bài mình,
// bảo vệ Owner…) do unit test của từng service kiểm.

const { SYSTEM_OWNER, SYSTEM_ADMIN, REGISTERED_USER } = SystemRole;
const { TENANT_OWNER, TENANT_ADMIN, TEACHER, STUDENT, PARENT } = TenantRole;

type Access =
  /** Không cần đăng nhập. */
  | { kind: 'public' }
  /** Mọi user đã đăng nhập; `pending`: cả khi còn phải đổi mật khẩu. */
  | { kind: 'user'; pending?: boolean }
  | { kind: 'system'; roles: SystemRole[] }
  /** Thành viên active của tenant active; không có `roles` = mọi role. */
  | { kind: 'tenant'; roles?: TenantRole[] };

const PUBLIC: Access = { kind: 'public' };
const USER: Access = { kind: 'user' };
const PENDING_OK: Access = { kind: 'user', pending: true };
const SYSTEM: Access = { kind: 'system', roles: [SYSTEM_OWNER, SYSTEM_ADMIN] };
const SYSTEM_OWNER_ONLY: Access = { kind: 'system', roles: [SYSTEM_OWNER] };
const MEMBER: Access = { kind: 'tenant' };
const MANAGER: Access = { kind: 'tenant', roles: [TENANT_OWNER, TENANT_ADMIN] };
/** "Con của tôi": chỉ Phụ huynh, còn liên kết với con kiểm trong service. */
const PARENT_ONLY: Access = { kind: 'tenant', roles: [PARENT] };
/** Tạo/sửa đề, media, chấm bài, dashboard tenant. */
const STAFF: Access = {
  kind: 'tenant',
  roles: [TENANT_OWNER, TENANT_ADMIN, TEACHER],
};

/** Bảng quyền viết tay theo plan mục 5 (không đọc từ decorator). */
const ROUTES: Record<string, Access> = {
  'GET /': PUBLIC,
  'GET /health': PUBLIC,
  'GET /public/plans': PUBLIC,
  'GET /public/tenants/:slug': PUBLIC,

  'POST /auth/register': PUBLIC,
  'POST /auth/login': PUBLIC,
  'POST /auth/refresh': PUBLIC,
  'POST /auth/logout': PUBLIC,
  'GET /auth/me': PENDING_OK,
  'POST /auth/change-password': PENDING_OK,
  'POST /auth/switch-tenant': USER,

  'GET /me/contexts': USER,
  'GET /me/notifications': USER,
  'GET /me/notifications/unread-count': USER,
  'POST /me/notifications/read-all': USER,
  'POST /me/notifications/:id/read': USER,
  'PATCH /me/profile': USER,
  'POST /me/branding/upload': USER,
  'POST /tenants': USER,
  'GET /tenants/mine': USER,
  'GET /tenants/slug-suggestion': USER,
  'PUT /tenants/:id': USER,

  'GET /admin/stats': SYSTEM,
  'GET /admin/users': SYSTEM,
  'POST /admin/users': SYSTEM,
  'GET /admin/users/:id': SYSTEM,
  'PATCH /admin/users/:id': SYSTEM,
  'POST /admin/users/:id/lock': SYSTEM,
  'POST /admin/users/:id/unlock': SYSTEM,
  'POST /admin/users/:id/reset-password': SYSTEM,
  'PATCH /admin/users/:id/system-role': SYSTEM_OWNER_ONLY,
  'GET /admin/tenants': SYSTEM,
  'GET /admin/tenants/:id': SYSTEM,
  'POST /admin/tenants/:id/approve': SYSTEM,
  'POST /admin/tenants/:id/reject': SYSTEM,
  'POST /admin/tenants/:id/suspend': SYSTEM,
  'POST /admin/tenants/:id/unsuspend': SYSTEM,
  'PATCH /admin/tenants/:id/plan': SYSTEM,
  'PATCH /admin/tenants/:id/ai': SYSTEM,
  'GET /admin/plans': SYSTEM,
  'POST /admin/plans': SYSTEM,
  'PATCH /admin/plans/:id': SYSTEM,
  'DELETE /admin/plans/:id': SYSTEM,
  'GET /admin/categories': SYSTEM,
  'POST /admin/categories': SYSTEM,
  'PATCH /admin/categories/:id': SYSTEM,
  'DELETE /admin/categories/:id': SYSTEM,
  'GET /admin/exam-blueprints': SYSTEM,
  'POST /admin/exam-blueprints': SYSTEM,
  'PATCH /admin/exam-blueprints/:id': SYSTEM,
  'DELETE /admin/exam-blueprints/:id': SYSTEM,
  'GET /admin/lesson-blueprints': SYSTEM,
  'POST /admin/lesson-blueprints': SYSTEM,
  'PATCH /admin/lesson-blueprints/:id': SYSTEM,
  'DELETE /admin/lesson-blueprints/:id': SYSTEM,
  'GET /admin/user-manual': SYSTEM,

  'GET /t/:slug/me': MEMBER,
  'GET /t/:slug/dashboard/stats': STAFF,

  'GET /t/:slug/memberships': MANAGER,
  'POST /t/:slug/memberships/add-by-email': MANAGER,
  'POST /t/:slug/memberships/create-account': MANAGER,
  'GET /t/:slug/memberships/deactivation-suggestions': MANAGER,
  'GET /t/:slug/memberships/:id': MANAGER,
  'PATCH /t/:slug/memberships/:id': MANAGER,
  'DELETE /t/:slug/memberships/:id': MANAGER,
  'POST /t/:slug/memberships/:id/guardians': MANAGER,
  'DELETE /t/:slug/memberships/:id/guardians/:parentMembershipId': MANAGER,

  // Teacher chỉ xem danh mục/loại đề/mẫu bài học của tenant.
  'GET /t/:slug/categories': STAFF,
  'POST /t/:slug/categories': MANAGER,
  'PATCH /t/:slug/categories/:id': MANAGER,
  'DELETE /t/:slug/categories/:id': MANAGER,
  'GET /t/:slug/exam-blueprints': STAFF,
  'POST /t/:slug/exam-blueprints': MANAGER,
  'PATCH /t/:slug/exam-blueprints/:id': MANAGER,
  'DELETE /t/:slug/exam-blueprints/:id': MANAGER,
  'GET /t/:slug/lesson-blueprints': STAFF,
  'POST /t/:slug/lesson-blueprints': MANAGER,
  'PATCH /t/:slug/lesson-blueprints/:id': MANAGER,
  'DELETE /t/:slug/lesson-blueprints/:id': MANAGER,

  'GET /t/:slug/media/status': STAFF,
  'GET /t/:slug/media': STAFF,
  'POST /t/:slug/media/upload': STAFF,
  'DELETE /t/:slug/media': STAFF,

  'GET /t/:slug/exams': STAFF,
  'GET /t/:slug/exams/creators': STAFF,
  'POST /t/:slug/exams': STAFF,
  'GET /t/:slug/exams/:id': STAFF,
  'PATCH /t/:slug/exams/:id': STAFF,
  'PUT /t/:slug/exams/:id/content': STAFF,
  'GET /t/:slug/exams/:id/versions': STAFF,
  'GET /t/:slug/exams/:id/versions/:version': STAFF,
  'POST /t/:slug/exams/:id/versions/:version/restore': STAFF,
  'POST /t/:slug/exams/:id/clone': STAFF,
  'POST /t/:slug/exams/:id/publish': STAFF,
  'POST /t/:slug/exams/:id/archive': STAFF,
  'DELETE /t/:slug/exams/:id': STAFF,
  'GET /t/:slug/ai/status': STAFF,
  'POST /t/:slug/exams/:id/ai-format': STAFF,
  'GET /t/:slug/exams/:id/ai-format/:jobId': STAFF,
  'DELETE /t/:slug/exams/:id/ai-format/:jobId': STAFF,
  'GET /t/:slug/lessons': STAFF,
  'GET /t/:slug/lessons/creators': STAFF,
  'POST /t/:slug/lessons': STAFF,
  'GET /t/:slug/lessons/:id': STAFF,
  'PATCH /t/:slug/lessons/:id': STAFF,
  'PUT /t/:slug/lessons/:id/content': STAFF,
  'GET /t/:slug/lessons/:id/versions': STAFF,
  'GET /t/:slug/lessons/:id/versions/:version': STAFF,
  'POST /t/:slug/lessons/:id/versions/:version/restore': STAFF,
  'POST /t/:slug/lessons/:id/clone': STAFF,
  'POST /t/:slug/lessons/:id/publish': STAFF,
  'POST /t/:slug/lessons/:id/archive': STAFF,
  'DELETE /t/:slug/lessons/:id': STAFF,

  // Khoá học: Teacher chỉ xem; gắn/bỏ giáo trình chỉ Owner/Admin (R6).
  'GET /t/:slug/courses': STAFF,
  'POST /t/:slug/courses': MANAGER,
  'GET /t/:slug/courses/:id': STAFF,
  'PATCH /t/:slug/courses/:id': MANAGER,
  'DELETE /t/:slug/courses/:id': MANAGER,
  'POST /t/:slug/courses/:id/curricula/:curriculumId': MANAGER,
  'DELETE /t/:slug/courses/:id/curricula/:curriculumId': MANAGER,
  // Giáo trình: Teacher tạo, nhân bản, sửa/xoá giáo trình mình tạo (service).
  'GET /t/:slug/curricula': STAFF,
  'GET /t/:slug/curricula/creators': STAFF,
  'POST /t/:slug/curricula': STAFF,
  'GET /t/:slug/curricula/:id': STAFF,
  'PATCH /t/:slug/curricula/:id': STAFF,
  'PUT /t/:slug/curricula/:id/items': STAFF,
  'POST /t/:slug/curricula/:id/clone': STAFF,
  'DELETE /t/:slug/curricula/:id': STAFF,
  // Lớp học: Teacher chỉ lớp mình phụ trách, sửa giáo trình lớp (service).
  'GET /t/:slug/classes': STAFF,
  'POST /t/:slug/classes': MANAGER,
  'GET /t/:slug/classes/:id': STAFF,
  'PATCH /t/:slug/classes/:id': MANAGER,
  'POST /t/:slug/classes/:id/status': MANAGER,
  'DELETE /t/:slug/classes/:id': MANAGER,
  'GET /t/:slug/classes/:id/members': STAFF,
  'POST /t/:slug/classes/:id/teachers': MANAGER,
  'DELETE /t/:slug/classes/:id/teachers/:membershipId': MANAGER,
  'POST /t/:slug/classes/:id/students': MANAGER,
  'DELETE /t/:slug/classes/:id/students/:membershipId': MANAGER,
  'GET /t/:slug/classes/:id/curriculum': STAFF,
  'PUT /t/:slug/classes/:id/curriculum': STAFF,
  'GET /t/:slug/classes/:id/items/:itemId/attempts': STAFF,
  'POST /t/:slug/classes/:id/items/:itemId/void/:attemptId': STAFF,
  'GET /t/:slug/classes/:id/students/:membershipId/attempts': STAFF,
  'GET /t/:slug/classes/:id/students/:membershipId/attempts/:attemptId': STAFF,
  'GET /t/:slug/classes/:id/students/:membershipId/attempts/:attemptId/recordings/:answerId/url':
    STAFF,
  'GET /t/:slug/classes/:id/students/:membershipId/lesson-attempts/:attemptId':
    STAFF,
  'GET /t/:slug/classes/:id/students/:membershipId/lesson-attempts/:attemptId/recordings/:answerId/url':
    STAFF,
  'GET /t/:slug/classes/:id/progress/attendance': STAFF,
  'GET /t/:slug/classes/:id/progress/gradebook': STAFF,
  'GET /t/:slug/classes/:id/progress/export.xlsx': STAFF,
  'PUT /t/:slug/classes/:id/students/:membershipId/comment': STAFF,
  'GET /t/:slug/classes/:id/logs': STAFF,
  'POST /t/:slug/classes/:id/conflicts': MANAGER,
  'GET /t/:slug/classes/:id/schedule': STAFF,
  'PUT /t/:slug/classes/:id/schedule': MANAGER,
  'POST /t/:slug/classes/:id/schedule/preview': MANAGER,
  'POST /t/:slug/classes/:id/sessions/makeup': STAFF,
  'PATCH /t/:slug/classes/:id/sessions/:sessionId': STAFF,
  'POST /t/:slug/classes/:id/sessions/:sessionId/cancel': STAFF,
  'POST /t/:slug/classes/:id/sessions/:sessionId/restore': STAFF,
  'DELETE /t/:slug/classes/:id/sessions/:sessionId': STAFF,
  'PUT /t/:slug/classes/:id/sessions/:sessionId/links': STAFF,
  'GET /t/:slug/courses/:id/sessions': STAFF,
  'GET /t/:slug/sessions/:sessionId': STAFF,
  'GET /t/:slug/schedule/mine': STAFF,
  'GET /t/:slug/schedule/center': MANAGER,
  'GET /t/:slug/settings': MANAGER,
  'PATCH /t/:slug/settings': MANAGER,
  'POST /t/:slug/settings/holidays': MANAGER,
  'POST /t/:slug/settings/holidays/impact': MANAGER,
  'PATCH /t/:slug/settings/holidays/:id': MANAGER,
  'DELETE /t/:slug/settings/holidays/:id': MANAGER,

  'GET /t/:slug/grading/delegations': STAFF,
  'POST /t/:slug/grading/delegations': STAFF,
  'DELETE /t/:slug/grading/delegations/:id': STAFF,
  'GET /t/:slug/grading/attempts': STAFF,
  'GET /t/:slug/grading/attempts/:id': STAFF,
  'GET /t/:slug/grading/attempts/:id/recordings/:answerId/url': STAFF,
  'PUT /t/:slug/grading/answers/:answerId': STAFF,
  'GET /t/:slug/grading/lesson-attempts': STAFF,
  'GET /t/:slug/grading/lesson-attempts/:id': STAFF,
  'GET /t/:slug/grading/lesson-attempts/:id/recordings/:answerId/url': STAFF,
  'PUT /t/:slug/grading/lesson-answers/:answerId': STAFF,

  // Mọi thành viên đều được thi (quyền trên lượt làm kiểm trong service).
  'GET /t/:slug/learner/exams': MEMBER,
  'GET /t/:slug/learner/exams/:id': MEMBER,
  'POST /t/:slug/learner/exams/:id/attempts': MEMBER,
  'GET /t/:slug/learner/attempts': MEMBER,
  'GET /t/:slug/learner/attempts/:id': MEMBER,
  'POST /t/:slug/learner/attempts/:id/sections/:sectionId/start': MEMBER,
  'PUT /t/:slug/learner/attempts/:id/sections/:sectionId/responses': MEMBER,
  'POST /t/:slug/learner/attempts/:id/sections/:sectionId/submit': MEMBER,
  'POST /t/:slug/learner/attempts/:id/finish': MEMBER,
  'POST /t/:slug/learner/attempts/:id/recordings': MEMBER,
  'GET /t/:slug/learner/attempts/:id/recordings/:answerId/url': MEMBER,
  'GET /t/:slug/learner/attempts/:id/result': MEMBER,
  'GET /t/:slug/learner/classes': MEMBER,
  'GET /t/:slug/learner/classes/:id': MEMBER,
  'POST /t/:slug/learner/classes/:id/items/:itemId/start': MEMBER,
  'GET /t/:slug/learner/schedule': MEMBER,
  'GET /t/:slug/learner/lessons': MEMBER,
  'GET /t/:slug/learner/lessons/:id': MEMBER,
  'POST /t/:slug/learner/lessons/:id/attempts': MEMBER,
  'GET /t/:slug/learner/lesson-attempts/:id': MEMBER,
  'PUT /t/:slug/learner/lesson-attempts/:id/sections/:sectionId/view': MEMBER,
  'PUT /t/:slug/learner/lesson-attempts/:id/sections/:sectionId/responses':
    MEMBER,
  'POST /t/:slug/learner/lesson-attempts/:id/sections/:sectionId/submit':
    MEMBER,
  'POST /t/:slug/learner/lesson-attempts/:id/sections/:sectionId/retry': MEMBER,
  'POST /t/:slug/learner/lesson-attempts/:id/recordings': MEMBER,
  'GET /t/:slug/learner/lesson-attempts/:id/sections/:sectionId/recordings/:number/url':
    MEMBER,
  'GET /t/:slug/learner/lesson-attempts/:id/answers/:answerId/recording-url':
    MEMBER,

  'GET /t/:slug/children': PARENT_ONLY,
  'GET /t/:slug/children/:membershipId': PARENT_ONLY,
  'GET /t/:slug/children/:membershipId/classes/:classId': PARENT_ONLY,
  'GET /t/:slug/children/:membershipId/schedule': PARENT_ONLY,
};

interface ModuleLike {
  module?: Type;
  imports?: unknown[];
  controllers?: Type[];
  providers?: Provider[];
}

/** Controller của module và mọi module import (kể cả dynamic module). */
function collectControllers(root: Type): Type[] {
  const seen = new Set<unknown>();
  const controllers = new Set<Type>();
  const visit = (entry: unknown) => {
    if (!entry || seen.has(entry)) return;
    seen.add(entry);
    const dynamic = entry as ModuleLike;
    const type = (dynamic.module ?? entry) as Type;
    const metadata = (key: string) =>
      (Reflect.getMetadata(key, type) as unknown[] | undefined) ?? [];
    [...metadata('controllers'), ...(dynamic.controllers ?? [])].forEach(
      (controller) => controllers.add(controller as Type),
    );
    [...metadata('imports'), ...(dynamic.imports ?? [])].forEach(visit);
  };
  visit(root);
  return [...controllers];
}

interface Route {
  key: string;
  method: string;
  path: string;
}

function joinPath(...parts: string[]): string {
  const path = parts
    .flatMap((part) => part.split('/'))
    .filter(Boolean)
    .join('/');
  return `/${path}`;
}

function collectRoutes(controllers: Type[]): Route[] {
  return controllers.flatMap((controller) => {
    const base = Reflect.getMetadata(PATH_METADATA, controller) as string;
    const prototype = controller.prototype as Record<string, unknown>;
    return Object.getOwnPropertyNames(prototype).flatMap((name) => {
      const handler = prototype[name];
      if (name === 'constructor' || typeof handler !== 'function') return [];
      const path = Reflect.getMetadata(PATH_METADATA, handler) as
        string | undefined;
      if (path === undefined) return [];
      const method =
        RequestMethod[
          Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod
        ];
      const full = joinPath(base, path);
      return [{ key: `${method} ${full}`, method, path: full }];
    });
  });
}

/**
 * Dừng request ngay sau guard (interceptor chạy sau mọi guard, trước pipe) và
 * đánh dấu bằng header: route `@HttpCode(204)` không trả body.
 */
@Injectable()
class ReachedInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, _next: CallHandler) {
    context
      .switchToHttp()
      .getResponse<Response>()
      .setHeader(REACHED_HEADER, '1');
    return of(null);
  }
}

const SLUG = 'a-chau';
const PENDING_SLUG = 'cho-duyet';
const ID = '00000000-0000-4000-8000-000000000001';

interface Actor {
  name: string;
  /** Không có = khách; chuỗi = header Authorization nguyên văn. */
  token?: () => Promise<string> | string;
  slug?: string;
  /** Kết quả mong đợi (status) hoặc `reached` nếu qua được guard. */
  expect: (access: Access) => number | 'reached';
}

const REACHED = 'reached' as const;
const REACHED_HEADER = 'x-access-reached';

function inactiveIntrospection() {
  return {
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
  };
}

describe('Phân quyền API (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let baseUrl: string;
  let identity: Pick<IdentityProviderClient, 'introspect' | 'contexts'>;
  const users = new InMemoryRepository<User>(() => ({
    status: UserStatus.ACTIVE,
    systemRole: REGISTERED_USER,
    mustChangePassword: false,
    tokenVersion: 0,
    deletedAt: null,
  }));
  const tenants = new InMemoryRepository<Tenant>(() => ({ deletedAt: null }));
  const memberships = new InMemoryRepository<Membership>(() => ({
    status: MembershipStatus.ACTIVE,
    lastActiveAt: null,
    deletedAt: null,
  }));
  const membershipRoles = new InMemoryRepository<MembershipRole>(undefined, [
    'membershipId',
    'role',
  ]);

  const controllers = collectControllers(AppModule);
  const routes = collectRoutes(controllers);

  beforeAll(async () => {
    identity = {
      introspect: jest.fn(async (token: string) => {
        let payload: { sub: string; tv?: number };
        try {
          payload = await jwt.verifyAsync(token);
        } catch {
          return inactiveIntrospection();
        }
        const user = users.rows.find((row) => row.id === payload.sub);
        if (
          !user ||
          user.status !== UserStatus.ACTIVE ||
          user.deletedAt ||
          user.tokenVersion !== (payload.tv ?? 0)
        ) {
          return inactiveIntrospection();
        }
        return {
          active: true,
          userId: user.id,
          email: user.email,
          fullName: user.fullName ?? null,
          systemRole: user.systemRole,
          mustChangePassword: user.mustChangePassword,
          tenant: null,
          membershipId: null,
          roles: [],
          permissions: resolvePermissions(user.systemRole, []),
          elearning: {
            canAccess: true,
            canBypassAuthorization: user.systemRole === SYSTEM_OWNER,
            permissions: resolvePermissions(user.systemRole, []),
          },
        };
      }),
      contexts: jest.fn(async (accessToken: string) => {
        let payload: { sub: string };
        try {
          payload = await jwt.verifyAsync(accessToken);
        } catch {
          return { systemRole: REGISTERED_USER, tenants: [] };
        }
        const user = users.rows.find((row) => row.id === payload.sub);
        if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt) {
          return { systemRole: REGISTERED_USER, tenants: [] };
        }
        const tenantContexts = memberships.rows
          .filter(
            (membership) =>
              membership.userId === user.id &&
              membership.status === MembershipStatus.ACTIVE &&
              !membership.deletedAt,
          )
          .flatMap((membership) => {
            const tenant = tenants.rows.find(
              (item) =>
                item.id === membership.tenantId &&
                item.status === TenantStatus.ACTIVE &&
                !item.deletedAt,
            );
            if (!tenant) return [];
            const roles = membershipRoles.rows
              .filter((role) => role.membershipId === membership.id)
              .map((role) => role.role);
            return [
              {
                membershipId: membership.id,
                roles,
                permissions: resolvePermissions(user.systemRole, roles),
                joinedAt:
                  membership.joinedAt?.toISOString() ??
                  new Date().toISOString(),
                tenant: {
                  id: tenant.id,
                  slug: tenant.slug,
                  name: tenant.name ?? '',
                  logoUrl: tenant.logoUrl ?? null,
                  status: tenant.status,
                  rejectionReason: tenant.rejectionReason ?? null,
                },
              },
            ];
          });
        return { systemRole: user.systemRole, tenants: tenantContexts };
      }),
    };
    const globalGuards = (
      (Reflect.getMetadata('providers', AuthModule) as Provider[]) ?? []
    ).filter(
      (provider) =>
        typeof provider === 'object' && provider.provide === APP_GUARD,
    );
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'access-control-e2e-secret-access-control-e2e',
          verifyOptions: { algorithms: ['HS256'] },
        }),
      ],
      controllers,
      providers: [
        ...globalGuards,
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        { provide: APP_INTERCEPTOR, useClass: ReachedInterceptor },
        {
          provide: ConfigService,
          useValue: new ConfigService({
            COOKIE_SECURE: false,
            REFRESH_EXPIRES_IN: '30d',
          }),
        },
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(Tenant), useValue: tenants },
        { provide: getRepositoryToken(Membership), useValue: memberships },
        {
          provide: getRepositoryToken(MembershipRole),
          useValue: membershipRoles,
        },
        { provide: IdentityProviderClient, useValue: identity },
      ],
    })
      // Service của controller: không bao giờ được gọi (interceptor dừng trước).
      .useMocker(() => ({}))
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    // Nghe một lần trên IPv4: để supertest tự mở cổng cho từng request thì cổng
    // ngẫu nhiên trên `::` có thể trùng cổng process khác đang nghe 127.0.0.1.
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
    jwt = moduleRef.get(JwtService);

    await tenants.save(
      tenants.create({
        id: 't-active',
        slug: SLUG,
        status: TenantStatus.ACTIVE,
      }),
    );
    await tenants.save(
      tenants.create({
        id: 't-pending',
        slug: PENDING_SLUG,
        status: TenantStatus.PENDING,
      }),
    );
  });

  afterAll(() => app?.close());

  async function addUser(id: string, data: Partial<User> = {}) {
    await users.save(users.create({ id, email: `${id}@example.com`, ...data }));
    return id;
  }

  async function addMember(
    userId: string,
    tenantId: string,
    roles: TenantRole[],
    status: MembershipStatus = MembershipStatus.ACTIVE,
  ) {
    const membership = await memberships.save(
      memberships.create({ id: `m-${userId}`, tenantId, userId, status }),
    );
    await membershipRoles.insert(
      roles.map((role) => ({ membershipId: membership.id, tenantId, role })),
    );
  }

  function bearer(userId: string, tokenVersion = 0) {
    return async () =>
      `Bearer ${await jwt.signAsync({ sub: userId, tv: tokenVersion })}`;
  }

  /** Thành viên tenant active: qua guard khi role nằm trong danh sách. */
  function memberExpect(roles: TenantRole[]) {
    return (access: Access) => {
      if (access.kind === 'system') return 403;
      if (access.kind !== 'tenant') return REACHED;
      return !access.roles || access.roles.some((role) => roles.includes(role))
        ? REACHED
        : 403;
    };
  }

  function actors(): Actor[] {
    const unauthenticated = (access: Access) =>
      access.kind === 'public' ? REACHED : 401;
    const tenantMemberRoles = [
      TENANT_OWNER,
      TENANT_ADMIN,
      TEACHER,
      STUDENT,
      PARENT,
    ];
    return [
      { name: 'khách', expect: unauthenticated },
      {
        name: 'token sai',
        token: () => 'Bearer abc.def.ghi',
        expect: unauthenticated,
      },
      {
        name: 'không phải Bearer',
        token: () => 'Basic abc',
        expect: unauthenticated,
      },
      {
        name: 'user bị khoá',
        token: bearer('locked'),
        expect: unauthenticated,
      },
      {
        name: 'token cũ (đã đổi mật khẩu)',
        token: bearer('registered', 1),
        expect: unauthenticated,
      },
      {
        name: 'user không tồn tại',
        token: bearer('ghost'),
        expect: unauthenticated,
      },
      {
        name: 'phải đổi mật khẩu',
        token: bearer('must-change'),
        slug: SLUG,
        expect: (access) =>
          access.kind === 'public' || (access.kind === 'user' && access.pending)
            ? REACHED
            : 403,
      },
      {
        name: 'Registered User không thuộc tenant',
        token: bearer('registered'),
        expect: (access) =>
          access.kind === 'system' || access.kind === 'tenant' ? 403 : REACHED,
      },
      {
        name: 'System Admin (không là thành viên)',
        token: bearer('system-admin'),
        expect: (access) =>
          access.kind === 'tenant' ||
          (access.kind === 'system' && !access.roles.includes(SYSTEM_ADMIN))
            ? 403
            : REACHED,
      },
      {
        name: 'System Owner (không là thành viên)',
        token: bearer('system-owner'),
        expect: (access) => (access.kind === 'tenant' ? 403 : REACHED),
      },
      ...tenantMemberRoles.map((role): Actor => ({
        name: role,
        token: bearer(role.toLowerCase()),
        expect: memberExpect([role]),
      })),
      {
        name: 'Student + Teacher',
        token: bearer('student-teacher'),
        expect: memberExpect([STUDENT, TEACHER]),
      },
      {
        name: 'Owner có membership inactive',
        token: bearer('inactive-owner'),
        expect: (access) =>
          access.kind === 'system' || access.kind === 'tenant' ? 403 : REACHED,
      },
      {
        name: 'Owner tenant đang chờ duyệt',
        token: bearer('pending-owner'),
        slug: PENDING_SLUG,
        expect: (access) =>
          access.kind === 'system' || access.kind === 'tenant' ? 403 : REACHED,
      },
      {
        name: 'người ngoài vào tenant chờ duyệt',
        token: bearer('tenant_owner'),
        slug: PENDING_SLUG,
        expect: (access) =>
          access.kind === 'system'
            ? 403
            : access.kind === 'tenant'
              ? 403
              : REACHED,
      },
      {
        name: 'slug không tồn tại',
        token: bearer('system-owner'),
        slug: 'khong-ton-tai',
        expect: (access) => (access.kind === 'tenant' ? 403 : REACHED),
      },
    ];
  }

  async function seedActors() {
    await addUser('locked', { status: UserStatus.LOCKED });
    await addUser('registered', {});
    await addUser('must-change', { mustChangePassword: true });
    await addMember('must-change', 't-active', [TENANT_OWNER]);
    await addUser('system-admin', { systemRole: SYSTEM_ADMIN });
    await addUser('system-owner', { systemRole: SYSTEM_OWNER });
    for (const role of [TENANT_OWNER, TENANT_ADMIN, TEACHER, STUDENT, PARENT]) {
      await addUser(role.toLowerCase());
      await addMember(role.toLowerCase(), 't-active', [role]);
    }
    await addUser('student-teacher');
    await addMember('student-teacher', 't-active', [STUDENT, TEACHER]);
    await addUser('inactive-owner');
    await addMember(
      'inactive-owner',
      't-active',
      [TENANT_OWNER],
      MembershipStatus.INACTIVE,
    );
    await addUser('pending-owner');
    await addMember('pending-owner', 't-pending', [TENANT_OWNER]);
  }

  it('bảng quyền liệt kê đúng mọi route của AppModule', () => {
    const actual = routes.map((route) => route.key).sort();
    expect(actual).toEqual(Object.keys(ROUTES).sort());
    expect(new Set(actual).size).toBe(actual.length);
  });

  describe('theo người gọi', () => {
    beforeAll(seedActors);

    it.each(actors().map((actor) => [actor.name, actor] as const))(
      '%s',
      async (_name, actor) => {
        const authorization = actor.token ? await actor.token() : undefined;
        const mismatches: string[] = [];
        for (const route of routes) {
          const access = ROUTES[route.key];
          if (!access) continue;
          const url = `/api${route.path}`
            .replace(':slug', actor.slug ?? SLUG)
            .replace(':version', '1')
            .replace(/:[A-Za-z]+/g, ID);
          const call =
            request(baseUrl)[route.method.toLowerCase() as 'get'](url);
          if (authorization) call.set('Authorization', authorization);
          const response = await call;
          const reached = response.headers[REACHED_HEADER] === '1';
          const actual = reached ? REACHED : response.status;
          const expected = actor.expect(access);
          if (actual !== expected) {
            mismatches.push(
              `${route.key}: mong đợi ${expected}, nhận ${actual}`,
            );
          }
          if (!reached && typeof expected === 'number') {
            // Lỗi phân quyền luôn có message tiếng Việt, không lộ chi tiết.
            expect(response.body).toEqual({
              statusCode: expected,
              message: expect.any(String),
            });
          }
        }
        expect(mismatches).toEqual([]);
      },
    );
  });

  it('TenantGuard nhận slug không phân biệt hoa thường', async () => {
    const response = await request(baseUrl)
      .get('/api/t/A-Chau/me')
      .set('Authorization', await bearer('student')());
    expect(response.headers[REACHED_HEADER]).toBe('1');
  });
});
