import { ConflictException, NotFoundException } from '@nestjs/common';
import { TenantStatus } from '@lang/shared';
import type { ServicePlan } from '../../plans/service-plan.entity';
import type { Tenant } from '../../tenants/tenant.entity';
import { InMemoryRepository } from '../../testing/in-memory-repository';
import { AdminPlansService } from './admin-plans.service';

function setup() {
  const plans = new InMemoryRepository<ServicePlan>();
  const tenants = new InMemoryRepository<Tenant>(() => ({ deletedAt: null }));
  const service = new AdminPlansService(
    plans.asRepository(),
    tenants.asRepository(),
  );
  return { service, plans, tenants };
}

describe('AdminPlansService', () => {
  it('tạo gói: giá lưu 2 chữ số thập phân, mã trùng → 409', async () => {
    const { service } = setup();

    const plan = await service.create({
      code: 'premium',
      name: 'Premium',
      maxMembers: 2000,
      price: 150000.5,
    });
    expect(plan).toMatchObject({
      code: 'premium',
      price: '150000.50',
      isActive: true,
      sortOrder: 0,
      tenantCount: 0,
    });

    await expect(
      service.create({ code: 'premium', name: 'Trùng', maxMembers: 10 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('sửa gói: đổi giá, ngừng áp dụng, đếm tenant đang dùng', async () => {
    const { service, tenants } = setup();
    const plan = await service.create({
      code: 'basic',
      name: 'Basic',
      maxMembers: 100,
    });
    await tenants.save(
      tenants.create({ planId: plan.id, status: TenantStatus.ACTIVE }),
    );

    await expect(
      service.update(plan.id, { price: null, isActive: false, maxMembers: 5 }),
    ).resolves.toMatchObject({
      price: null,
      isActive: false,
      maxMembers: 5,
      tenantCount: 1,
    });
  });

  it('không xoá gói đang có tenant dùng, kể cả tenant đã xoá mềm', async () => {
    const { service, plans, tenants } = setup();
    const used = await service.create({
      code: 'used',
      name: 'Đang dùng',
      maxMembers: 10,
    });
    const unused = await service.create({
      code: 'unused',
      name: 'Chưa dùng',
      maxMembers: 10,
    });
    await tenants.save(
      tenants.create({
        planId: used.id,
        status: TenantStatus.ACTIVE,
        deletedAt: new Date(),
      }),
    );

    await expect(service.remove(used.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await service.remove(unused.id);
    expect(plans.rows.map((plan) => plan.code)).toEqual(['used']);
    await expect(service.remove(unused.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
