import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { AdminServicePlan } from '@lang/shared';
import type { Repository } from 'typeorm';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '../../common/database-errors';
import { toPlanSummary } from '../../plans/plan.mapper';
import { ServicePlan } from '../../plans/service-plan.entity';
import { Tenant } from '../../tenants/tenant.entity';
import type { CreatePlanDto, UpdatePlanDto } from './dto/admin-plan.dto';

const PLAN_NOT_FOUND = 'Không tìm thấy gói dịch vụ';
const CODE_TAKEN = 'Mã gói đã tồn tại';
const PLAN_IN_USE =
  'Gói đang có trung tâm sử dụng, chỉ có thể ngừng áp dụng thay vì xoá';

@Injectable()
export class AdminPlansService {
  constructor(
    @InjectRepository(ServicePlan)
    private readonly plans: Repository<ServicePlan>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
  ) {}

  async list(): Promise<AdminServicePlan[]> {
    const plans = await this.plans.find({
      order: { sortOrder: 'ASC', maxMembers: 'ASC' },
    });
    // Số gói ít nên đếm từng gói cho đơn giản.
    return Promise.all(plans.map((plan) => this.toAdminPlan(plan)));
  }

  async create(dto: CreatePlanDto): Promise<AdminServicePlan> {
    if (await this.plans.existsBy({ code: dto.code })) {
      throw new ConflictException(CODE_TAKEN);
    }
    let plan: ServicePlan;
    try {
      plan = await this.plans.save(
        this.plans.create({
          code: dto.code,
          name: dto.name,
          maxMembers: dto.maxMembers,
          price: toPrice(dto.price),
          description: dto.description ?? null,
          isActive: dto.isActive ?? true,
          sortOrder: dto.sortOrder ?? 0,
        }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(CODE_TAKEN);
      throw error;
    }
    return this.toAdminPlan(plan);
  }

  /** Giảm `maxMembers` dưới số thành viên của tenant được phép (như hạ gói). */
  async update(id: string, dto: UpdatePlanDto): Promise<AdminServicePlan> {
    const plan = await this.findPlan(id);
    const changes: Partial<
      Pick<
        ServicePlan,
        | 'name'
        | 'maxMembers'
        | 'price'
        | 'description'
        | 'isActive'
        | 'sortOrder'
      >
    > = {};
    if (dto.name !== undefined) changes.name = dto.name;
    if (dto.maxMembers !== undefined) changes.maxMembers = dto.maxMembers;
    if (dto.price !== undefined) changes.price = toPrice(dto.price);
    if (dto.description !== undefined) changes.description = dto.description;
    if (dto.isActive !== undefined) changes.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) changes.sortOrder = dto.sortOrder;

    if (Object.keys(changes).length > 0) {
      await this.plans.update(id, changes);
    }
    return this.toAdminPlan({ ...plan, ...changes });
  }

  /** Xoá cứng khi chưa tenant nào dùng, kể cả tenant đã xoá mềm (FK RESTRICT). */
  async remove(id: string): Promise<void> {
    await this.findPlan(id);
    const used = await this.tenants.count({
      where: { planId: id },
      withDeleted: true,
    });
    if (used > 0) throw new ConflictException(PLAN_IN_USE);
    try {
      await this.plans.delete({ id });
    } catch (error) {
      // Tenant vừa chọn gói này ngay sau lúc kiểm tra.
      if (isForeignKeyViolation(error))
        throw new ConflictException(PLAN_IN_USE);
      throw error;
    }
  }

  private async findPlan(id: string): Promise<ServicePlan> {
    const plan = await this.plans.findOneBy({ id });
    if (!plan) throw new NotFoundException(PLAN_NOT_FOUND);
    return plan;
  }

  private async toAdminPlan(plan: ServicePlan): Promise<AdminServicePlan> {
    return {
      ...toPlanSummary(plan),
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      tenantCount: await this.tenants.countBy({ planId: plan.id }),
    };
  }
}

/** Cột `numeric(12,2)` lưu dạng chuỗi. */
function toPrice(price: number | null | undefined): string | null {
  return price === undefined || price === null ? null : price.toFixed(2);
}
