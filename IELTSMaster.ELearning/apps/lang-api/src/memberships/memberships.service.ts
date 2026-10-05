import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DEACTIVATION_SUGGESTION_ROLES,
  MembershipStatus,
  TenantRole,
  resolvePermissions,
  type CreateMemberAccountResult,
  type DeactivationSuggestions,
  type GuardianLink,
  type MeContexts,
  type MemberQuota,
  type MembershipDetail,
  type MembershipListItem,
} from '@lang/shared';
import {
  DataSource,
  In,
  IsNull,
  type EntityManager,
  type Repository,
} from 'typeorm';
import { generateTemporaryPassword, hashPassword } from '../auth/password';
import type { RequestUser } from '../common/decorators/current-user.decorator';
import { isUniqueViolation } from '../common/database-errors';
import { toSkipTake, type Paginated } from '../common/pagination';
import { escapeLike } from '../common/sql';
import { ServicePlan } from '../plans/service-plan.entity';
import type { TenantContext } from '../tenants/tenant-context';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
import type {
  AddGuardianDto,
  AddMemberByEmailDto,
  CreateMemberAccountDto,
  ListMembershipsQueryDto,
  UpdateMembershipDto,
} from './dto/membership.dto';
import { MembershipRole } from './membership-role.entity';
import { sortRoles, toMembershipListItem } from './membership.mapper';
import { Membership } from './membership.entity';
import { StudentGuardian } from './student-guardian.entity';

const MEMBER_NOT_FOUND = 'Không tìm thấy thành viên';
const ALREADY_MEMBER = 'Tài khoản này đã là thành viên của trung tâm';
const EMAIL_HAS_ACCOUNT =
  'Email này đã có tài khoản, hãy dùng chức năng thêm theo email';
const GUARDIAN_EXISTS = 'Phụ huynh này đã được gắn với học viên';

/**
 * Quản lý thành viên tenant (Tenant Owner/Admin, quyền kiểm ở `TenantGuard`).
 * Quy tắc bảo vệ Owner: không ai xoá hay khoá được Owner, Tenant Admin không
 * sửa được membership của Owner, không cấp `TENANT_OWNER` qua API này.
 */
@Injectable()
export class MembershipsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
    @InjectRepository(MembershipRole)
    private readonly membershipRoles: Repository<MembershipRole>,
    @InjectRepository(StudentGuardian)
    private readonly guardians: Repository<StudentGuardian>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async list(
    ctx: TenantContext,
    query: ListMembershipsQueryDto,
  ): Promise<Paginated<MembershipListItem>> {
    const { skip, take } = toSkipTake(query);
    const qb = this.memberships
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.user', 'u')
      .where('m.tenantId = :tenantId', { tenantId: ctx.tenantId })
      .orderBy('u.fullName', 'ASC')
      .addOrderBy('m.id', 'ASC')
      .offset(skip)
      .limit(take);
    if (query.role) {
      qb.andWhere(
        (sub) =>
          `EXISTS ${sub
            .subQuery()
            .select('1')
            .from(MembershipRole, 'r')
            .where('r.membershipId = m.id')
            .andWhere('r.role = :role')
            .getQuery()}`,
        { role: query.role },
      );
    }
    if (query.status) {
      qb.andWhere('m.status = :status', { status: query.status });
    }
    if (query.q) {
      qb.andWhere('(u.fullName ILIKE :q OR u.email ILIKE :q)', {
        q: `%${escapeLike(query.q)}%`,
      });
    }

    const [rows, total] = await qb.getManyAndCount();
    const roles = await this.rolesByMembership(
      this.membershipRoles,
      rows.map((row) => row.id),
    );
    return {
      items: rows.map((row) =>
        toMembershipListItem(row, row.user as User, roles.get(row.id) ?? []),
      ),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** Số thành viên active so với giới hạn gói hiện tại. */
  getQuota(ctx: TenantContext): Promise<MemberQuota> {
    return loadQuota(this.dataSource.manager, ctx.tenantId);
  }

  /**
   * Khi vượt giới hạn gói (sau hạ gói): gợi ý tối đa `excess` membership chỉ có
   * role Học viên/Phụ huynh, chưa từng vào tenant trước rồi tới lần vào cũ
   * nhất. Chỉ gợi ý, Owner/Admin tự ngừng kích hoạt.
   */
  async deactivationSuggestions(
    ctx: TenantContext,
  ): Promise<DeactivationSuggestions> {
    const quota = await this.getQuota(ctx);
    if (quota.excess === 0) return { ...quota, items: [] };

    const [active, roleRows] = await Promise.all([
      this.memberships.findBy({
        tenantId: ctx.tenantId,
        status: MembershipStatus.ACTIVE,
        deletedAt: IsNull(),
      }),
      this.membershipRoles.findBy({ tenantId: ctx.tenantId }),
    ]);
    const roles = new Map<string, TenantRole[]>();
    for (const row of roleRows) {
      roles.set(row.membershipId, [
        ...(roles.get(row.membershipId) ?? []),
        row.role,
      ]);
    }
    const picked = active
      .filter((membership) => {
        const own = roles.get(membership.id) ?? [];
        return (
          own.length > 0 &&
          own.every((role) => DEACTIVATION_SUGGESTION_ROLES.includes(role))
        );
      })
      .sort(byLastActive)
      .slice(0, quota.excess);
    if (picked.length === 0) return { ...quota, items: [] };

    const users = new Map(
      (
        await this.users.find({
          where: { id: In(picked.map((membership) => membership.userId)) },
          withDeleted: true,
        })
      ).map((user) => [user.id, user]),
    );
    return {
      ...quota,
      items: picked.flatMap((membership) => {
        const user = users.get(membership.userId);
        return user
          ? [
              toMembershipListItem(
                membership,
                user,
                roles.get(membership.id) ?? [],
              ),
            ]
          : [];
      }),
    };
  }

  async getDetail(ctx: TenantContext, id: string): Promise<MembershipDetail> {
    const membership = await findMember(this.memberships, ctx.tenantId, id);
    const [user, roles, asStudent, asParent] = await Promise.all([
      this.findUser(this.users, membership.userId),
      this.membershipRoles.findBy({ membershipId: id }),
      this.guardians.findBy({
        tenantId: ctx.tenantId,
        studentMembershipId: id,
      }),
      this.guardians.findBy({ tenantId: ctx.tenantId, parentMembershipId: id }),
    ]);
    const others = await this.memberSummaries([
      ...asStudent.map((link) => link.parentMembershipId),
      ...asParent.map((link) => link.studentMembershipId),
    ]);
    const toLink = (link: StudentGuardian, otherId: string): GuardianLink => ({
      id: link.id,
      relationship: link.relationship,
      member: others.get(otherId) ?? {
        membershipId: otherId,
        fullName: '',
        email: '',
      },
    });
    return {
      ...toMembershipListItem(
        membership,
        user,
        roles.map((row) => row.role),
      ),
      guardians: asStudent.map((link) => toLink(link, link.parentMembershipId)),
      wards: asParent.map((link) => toLink(link, link.studentMembershipId)),
    };
  }

  async addByEmail(
    ctx: TenantContext,
    actor: RequestUser,
    dto: AddMemberByEmailDto,
  ): Promise<MembershipListItem> {
    assertAssignable(dto.roles);
    const user = await this.users.findOneBy({ email: dto.email });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản với email này');
    }
    return this.onUniqueViolation(ALREADY_MEMBER, () =>
      this.dataSource.transaction(async (manager) => {
        const exists = await manager.getRepository(Membership).existsBy({
          tenantId: ctx.tenantId,
          userId: user.id,
          deletedAt: IsNull(),
        });
        if (exists) throw new ConflictException(ALREADY_MEMBER);
        await assertPlanHasRoom(manager, ctx.tenantId);
        const membership = await createMembership(
          manager,
          ctx.tenantId,
          user.id,
          dto.roles,
          actor.id,
        );
        return toMembershipListItem(membership, user, dto.roles);
      }),
    );
  }

  /** Tạo account (bắt đổi mật khẩu lần đầu) và membership trong cùng transaction. */
  async createAccount(
    ctx: TenantContext,
    actor: RequestUser,
    dto: CreateMemberAccountDto,
  ): Promise<CreateMemberAccountResult> {
    assertAssignable(dto.roles);
    if (await this.users.existsBy({ email: dto.email })) {
      throw new ConflictException(EMAIL_HAS_ACCOUNT);
    }
    const password = dto.password ?? generateTemporaryPassword();
    // Hash trước transaction: bcrypt chậm, không giữ khoá tenant trong lúc hash.
    const passwordHash = await hashPassword(password);

    const membership = await this.onUniqueViolation(EMAIL_HAS_ACCOUNT, () =>
      this.dataSource.transaction(async (manager) => {
        await assertPlanHasRoom(manager, ctx.tenantId);
        const users = manager.getRepository(User);
        const user = await users.save(
          users.create({
            email: dto.email,
            passwordHash,
            fullName: dto.fullName,
            dateOfBirth: dto.dateOfBirth,
            gender: dto.gender ?? null,
            phone: dto.phone ?? null,
            mustChangePassword: true,
          }),
        );
        const created = await createMembership(
          manager,
          ctx.tenantId,
          user.id,
          dto.roles,
          actor.id,
        );
        return toMembershipListItem(created, user, dto.roles);
      }),
    );
    return {
      membership,
      temporaryPassword: dto.password ? null : password,
    };
  }

  async update(
    ctx: TenantContext,
    id: string,
    dto: UpdateMembershipDto,
  ): Promise<MembershipListItem> {
    if (dto.roles) assertAssignable(dto.roles);
    return this.dataSource.transaction(async (manager) => {
      const membership = await findMember(
        manager.getRepository(Membership),
        ctx.tenantId,
        id,
      );
      const rolesRepo = manager.getRepository(MembershipRole);
      const currentRoles = (await rolesRepo.findBy({ membershipId: id })).map(
        (row) => row.role,
      );
      const targetIsOwner = currentRoles.includes(TenantRole.TENANT_OWNER);
      const nextStatus = dto.status ?? membership.status;
      const statusChanged = nextStatus !== membership.status;

      if (targetIsOwner) {
        if (!ctx.roles.includes(TenantRole.TENANT_OWNER)) {
          throw new ForbiddenException(
            'Bạn không thể thay đổi thành viên là chủ sở hữu trung tâm',
          );
        }
        if (statusChanged) {
          throw new ForbiddenException(
            'Không thể đổi trạng thái của chủ sở hữu trung tâm',
          );
        }
      }
      const nextRoles = dto.roles
        ? [...(targetIsOwner ? [TenantRole.TENANT_OWNER] : []), ...dto.roles]
        : currentRoles;
      if (nextRoles.length === 0) {
        throw new BadRequestException('Thành viên phải có ít nhất một vai trò');
      }
      // Kiểm tra hết trước khi ghi.
      if (statusChanged && nextStatus === MembershipStatus.ACTIVE) {
        await assertPlanHasRoom(manager, ctx.tenantId);
      }

      const removed = currentRoles.filter((role) => !nextRoles.includes(role));
      const added = nextRoles.filter((role) => !currentRoles.includes(role));
      if (removed.length) {
        await rolesRepo.delete({ membershipId: id, role: In(removed) });
        await unlinkGuardiansForRemovedRoles(manager, id, removed);
      }
      if (added.length) {
        await rolesRepo.insert(
          added.map((role) => ({
            membershipId: id,
            tenantId: ctx.tenantId,
            role,
          })),
        );
      }
      if (statusChanged) {
        await manager
          .getRepository(Membership)
          .update(id, { status: nextStatus });
      }

      const user = await this.findUser(
        manager.getRepository(User),
        membership.userId,
      );
      return toMembershipListItem(
        { ...membership, status: nextStatus },
        user,
        nextRoles,
      );
    });
  }

  /** Xoá mềm membership và gỡ các liên kết phụ huynh của nó. */
  async remove(ctx: TenantContext, id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const memberships = manager.getRepository(Membership);
      await findMember(memberships, ctx.tenantId, id);
      const isOwner = await manager
        .getRepository(MembershipRole)
        .existsBy({ membershipId: id, role: TenantRole.TENANT_OWNER });
      if (isOwner) {
        throw new ForbiddenException('Không thể xoá chủ sở hữu trung tâm');
      }
      const guardians = manager.getRepository(StudentGuardian);
      await guardians.delete({ studentMembershipId: id });
      await guardians.delete({ parentMembershipId: id });
      await memberships.softDelete(id);
    });
  }

  /** Gắn phụ huynh cho học viên: cùng tenant, đúng role STUDENT / PARENT. */
  async addGuardian(
    ctx: TenantContext,
    actor: RequestUser,
    studentMembershipId: string,
    dto: AddGuardianDto,
  ): Promise<GuardianLink> {
    if (studentMembershipId === dto.parentMembershipId) {
      throw new BadRequestException(
        'Học viên và phụ huynh phải là hai thành viên khác nhau',
      );
    }
    const [student, parent] = await Promise.all([
      findMember(this.memberships, ctx.tenantId, studentMembershipId),
      findMember(this.memberships, ctx.tenantId, dto.parentMembershipId),
    ]);
    const roles = await this.rolesByMembership(this.membershipRoles, [
      student.id,
      parent.id,
    ]);
    if (!roles.get(student.id)?.includes(TenantRole.STUDENT)) {
      throw new BadRequestException('Thành viên này không có vai trò Học viên');
    }
    if (!roles.get(parent.id)?.includes(TenantRole.PARENT)) {
      throw new BadRequestException(
        'Thành viên được chọn không có vai trò Phụ huynh',
      );
    }

    const link = await this.onUniqueViolation(GUARDIAN_EXISTS, async () => {
      const exists = await this.guardians.existsBy({
        studentMembershipId: student.id,
        parentMembershipId: parent.id,
      });
      if (exists) throw new ConflictException(GUARDIAN_EXISTS);
      return this.guardians.save(
        this.guardians.create({
          tenantId: ctx.tenantId,
          studentMembershipId: student.id,
          parentMembershipId: parent.id,
          relationship: dto.relationship ?? null,
          createdBy: actor.id,
        }),
      );
    });
    const parentUser = await this.findUser(this.users, parent.userId);
    return {
      id: link.id,
      relationship: link.relationship,
      member: {
        membershipId: parent.id,
        fullName: parentUser.fullName,
        email: parentUser.email,
      },
    };
  }

  async removeGuardian(
    ctx: TenantContext,
    studentMembershipId: string,
    parentMembershipId: string,
  ): Promise<void> {
    const { affected } = await this.guardians.delete({
      tenantId: ctx.tenantId,
      studentMembershipId,
      parentMembershipId,
    });
    if (!affected) {
      throw new NotFoundException('Không tìm thấy liên kết phụ huynh');
    }
  }

  /** Ngữ cảnh của user: role hệ thống + tenant có membership active (mọi trạng thái tenant). */
  async getContexts(user: RequestUser): Promise<MeContexts> {
    const memberships = await this.memberships
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.tenant', 't')
      .where('m.userId = :userId', { userId: user.id })
      .andWhere('m.status = :status', { status: MembershipStatus.ACTIVE })
      .andWhere('t.deletedAt IS NULL')
      .orderBy('t.name', 'ASC')
      .getMany();
    const roles = await this.rolesByMembership(
      this.membershipRoles,
      memberships.map((membership) => membership.id),
    );
    return {
      systemRole: user.systemRole,
      tenants: memberships.map((membership) => {
        const tenant = membership.tenant as Tenant;
        const membershipRoles = sortRoles(roles.get(membership.id) ?? []);
        return {
          membershipId: membership.id,
          roles: membershipRoles,
          permissions: resolvePermissions(user.systemRole, membershipRoles),
          joinedAt: membership.joinedAt.toISOString(),
          tenant: {
            id: tenant.id,
            slug: tenant.slug,
            name: tenant.name,
            logoUrl: tenant.logoUrl,
            status: tenant.status,
            rejectionReason: tenant.rejectionReason,
          },
        };
      }),
    };
  }

  private async rolesByMembership(
    repository: Repository<MembershipRole>,
    ids: string[],
  ): Promise<Map<string, TenantRole[]>> {
    const result = new Map(ids.map((id) => [id, [] as TenantRole[]]));
    if (ids.length === 0) return result;
    for (const row of await repository.findBy({ membershipId: In(ids) })) {
      result.get(row.membershipId)?.push(row.role);
    }
    return result;
  }

  private async memberSummaries(
    ids: string[],
  ): Promise<Map<string, GuardianLink['member']>> {
    if (ids.length === 0) return new Map();
    const rows = await this.memberships.find({
      where: { id: In(ids) },
      relations: { user: true },
      withDeleted: true,
    });
    return new Map(
      rows.map((row) => [
        row.id,
        {
          membershipId: row.id,
          fullName: row.user?.fullName ?? '',
          email: row.user?.email ?? '',
        },
      ]),
    );
  }

  /** User của membership, kể cả khi account đã bị xoá mềm. */
  private async findUser(
    repository: Repository<User>,
    userId: string,
  ): Promise<User> {
    const user = await repository.findOne({
      where: { id: userId },
      withDeleted: true,
    });
    if (!user) throw new NotFoundException(MEMBER_NOT_FOUND);
    return user;
  }

  private async onUniqueViolation<T>(
    message: string,
    run: () => Promise<T>,
  ): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(message);
      throw error;
    }
  }
}

/** Phòng khi service được gọi ngoài DTO: không cấp Owner qua quản lý thành viên. */
function assertAssignable(roles: readonly TenantRole[]): void {
  if (roles.includes(TenantRole.TENANT_OWNER)) {
    throw new ForbiddenException('Không thể cấp vai trò chủ sở hữu trung tâm');
  }
}

async function findMember(
  repository: Repository<Membership>,
  tenantId: string,
  id: string,
): Promise<Membership> {
  const membership = await repository.findOneBy({
    id,
    tenantId,
    deletedAt: IsNull(),
  });
  if (!membership) throw new NotFoundException(MEMBER_NOT_FOUND);
  return membership;
}

/** `lock`: khoá dòng tenant tới hết transaction. */
async function loadQuota(
  manager: EntityManager,
  tenantId: string,
  lock = false,
): Promise<MemberQuota> {
  const tenant = await manager.getRepository(Tenant).findOne({
    where: { id: tenantId },
    ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
  });
  if (!tenant) throw new NotFoundException('Không tìm thấy trung tâm');
  const plan = await manager
    .getRepository(ServicePlan)
    .findOneBy({ id: tenant.planId });
  if (!plan) throw new NotFoundException('Không tìm thấy gói dịch vụ');
  const activeMembers = await manager.getRepository(Membership).countBy({
    tenantId,
    status: MembershipStatus.ACTIVE,
    deletedAt: IsNull(),
  });
  return {
    planName: plan.name,
    maxMembers: plan.maxMembers,
    activeMembers,
    excess: Math.max(0, activeMembers - plan.maxMembers),
  };
}

/**
 * Chặn khi số membership active đã đạt giới hạn gói. Khoá dòng tenant để các
 * lượt thêm thành viên đồng thời không cùng lọt qua.
 */
async function assertPlanHasRoom(
  manager: EntityManager,
  tenantId: string,
): Promise<void> {
  const quota = await loadQuota(manager, tenantId, true);
  if (quota.activeMembers >= quota.maxMembers) {
    throw new ConflictException(
      `Trung tâm đã đạt giới hạn ${quota.maxMembers} thành viên của gói ${quota.planName}`,
    );
  }
}

/** Chưa từng vào tenant trước, rồi tới lần vào cũ nhất, rồi tham gia sớm nhất. */
function byLastActive(a: Membership, b: Membership): number {
  const last = (membership: Membership) =>
    membership.lastActiveAt?.getTime() ?? -Infinity;
  return (
    last(a) - last(b) ||
    a.joinedAt.getTime() - b.joinedAt.getTime() ||
    a.id.localeCompare(b.id)
  );
}

async function createMembership(
  manager: EntityManager,
  tenantId: string,
  userId: string,
  roles: readonly TenantRole[],
  createdBy: string,
): Promise<Membership> {
  const memberships = manager.getRepository(Membership);
  const membership = await memberships.save(
    memberships.create({
      tenantId,
      userId,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date(),
      createdBy,
    }),
  );
  await manager
    .getRepository(MembershipRole)
    .insert(
      roles.map((role) => ({ membershipId: membership.id, tenantId, role })),
    );
  return membership;
}

/** Bỏ role Học viên/Phụ huynh thì gỡ liên kết phụ huynh tương ứng. */
async function unlinkGuardiansForRemovedRoles(
  manager: EntityManager,
  membershipId: string,
  removed: readonly TenantRole[],
): Promise<void> {
  const guardians = manager.getRepository(StudentGuardian);
  if (removed.includes(TenantRole.STUDENT)) {
    await guardians.delete({ studentMembershipId: membershipId });
  }
  if (removed.includes(TenantRole.PARENT)) {
    await guardians.delete({ parentMembershipId: membershipId });
  }
}
