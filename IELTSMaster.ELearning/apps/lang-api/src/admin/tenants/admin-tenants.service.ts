import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  MembershipStatus,
  TenantStatus,
  type AdminTenant,
  type AdminTenantDetail,
  type AiMonthlyQuota,
} from '@lang/shared';
import { IsNull, type Repository } from 'typeorm';
import { AiFormatRun } from '../../ai-format/ai-format-run.entity';
import { countAiUsage } from '../../ai-format/ai-usage';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { toSkipTake, type Paginated } from '../../common/pagination';
import { escapeLike } from '../../common/sql';
import { Membership } from '../../memberships/membership.entity';
import { ServicePlan } from '../../plans/service-plan.entity';
import { Tenant } from '../../tenants/tenant.entity';
import { toAdminTenant, toAdminTenantDetail } from './admin-tenant.mapper';
import type { ListAdminTenantsQueryDto } from './dto/admin-tenant.dto';

const TENANT_NOT_FOUND = 'Không tìm thấy trung tâm';

type StatusChanges = Partial<
  Pick<
    Tenant,
    | 'status'
    | 'rejectionReason'
    | 'suspensionReason'
    | 'reviewedBy'
    | 'reviewedAt'
  >
>;

/**
 * Tenant trong `/admin`: chỉ xem thông tin cơ bản, duyệt / từ chối / khoá /
 * mở khoá, đổi gói và bật AI. Không vào nội dung tenant.
 */
@Injectable()
export class AdminTenantsService {
  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
    @InjectRepository(ServicePlan)
    private readonly plans: Repository<ServicePlan>,
    @InjectRepository(AiFormatRun)
    private readonly aiRuns: Repository<AiFormatRun>,
  ) {}

  async list(query: ListAdminTenantsQueryDto): Promise<Paginated<AdminTenant>> {
    const { skip, take } = toSkipTake(query);
    const qb = this.withRelations()
      .orderBy('t.createdAt', 'DESC')
      .addOrderBy('t.id', 'ASC')
      .offset(skip)
      .limit(take);
    if (query.status) {
      qb.andWhere('t.status = :status', { status: query.status });
    }
    if (query.q) {
      qb.andWhere(
        '(t.name ILIKE :q OR t.slug ILIKE :q OR o.fullName ILIKE :q OR o.email ILIKE :q)',
        { q: `%${escapeLike(query.q)}%` },
      );
    }
    const [rows, total] = await qb.getManyAndCount();
    const counts = await this.activeMemberCounts(rows.map((row) => row.id));
    return {
      items: rows.map((row) => toAdminTenant(row, counts.get(row.id) ?? 0)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(id: string): Promise<AdminTenantDetail> {
    const tenant = await this.withRelations()
      .andWhere('t.id = :id', { id })
      .getOne();
    if (!tenant) throw new NotFoundException(TENANT_NOT_FOUND);
    const counts = await this.activeMemberCounts([tenant.id]);
    const aiUsed = await countAiUsage(this.aiRuns, tenant.id);
    return toAdminTenantDetail(tenant, counts.get(tenant.id) ?? 0, aiUsed);
  }

  approve(actor: RequestUser, id: string): Promise<void> {
    return this.transition(
      id,
      TenantStatus.PENDING,
      {
        status: TenantStatus.ACTIVE,
        rejectionReason: null,
        ...reviewed(actor),
      },
      'Chỉ duyệt được trung tâm đang chờ duyệt',
    );
  }

  reject(actor: RequestUser, id: string, reason: string): Promise<void> {
    return this.transition(
      id,
      TenantStatus.PENDING,
      {
        status: TenantStatus.REJECTED,
        rejectionReason: reason,
        ...reviewed(actor),
      },
      'Chỉ từ chối được trung tâm đang chờ duyệt',
    );
  }

  suspend(actor: RequestUser, id: string, reason: string): Promise<void> {
    return this.transition(
      id,
      TenantStatus.ACTIVE,
      {
        status: TenantStatus.SUSPENDED,
        suspensionReason: reason,
        ...reviewed(actor),
      },
      'Chỉ tạm khoá được trung tâm đang hoạt động',
    );
  }

  unsuspend(actor: RequestUser, id: string): Promise<void> {
    return this.transition(
      id,
      TenantStatus.SUSPENDED,
      {
        status: TenantStatus.ACTIVE,
        suspensionReason: null,
        ...reviewed(actor),
      },
      'Trung tâm không ở trạng thái tạm khoá',
    );
  }

  /**
   * Đổi gói có hiệu lực ngay, kể cả khi số thành viên active vượt giới hạn gói
   * mới: tenant chỉ bị chặn thêm thành viên, không ai bị deactivate.
   */
  async changePlan(id: string, planId: string): Promise<void> {
    const tenant = await this.tenants.findOneBy({ id });
    if (!tenant) throw new NotFoundException(TENANT_NOT_FOUND);
    const plan = await this.plans.findOneBy({ id: planId, isActive: true });
    if (!plan) {
      throw new BadRequestException(
        'Gói dịch vụ không tồn tại hoặc đã ngừng áp dụng',
      );
    }
    if (tenant.planId !== plan.id) {
      await this.tenants.update(id, { planId: plan.id });
    }
  }

  /**
   * Bật/tắt AI và đặt hạn mức (req-5 plan 1.15). Tắt vẫn giữ hạn mức để bật
   * lại không phải chọn lại; hạ hạn mức dưới số đã dùng chỉ chặn lượt mới.
   */
  async updateAi(
    id: string,
    enabled: boolean,
    monthlyQuota: AiMonthlyQuota | null,
  ): Promise<void> {
    const { affected } = await this.tenants.update(
      { id, deletedAt: IsNull() },
      {
        aiEnabled: enabled,
        aiMonthlyQuota: monthlyQuota,
      },
    );
    if (!affected) throw new NotFoundException(TENANT_NOT_FOUND);
  }

  private withRelations() {
    return this.tenants
      .createQueryBuilder('t')
      .innerJoinAndSelect('t.plan', 'p')
      .innerJoinAndSelect('t.owner', 'o')
      .leftJoinAndSelect('t.reviewer', 'r');
  }

  private async activeMemberCounts(
    ids: string[],
  ): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();
    const rows = await this.memberships
      .createQueryBuilder('m')
      .select('m.tenantId', 'tenantId')
      .addSelect('COUNT(*)', 'count')
      .where('m.tenantId IN (:...ids)', { ids })
      .andWhere('m.status = :status', { status: MembershipStatus.ACTIVE })
      .groupBy('m.tenantId')
      .getRawMany<{ tenantId: string; count: string }>();
    return new Map(rows.map((row) => [row.tenantId, Number(row.count)]));
  }

  /** Chuyển trạng thái có điều kiện, để hai admin xử lý cùng lúc không ghi đè nhau. */
  private async transition(
    id: string,
    from: TenantStatus,
    changes: StatusChanges,
    wrongStatusMessage: string,
  ): Promise<void> {
    const tenant = await this.tenants.findOneBy({ id });
    if (!tenant) throw new NotFoundException(TENANT_NOT_FOUND);
    if (tenant.status !== from) {
      throw new ConflictException(wrongStatusMessage);
    }
    const { affected } = await this.tenants.update(
      { id, status: from },
      changes,
    );
    if (!affected) {
      throw new ConflictException(
        'Trạng thái trung tâm vừa thay đổi, vui lòng tải lại trang',
      );
    }
  }
}

function reviewed(actor: RequestUser) {
  return { reviewedBy: actor.id, reviewedAt: new Date() };
}
