import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ADULT_AGE,
  isAdultOn,
  MembershipStatus,
  slugifyTenantName,
  TENANT_SLUG_MAX_LENGTH,
  TENANT_SLUG_MIN_LENGTH,
  TenantRole,
  TenantStatus,
  todayInTimeZone,
  validateTenantSlug,
  type OwnedTenant,
  type PublicTenant,
  type TenantMembershipInfo,
} from '@lang/shared';
import { DataSource, Like, type Repository } from 'typeorm';
import { isUniqueViolation } from '../common/database-errors';
import { MembershipRole } from '../memberships/membership-role.entity';
import { sortRoles } from '../memberships/membership.mapper';
import { Membership } from '../memberships/membership.entity';
import { ServicePlan } from '../plans/service-plan.entity';
import { User } from '../users/user.entity';
import type { TenantFormDto } from './dto/tenant.dto';
import type { TenantContext } from './tenant-context';
import { toOwnedTenant, toPublicTenant } from './tenant.mapper';
import { Tenant } from './tenant.entity';

const TENANT_NOT_FOUND = 'Không tìm thấy trung tâm';
const SLUG_TAKEN = 'Đường dẫn này đã được trung tâm khác sử dụng';
/** Chừa chỗ cho hậu tố `-2`, `-3`… trong giới hạn độ dài slug. */
const SUGGESTION_BASE_LENGTH = TENANT_SLUG_MAX_LENGTH - 8;
/** Tên không sinh được slug đủ dài (vd. toàn chữ Nhật). */
const FALLBACK_SLUG = 'trung-tam';

@Injectable()
export class TenantsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(ServicePlan)
    private readonly plans: Repository<ServicePlan>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  /**
   * Đăng ký tenant ở trạng thái `pending` và tạo membership Tenant Owner cho
   * người đăng ký. Chỉ người đủ 18 tuổi (tính theo timezone của họ) được đăng ký.
   */
  async register(userId: string, dto: TenantFormDto): Promise<OwnedTenant> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    if (!isAdultOn(user.dateOfBirth, todayInTimeZone(user.timezone))) {
      throw new ForbiddenException(
        `Bạn cần đủ ${ADULT_AGE} tuổi để đăng ký trung tâm`,
      );
    }
    const plan = await this.findActivePlan(dto.planId);
    const slug = dto.slug ?? (await this.suggestSlug(dto.name));
    await this.assertSlugAvailable(slug);

    const tenant = await this.withSlugConflict(() =>
      this.dataSource.transaction(async (manager) => {
        const tenants = manager.getRepository(Tenant);
        const created = await tenants.save(
          tenants.create({
            ...formFields(dto),
            slug,
            status: TenantStatus.PENDING,
            rejectionReason: null,
            planId: plan.id,
            ownerUserId: user.id,
            reviewedBy: null,
            reviewedAt: null,
          }),
        );
        const memberships = manager.getRepository(Membership);
        const membership = await memberships.save(
          memberships.create({
            tenantId: created.id,
            userId: user.id,
            status: MembershipStatus.ACTIVE,
            joinedAt: new Date(),
            createdBy: user.id,
          }),
        );
        await manager.getRepository(MembershipRole).insert({
          membershipId: membership.id,
          tenantId: created.id,
          role: TenantRole.TENANT_OWNER,
        });
        return created;
      }),
    );
    return toOwnedTenant(tenant, plan);
  }

  /** Tenant do user đăng ký, mới nhất trước. */
  async listMine(userId: string): Promise<OwnedTenant[]> {
    const tenants = await this.tenants.find({
      where: { ownerUserId: userId },
      relations: { plan: true },
      order: { createdAt: 'DESC' },
    });
    return tenants.map((tenant) =>
      toOwnedTenant(tenant, tenant.plan as ServicePlan),
    );
  }

  /** Sửa tenant bị từ chối và gửi duyệt lại (về `pending`, xoá lý do từ chối). */
  async resubmit(
    userId: string,
    tenantId: string,
    dto: TenantFormDto,
  ): Promise<OwnedTenant> {
    const tenant = await this.tenants.findOneBy({
      id: tenantId,
      ownerUserId: userId,
    });
    if (!tenant) throw new NotFoundException(TENANT_NOT_FOUND);
    if (tenant.status !== TenantStatus.REJECTED) {
      throw new ConflictException(
        'Chỉ sửa và gửi lại được khi trung tâm bị từ chối',
      );
    }
    const plan = await this.findActivePlan(dto.planId);
    const slug = dto.slug ?? tenant.slug;
    if (slug !== tenant.slug) await this.assertSlugAvailable(slug);

    const changes = {
      ...formFields(dto),
      slug,
      planId: plan.id,
      status: TenantStatus.PENDING,
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
    };
    // Điều kiện trạng thái: System Admin có thể vừa xử lý tenant này.
    const { affected } = await this.withSlugConflict(() =>
      this.tenants.update(
        { id: tenant.id, status: TenantStatus.REJECTED },
        changes,
      ),
    );
    if (!affected) {
      throw new ConflictException(
        'Trạng thái trung tâm vừa thay đổi, vui lòng tải lại trang',
      );
    }
    return toOwnedTenant({ ...tenant, ...changes }, plan);
  }

  /** Trang giới thiệu công khai: chỉ tenant đang hoạt động. */
  async getPublic(slug: string): Promise<PublicTenant> {
    const tenant = await this.tenants.findOneBy({
      slug: slug.toLowerCase(),
      status: TenantStatus.ACTIVE,
    });
    if (!tenant) throw new NotFoundException(TENANT_NOT_FOUND);
    return toPublicTenant(tenant);
  }

  /** Trang trung tâm của thành viên (`TenantGuard` đã kiểm tenant active + membership). */
  async getMembershipInfo(ctx: TenantContext): Promise<TenantMembershipInfo> {
    const tenant = await this.tenants.findOneBy({ id: ctx.tenantId });
    if (!tenant) throw new NotFoundException(TENANT_NOT_FOUND);
    return {
      tenant: toPublicTenant(tenant),
      membershipId: ctx.membershipId,
      roles: sortRoles(ctx.roles),
    };
  }

  /**
   * Slug hợp lệ và chưa được dùng, sinh từ tên. Không giữ chỗ: tạo tenant ngay
   * sau đó vẫn có thể bị 409 nếu người khác lấy trước.
   */
  async suggestSlug(name: string): Promise<string> {
    let base = slugifyTenantName(name, SUGGESTION_BASE_LENGTH);
    if (base.length < TENANT_SLUG_MIN_LENGTH) {
      base = base ? `${FALLBACK_SLUG}-${base}` : FALLBACK_SLUG;
    }
    // `base` chỉ gồm a-z, 0-9, '-' nên không chứa ký tự đặc biệt của LIKE.
    const taken = new Set(
      (
        await this.tenants.find({
          select: { slug: true },
          where: { slug: Like(`${base}%`) },
        })
      ).map((tenant) => tenant.slug),
    );
    const isFree = (slug: string) =>
      !taken.has(slug) && validateTenantSlug(slug) === null;
    if (isFree(base)) return base;
    for (let suffix = 2; ; suffix++) {
      const candidate = `${base}-${suffix}`;
      if (isFree(candidate)) return candidate;
    }
  }

  private async findActivePlan(planId: string): Promise<ServicePlan> {
    const plan = await this.plans.findOneBy({ id: planId, isActive: true });
    if (!plan) {
      throw new BadRequestException(
        'Gói dịch vụ không tồn tại hoặc đã ngừng áp dụng',
      );
    }
    return plan;
  }

  private async assertSlugAvailable(slug: string): Promise<void> {
    if (await this.tenants.existsBy({ slug })) {
      throw new ConflictException(SLUG_TAKEN);
    }
  }

  /** Hai request cùng lấy một slug: unique index chặn request sau. */
  private async withSlugConflict<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(SLUG_TAKEN);
      throw error;
    }
  }
}

function formFields(dto: TenantFormDto) {
  return {
    name: dto.name,
    logoUrl: dto.logoUrl ?? null,
    description: dto.description ?? null,
    email: dto.email ?? null,
    phone: dto.phone ?? null,
    address: dto.address ?? null,
  };
}
