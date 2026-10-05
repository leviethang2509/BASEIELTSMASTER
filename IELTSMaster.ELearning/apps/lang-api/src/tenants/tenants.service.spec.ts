import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus, TenantRole, TenantStatus } from '@lang/shared';
import { MembershipRole } from '../memberships/membership-role.entity';
import { Membership } from '../memberships/membership.entity';
import type { ServicePlan } from '../plans/service-plan.entity';
import { fakeDate } from '../testing/fake-clock';
import { InMemoryDataSource } from '../testing/in-memory-data-source';
import { InMemoryRepository } from '../testing/in-memory-repository';
import type { User } from '../users/user.entity';
import type { TenantFormDto } from './dto/tenant.dto';
import { Tenant } from './tenant.entity';
import { TenantsService } from './tenants.service';

const TENANT_NAME = 'Trung tâm Ngoại ngữ Á Châu';
const TENANT_SLUG = 'trung-tam-ngoai-ngu-a-chau';

function setup() {
  const users = new InMemoryRepository<User>();
  const plans = new InMemoryRepository<ServicePlan>();
  const tenants = new InMemoryRepository<Tenant>(() => ({
    createdAt: new Date(),
    deletedAt: null,
  }));
  const memberships = new InMemoryRepository<Membership>();
  const membershipRoles = new InMemoryRepository<MembershipRole>(undefined, [
    'membershipId',
    'role',
  ]);
  const dataSource = new InMemoryDataSource()
    .register(Tenant, tenants)
    .register(Membership, memberships)
    .register(MembershipRole, membershipRoles);
  const service = new TenantsService(
    dataSource.asDataSource(),
    tenants.asRepository(),
    plans.asRepository(),
    users.asRepository(),
  );
  return { service, users, plans, tenants, memberships, membershipRoles };
}

type Setup = ReturnType<typeof setup>;

async function seed(
  { users, plans }: Setup,
  {
    dateOfBirth = '1990-05-01',
    timezone = 'Asia/Ho_Chi_Minh',
    isActive = true,
  } = {},
) {
  const user = await users.save(
    users.create({
      email: 'chu@example.com',
      fullName: 'Chủ Trung Tâm',
      dateOfBirth,
      timezone,
    }),
  );
  const plan = await plans.save(
    plans.create({
      code: 'basic',
      name: 'Basic',
      maxMembers: 100,
      price: null,
      description: null,
      isActive,
      sortOrder: 1,
    }),
  );
  return { user, plan };
}

const form = (
  planId: string,
  overrides: Partial<TenantFormDto> = {},
): TenantFormDto => ({ name: TENANT_NAME, planId, ...overrides });

describe('TenantsService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('register', () => {
    it('tạo tenant pending, membership Owner và slug gợi ý từ tên', async () => {
      const ctx = setup();
      const { user, plan } = await seed(ctx);

      const tenant = await ctx.service.register(user.id, form(plan.id));

      expect(tenant).toMatchObject({
        name: TENANT_NAME,
        slug: TENANT_SLUG,
        status: TenantStatus.PENDING,
        rejectionReason: null,
        plan: { id: plan.id, maxMembers: 100 },
      });
      expect(ctx.tenants.rows).toHaveLength(1);
      expect(ctx.tenants.rows[0].ownerUserId).toBe(user.id);
      expect(ctx.memberships.rows).toEqual([
        expect.objectContaining({
          tenantId: tenant.id,
          userId: user.id,
          status: MembershipStatus.ACTIVE,
          createdBy: user.id,
        }),
      ]);
      expect(ctx.membershipRoles.rows).toEqual([
        {
          membershipId: ctx.memberships.rows[0].id,
          tenantId: tenant.id,
          role: TenantRole.TENANT_OWNER,
        },
      ]);
    });

    it('người chưa đủ 18 tuổi không tạo được tenant', async () => {
      fakeDate('2026-09-15T08:00:00Z');
      const ctx = setup();
      const { user, plan } = await seed(ctx, { dateOfBirth: '2008-09-16' });

      await expect(
        ctx.service.register(user.id, form(plan.id)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(ctx.tenants.rows).toHaveLength(0);
      expect(ctx.memberships.rows).toHaveLength(0);
    });

    it('tuổi tính theo timezone của người đăng ký', async () => {
      // 18:00 UTC ngày 14/09 = 01:00 ngày 15/09 giờ Việt Nam.
      fakeDate('2026-09-14T18:00:00Z');
      const inVietnam = setup();
      const vn = await seed(inVietnam, { dateOfBirth: '2008-09-15' });
      await expect(
        inVietnam.service.register(vn.user.id, form(vn.plan.id)),
      ).resolves.toMatchObject({ status: TenantStatus.PENDING });

      const inUtc = setup();
      const utc = await seed(inUtc, {
        dateOfBirth: '2008-09-15',
        timezone: 'UTC',
      });
      await expect(
        inUtc.service.register(utc.user.id, form(utc.plan.id)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('slug tự gợi ý thêm hậu tố khi trùng; slug gửi lên đã có người dùng → 409', async () => {
      const ctx = setup();
      const { user, plan } = await seed(ctx);
      await ctx.service.register(user.id, form(plan.id));

      const second = await ctx.service.register(user.id, form(plan.id));
      expect(second.slug).toBe(`${TENANT_SLUG}-2`);

      await expect(
        ctx.service.register(user.id, form(plan.id, { slug: TENANT_SLUG })),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('gói ngừng áp dụng → 400', async () => {
      const ctx = setup();
      const { user, plan } = await seed(ctx, { isActive: false });

      await expect(
        ctx.service.register(user.id, form(plan.id)),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('suggestSlug', () => {
    it.each([
      ['日本語センター', 'trung-tam'],
      ['AB', 'trung-tam-ab'],
      ['Admin', 'admin-2'],
    ])('%s → %s', async (name, slug) => {
      const { service } = setup();
      await expect(service.suggestSlug(name)).resolves.toBe(slug);
    });
  });

  describe('resubmit', () => {
    async function registerRejected(ctx: Setup) {
      const { user, plan } = await seed(ctx);
      const tenant = await ctx.service.register(user.id, form(plan.id));
      await ctx.tenants.update(tenant.id, {
        status: TenantStatus.REJECTED,
        rejectionReason: 'Thiếu địa chỉ',
      });
      return { user, plan, tenant };
    }

    it('sửa tenant bị từ chối và đưa về pending, giữ slug khi không gửi', async () => {
      const ctx = setup();
      const { user, plan, tenant } = await registerRejected(ctx);

      const updated = await ctx.service.resubmit(
        user.id,
        tenant.id,
        form(plan.id, { name: 'Á Châu', address: '12 Lê Lợi' }),
      );

      expect(updated).toMatchObject({
        name: 'Á Châu',
        slug: TENANT_SLUG,
        address: '12 Lê Lợi',
        status: TenantStatus.PENDING,
        rejectionReason: null,
      });
      expect(ctx.tenants.rows[0]).toMatchObject({
        status: TenantStatus.PENDING,
        rejectionReason: null,
      });
    });

    it('chỉ chủ tenant sửa được, và chỉ khi đang bị từ chối', async () => {
      const ctx = setup();
      const { plan, tenant } = await registerRejected(ctx);
      await expect(
        ctx.service.resubmit('nguoi-khac', tenant.id, form(plan.id)),
      ).rejects.toBeInstanceOf(NotFoundException);

      await ctx.tenants.update(tenant.id, { status: TenantStatus.PENDING });
      await expect(
        ctx.service.resubmit(
          ctx.tenants.rows[0].ownerUserId,
          tenant.id,
          form(plan.id),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
