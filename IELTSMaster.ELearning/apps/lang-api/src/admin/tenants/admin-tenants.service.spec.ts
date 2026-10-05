import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AiFormatRunStatus,
  MembershipStatus,
  SystemRole,
  TenantRole,
  TenantStatus,
} from '@lang/shared';
import type { AiFormatRun } from '../../ai-format/ai-format-run.entity';
import { countAiUsage } from '../../ai-format/ai-usage';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import type { MembershipRole } from '../../memberships/membership-role.entity';
import type { Membership } from '../../memberships/membership.entity';
import type { ServicePlan } from '../../plans/service-plan.entity';
import type { TenantRequest } from '../../tenants/tenant-context';
import type { Tenant } from '../../tenants/tenant.entity';
import { TenantGuard } from '../../tenants/tenant.guard';
import { InMemoryRepository } from '../../testing/in-memory-repository';
import { AdminTenantsService } from './admin-tenants.service';

const actor: RequestUser = {
  id: 'system-admin',
  email: 'admin@example.com',
  systemRole: SystemRole.SYSTEM_ADMIN,
};

function setup() {
  const tenants = new InMemoryRepository<Tenant>(() => ({
    rejectionReason: null,
    suspensionReason: null,
    reviewedBy: null,
    reviewedAt: null,
    deletedAt: null,
    aiEnabled: false,
    aiMonthlyQuota: null,
  }));
  const memberships = new InMemoryRepository<Membership>(() => ({
    deletedAt: null,
  }));
  const membershipRoles = new InMemoryRepository<MembershipRole>(undefined, [
    'membershipId',
    'role',
  ]);
  const plans = new InMemoryRepository<ServicePlan>();
  const aiRuns = new InMemoryRepository<AiFormatRun>(() => ({
    status: AiFormatRunStatus.SUCCEEDED,
    counted: true,
  }));
  const service = new AdminTenantsService(
    tenants.asRepository(),
    memberships.asRepository(),
    plans.asRepository(),
    aiRuns.asRepository(),
  );

  let counter = 0;
  const addTenant = (status: TenantStatus) => {
    counter += 1;
    return tenants.save(
      tenants.create({
        slug: `trung-tam-${counter}`,
        name: `Trung tâm ${counter}`,
        status,
        planId: 'plan-basic',
        ownerUserId: 'owner',
      }),
    );
  };
  const row = (id: string) => tenants.rows.find((item) => item.id === id);

  return {
    service,
    tenants,
    memberships,
    membershipRoles,
    plans,
    aiRuns,
    addTenant,
    row,
  };
}

describe('AdminTenantsService', () => {
  it('duyệt / từ chối chỉ từ pending và ghi người xử lý', async () => {
    const { service, addTenant, row } = setup();
    const pending = await addTenant(TenantStatus.PENDING);

    await service.approve(actor, pending.id);
    expect(row(pending.id)).toMatchObject({
      status: TenantStatus.ACTIVE,
      reviewedBy: actor.id,
    });
    expect(row(pending.id)?.reviewedAt).toBeInstanceOf(Date);

    await expect(service.approve(actor, pending.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(
      service.reject(actor, pending.id, 'Muộn'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('từ chối lưu lý do; tạm khoá chỉ từ active; mở khoá xoá lý do tạm khoá', async () => {
    const { service, addTenant, row } = setup();
    const pending = await addTenant(TenantStatus.PENDING);
    const active = await addTenant(TenantStatus.ACTIVE);

    await service.reject(actor, pending.id, 'Thiếu thông tin liên hệ');
    expect(row(pending.id)).toMatchObject({
      status: TenantStatus.REJECTED,
      rejectionReason: 'Thiếu thông tin liên hệ',
    });
    await expect(
      service.suspend(actor, pending.id, 'Vi phạm'),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(service.approve(actor, pending.id)).rejects.toBeInstanceOf(
      ConflictException,
    );

    await service.suspend(actor, active.id, 'Vi phạm điều khoản');
    expect(row(active.id)).toMatchObject({
      status: TenantStatus.SUSPENDED,
      suspensionReason: 'Vi phạm điều khoản',
    });
    await service.unsuspend(actor, active.id);
    expect(row(active.id)).toMatchObject({
      status: TenantStatus.ACTIVE,
      suspensionReason: null,
    });
    await expect(service.unsuspend(actor, active.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('tenant không tồn tại → 404', async () => {
    const { service } = setup();
    await expect(service.approve(actor, 'khong-co')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('duyệt xong thì Tenant Owner qua được TenantGuard', async () => {
    const { service, tenants, memberships, membershipRoles, addTenant } =
      setup();
    const tenant = await addTenant(TenantStatus.PENDING);
    const membership = await memberships.save(
      memberships.create({
        tenantId: tenant.id,
        userId: 'owner',
        status: MembershipStatus.ACTIVE,
      }),
    );
    await membershipRoles.insert({
      membershipId: membership.id,
      tenantId: tenant.id,
      role: TenantRole.TENANT_OWNER,
    });
    const identity = {
      contexts: jest
        .fn()
        .mockResolvedValueOnce({
          systemRole: SystemRole.REGISTERED_USER,
          tenants: [],
        })
        .mockResolvedValueOnce({
          systemRole: SystemRole.REGISTERED_USER,
          tenants: [
            {
              membershipId: membership.id,
              roles: [TenantRole.TENANT_OWNER],
              joinedAt: new Date().toISOString(),
              tenant: {
                id: tenant.id,
                slug: tenant.slug,
                name: tenant.name,
                logoUrl: null,
                status: TenantStatus.ACTIVE,
                rejectionReason: null,
              },
            },
          ],
        }),
    };
    const guard = new TenantGuard(new Reflector(), identity as never);
    const context = {
      switchToHttp: () => ({
        getRequest: () =>
          ({
            params: { slug: tenant.slug },
            accessToken: 'access-token',
            user: {
              id: 'owner',
              email: 'owner@example.com',
              systemRole: SystemRole.REGISTERED_USER,
            },
          }) as unknown as TenantRequest,
      }),
      getHandler: () => () => undefined,
      getClass: () => Object,
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await service.approve(actor, tenant.id);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('đổi gói chỉ chọn gói đang áp dụng, có hiệu lực ngay dù vượt giới hạn', async () => {
    const { service, plans, addTenant, row } = setup();
    const tenant = await addTenant(TenantStatus.ACTIVE);
    const retired = await plans.save(
      plans.create({ code: 'cu', name: 'Cũ', maxMembers: 50, isActive: false }),
    );
    const tiny = await plans.save(
      plans.create({ code: 'nho', name: 'Nhỏ', maxMembers: 1, isActive: true }),
    );

    await expect(
      service.changePlan(tenant.id, retired.id),
    ).rejects.toBeInstanceOf(BadRequestException);
    await service.changePlan(tenant.id, tiny.id);
    expect(row(tenant.id)?.planId).toBe(tiny.id);
  });

  it('bật/tắt AI và đổi hạn mức; tắt vẫn giữ hạn mức; tenant đã xoá → 404', async () => {
    const { service, addTenant, row } = setup();
    const tenant = await addTenant(TenantStatus.ACTIVE);
    expect(row(tenant.id)).toMatchObject({
      aiEnabled: false,
      aiMonthlyQuota: null,
    });

    await service.updateAi(tenant.id, true, 100);
    expect(row(tenant.id)).toMatchObject({
      aiEnabled: true,
      aiMonthlyQuota: 100,
    });
    await service.updateAi(tenant.id, false, 100);
    expect(row(tenant.id)).toMatchObject({
      aiEnabled: false,
      aiMonthlyQuota: 100,
    });
    await service.updateAi(tenant.id, true, null);
    expect(row(tenant.id)?.aiMonthlyQuota).toBeNull();

    await expect(
      service.updateAi('khong-co', true, null),
    ).rejects.toBeInstanceOf(NotFoundException);
    const deleted = row(tenant.id);
    if (deleted) deleted.deletedAt = new Date();
    await expect(
      service.updateAi(tenant.id, true, 1000),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('countAiUsage', () => {
  it('đếm lượt counted hoặc đang chạy trong tháng hiện tại theo giờ Việt Nam', async () => {
    const { aiRuns } = setup();
    const repo = aiRuns.asRepository();
    // 01/10 00:30 giờ Việt Nam = 30/09 17:30 UTC.
    const now = new Date('2026-10-15T03:00:00Z');
    const add = (startedAt: string, data: Partial<AiFormatRun> = {}) =>
      aiRuns.save(
        aiRuns.create({
          tenantId: 't1',
          startedAt: new Date(startedAt),
          ...data,
        }),
      );
    await add('2026-09-30T17:30:00Z');
    await add('2026-10-10T00:00:00Z', { status: AiFormatRunStatus.PARTIAL });
    await add('2026-10-15T02:59:00Z', {
      status: AiFormatRunStatus.RUNNING,
      counted: false,
    });
    // Không tính: tháng trước (30/09 23:59 giờ VN), lượt lỗi/huỷ, tenant khác.
    await add('2026-09-30T16:59:00Z');
    await add('2026-10-02T00:00:00Z', {
      status: AiFormatRunStatus.CANCELLED,
      counted: false,
    });
    await add('2026-10-03T00:00:00Z', {
      status: AiFormatRunStatus.FAILED,
      counted: false,
    });
    await add('2026-10-04T00:00:00Z', { tenantId: 't2' });

    await expect(countAiUsage(repo, 't1', now)).resolves.toBe(3);
    await expect(countAiUsage(repo, 't2', now)).resolves.toBe(1);
  });
});
