import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  MembershipStatus,
  SystemRole,
  TenantRole,
  TenantStatus,
} from '@lang/shared';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ServicePlan } from '../plans/service-plan.entity';
import type { TenantContext } from '../tenants/tenant-context';
import { Tenant } from '../tenants/tenant.entity';
import { InMemoryDataSource } from '../testing/in-memory-data-source';
import { InMemoryRepository } from '../testing/in-memory-repository';
import { User } from '../users/user.entity';
import { AddMemberByEmailDto } from './dto/membership.dto';
import { MembershipRole } from './membership-role.entity';
import { Membership } from './membership.entity';
import { MembershipsService } from './memberships.service';
import { StudentGuardian } from './student-guardian.entity';

// bcrypt thật chậm; mật khẩu tạm cố định để kiểm tra.
jest.mock('../auth/password', () => ({
  hashPassword: async (plain: string) => `hashed:${plain}`,
  generateTemporaryPassword: () => 'TamThoi23456',
}));

const actor = {
  id: 'actor',
  email: 'actor@example.com',
  systemRole: SystemRole.REGISTERED_USER,
};

function setup(maxMembers = 100) {
  const users = new InMemoryRepository<User>(() => ({
    mustChangePassword: false,
    deletedAt: null,
  }));
  const plans = new InMemoryRepository<ServicePlan>();
  const tenants = new InMemoryRepository<Tenant>();
  const memberships = new InMemoryRepository<Membership>(() => ({
    joinedAt: new Date(),
    lastActiveAt: null,
    deletedAt: null,
  }));
  const membershipRoles = new InMemoryRepository<MembershipRole>(undefined, [
    'membershipId',
    'role',
  ]);
  const guardians = new InMemoryRepository<StudentGuardian>();
  const dataSource = new InMemoryDataSource()
    .register(User, users)
    .register(ServicePlan, plans)
    .register(Tenant, tenants)
    .register(Membership, memberships)
    .register(MembershipRole, membershipRoles)
    .register(StudentGuardian, guardians);
  const service = new MembershipsService(
    dataSource.asDataSource(),
    memberships.asRepository(),
    membershipRoles.asRepository(),
    guardians.asRepository(),
    users.asRepository(),
  );

  void plans.save(
    plans.create({ id: 'plan', code: 'basic', name: 'Basic', maxMembers }),
  );
  void tenants.save(
    tenants.create({
      id: 't1',
      slug: 'a-chau',
      name: 'Á Châu',
      status: TenantStatus.ACTIVE,
      planId: 'plan',
    }),
  );
  void tenants.save(
    tenants.create({
      id: 't2',
      slug: 'khac',
      name: 'Trung tâm khác',
      status: TenantStatus.ACTIVE,
      planId: 'plan',
    }),
  );

  let counter = 0;
  async function addMember(
    roles: TenantRole[],
    {
      tenantId = 't1',
      status = MembershipStatus.ACTIVE,
    }: { tenantId?: string; status?: MembershipStatus } = {},
  ) {
    counter += 1;
    const user = await users.save(
      users.create({
        email: `member${counter}@example.com`,
        fullName: `Thành viên ${counter}`,
        dateOfBirth: '2000-01-01',
      }),
    );
    const membership = await memberships.save(
      memberships.create({ tenantId, userId: user.id, status }),
    );
    await membershipRoles.insert(
      roles.map((role) => ({ membershipId: membership.id, tenantId, role })),
    );
    return { user, membership };
  }

  const ctxOf = (
    membership: Membership,
    roles: TenantRole[],
  ): TenantContext => ({
    tenantId: membership.tenantId,
    slug: 'a-chau',
    name: 'Á Châu',
    status: TenantStatus.ACTIVE,
    membershipId: membership.id,
    roles,
    permissions: [],
  });

  const rolesOf = (membershipId: string) =>
    membershipRoles.rows
      .filter((row) => row.membershipId === membershipId)
      .map((row) => row.role)
      .sort();

  return {
    service,
    users,
    memberships,
    guardians,
    addMember,
    ctxOf,
    rolesOf,
  };
}

async function withOwnerAndAdmin(maxMembers?: number) {
  const ctx = setup(maxMembers);
  const owner = await ctx.addMember([TenantRole.TENANT_OWNER]);
  const admin = await ctx.addMember([TenantRole.TENANT_ADMIN]);
  return {
    ...ctx,
    owner,
    admin,
    ownerCtx: ctx.ctxOf(owner.membership, [TenantRole.TENANT_OWNER]),
    adminCtx: ctx.ctxOf(admin.membership, [TenantRole.TENANT_ADMIN]),
  };
}

describe('MembershipsService', () => {
  describe('bảo vệ Tenant Owner', () => {
    it('Tenant Admin không đổi được role hay trạng thái của Owner', async () => {
      const { service, owner, adminCtx, rolesOf } = await withOwnerAndAdmin();

      await expect(
        service.update(adminCtx, owner.membership.id, {
          roles: [TenantRole.TEACHER],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.update(adminCtx, owner.membership.id, {
          status: MembershipStatus.INACTIVE,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(rolesOf(owner.membership.id)).toEqual([TenantRole.TENANT_OWNER]);
    });

    it('không ai xoá được Owner, kể cả chính Owner', async () => {
      const { service, owner, ownerCtx, adminCtx, memberships } =
        await withOwnerAndAdmin();

      for (const ctx of [adminCtx, ownerCtx]) {
        await expect(
          service.remove(ctx, owner.membership.id),
        ).rejects.toBeInstanceOf(ForbiddenException);
      }
      expect(memberships.rows[0].deletedAt).toBeNull();
    });

    it('Owner thêm role cho mình vẫn giữ TENANT_OWNER, nhưng không tự khoá được', async () => {
      const { service, owner, ownerCtx, rolesOf } = await withOwnerAndAdmin();

      const updated = await service.update(ownerCtx, owner.membership.id, {
        roles: [TenantRole.TEACHER],
      });
      expect(updated.roles).toEqual([
        TenantRole.TENANT_OWNER,
        TenantRole.TEACHER,
      ]);
      expect(rolesOf(owner.membership.id)).toEqual([
        TenantRole.TEACHER,
        TenantRole.TENANT_OWNER,
      ]);

      await expect(
        service.update(ownerCtx, owner.membership.id, {
          status: MembershipStatus.INACTIVE,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('không cấp được TENANT_OWNER qua quản lý thành viên', async () => {
      const { service, ownerCtx, admin, addMember } = await withOwnerAndAdmin();
      await addMember([], { tenantId: 't2' });

      await expect(
        service.addByEmail(ownerCtx, actor, {
          email: 'member3@example.com',
          roles: [TenantRole.TENANT_OWNER],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.update(ownerCtx, admin.membership.id, {
          roles: [TenantRole.TENANT_OWNER],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      const dto = plainToInstance(AddMemberByEmailDto, {
        email: 'a@example.com',
        roles: [TenantRole.TENANT_OWNER],
      });
      expect(await validate(dto)).toHaveLength(1);
    });

    it('Tenant Admin sửa được Tenant Admin khác', async () => {
      const { service, adminCtx, addMember } = await withOwnerAndAdmin();
      const other = await addMember([TenantRole.TENANT_ADMIN]);

      await expect(
        service.update(adminCtx, other.membership.id, {
          roles: [TenantRole.TEACHER],
        }),
      ).resolves.toMatchObject({ roles: [TenantRole.TEACHER] });
    });

    it('thành viên phải còn ít nhất một vai trò', async () => {
      const { service, adminCtx, addMember } = await withOwnerAndAdmin();
      const teacher = await addMember([TenantRole.TEACHER]);

      await expect(
        service.update(adminCtx, teacher.membership.id, { roles: [] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('giới hạn gói', () => {
    it('đủ số membership active thì chặn thêm theo email và tạo account', async () => {
      const { service, ownerCtx, users, addMember } =
        await withOwnerAndAdmin(2);
      const outsider = await addMember([TenantRole.STUDENT], {
        tenantId: 't2',
      });
      const userCount = users.rows.length;

      await expect(
        service.addByEmail(ownerCtx, actor, {
          email: outsider.user.email,
          roles: [TenantRole.STUDENT],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.createAccount(ownerCtx, actor, {
          email: 'moi@example.com',
          fullName: 'Học viên mới',
          dateOfBirth: '2012-03-04',
          roles: [TenantRole.STUDENT],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(users.rows).toHaveLength(userCount);
    });

    it('membership inactive và đã xoá không tính; mở lại khi đầy thì bị chặn', async () => {
      const { service, ownerCtx, admin, addMember } =
        await withOwnerAndAdmin(2);
      await service.update(ownerCtx, admin.membership.id, {
        status: MembershipStatus.INACTIVE,
      });
      const teacher = await addMember([TenantRole.TEACHER], {
        tenantId: 't2',
      });

      const added = await service.addByEmail(ownerCtx, actor, {
        email: teacher.user.email,
        roles: [TenantRole.TEACHER],
      });
      expect(added.status).toBe(MembershipStatus.ACTIVE);

      await expect(
        service.update(ownerCtx, admin.membership.id, {
          status: MembershipStatus.ACTIVE,
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      await service.remove(ownerCtx, added.id);
      await expect(
        service.update(ownerCtx, admin.membership.id, {
          status: MembershipStatus.ACTIVE,
        }),
      ).resolves.toMatchObject({ status: MembershipStatus.ACTIVE });
    });
  });

  describe('gợi ý ngừng kích hoạt khi vượt gói', () => {
    it('chưa vượt giới hạn thì không gợi ý', async () => {
      const { service, ownerCtx } = await withOwnerAndAdmin(2);

      await expect(service.deactivationSuggestions(ownerCtx)).resolves.toEqual({
        planName: 'Basic',
        maxMembers: 2,
        activeMembers: 2,
        excess: 0,
        items: [],
      });
    });

    it('chỉ gợi ý Học viên/Phụ huynh, chưa từng vào trước rồi tới lần vào cũ nhất', async () => {
      const { service, ownerCtx, addMember, memberships } =
        await withOwnerAndAdmin(2);
      const setLastActive = (id: string, iso: string) =>
        memberships.update(id, { lastActiveAt: new Date(iso) });

      await addMember([TenantRole.TEACHER]);
      await addMember([TenantRole.STUDENT, TenantRole.TEACHER]);
      const recentParent = await addMember([TenantRole.PARENT]);
      await setLastActive(recentParent.membership.id, '2026-09-10T00:00:00Z');
      const oldStudent = await addMember([
        TenantRole.STUDENT,
        TenantRole.PARENT,
      ]);
      await setLastActive(oldStudent.membership.id, '2026-01-01T00:00:00Z');
      const neverStudent = await addMember([TenantRole.STUDENT]);
      await addMember([TenantRole.STUDENT], {
        status: MembershipStatus.INACTIVE,
      });

      // 7 active, giới hạn 2 → cần bớt 5 nhưng chỉ 3 người thuộc diện gợi ý.
      const result = await service.deactivationSuggestions(ownerCtx);
      expect(result).toMatchObject({ activeMembers: 7, excess: 5 });
      expect(result.items.map((item) => item.id)).toEqual([
        neverStudent.membership.id,
        oldStudent.membership.id,
        recentParent.membership.id,
      ]);
      expect(result.items[0]).toMatchObject({
        email: neverStudent.user.email,
        lastActiveAt: null,
      });
    });

    it('lấy đúng số cần bớt', async () => {
      const { service, ownerCtx, addMember } = await withOwnerAndAdmin(3);
      await addMember([TenantRole.STUDENT]);
      await addMember([TenantRole.STUDENT]);
      await addMember([TenantRole.PARENT]);

      const result = await service.deactivationSuggestions(ownerCtx);
      expect(result.excess).toBe(2);
      expect(result.items).toHaveLength(2);
    });
  });

  describe('thêm thành viên', () => {
    it('thêm theo email: không có account → 404, đã là thành viên → 409', async () => {
      const { service, ownerCtx, admin, memberships } =
        await withOwnerAndAdmin();

      await expect(
        service.addByEmail(ownerCtx, actor, {
          email: 'khongco@example.com',
          roles: [TenantRole.STUDENT],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.addByEmail(ownerCtx, actor, {
          email: admin.user.email,
          roles: [TenantRole.STUDENT],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(memberships.rows).toHaveLength(2);
    });

    it('tạo account: hệ thống sinh mật khẩu tạm và bắt đổi mật khẩu', async () => {
      const { service, ownerCtx, users, rolesOf } = await withOwnerAndAdmin();

      const result = await service.createAccount(ownerCtx, actor, {
        email: 'hocvien@example.com',
        fullName: 'Học Viên',
        dateOfBirth: '2012-03-04',
        roles: [TenantRole.STUDENT, TenantRole.PARENT],
      });

      expect(result.temporaryPassword).toBe('TamThoi23456');
      expect(result.membership).toMatchObject({
        email: 'hocvien@example.com',
        status: MembershipStatus.ACTIVE,
        roles: [TenantRole.STUDENT, TenantRole.PARENT],
      });
      const user = users.rows.find(
        (row) => row.email === 'hocvien@example.com',
      );
      expect(user).toMatchObject({
        passwordHash: 'hashed:TamThoi23456',
        mustChangePassword: true,
      });
      expect(rolesOf(result.membership.id)).toEqual([
        TenantRole.PARENT,
        TenantRole.STUDENT,
      ]);
    });

    it('tạo account với mật khẩu admin nhập thì không trả lại mật khẩu; email đã có → 409', async () => {
      const { service, ownerCtx, users, admin } = await withOwnerAndAdmin();

      const result = await service.createAccount(ownerCtx, actor, {
        email: 'giaovien@example.com',
        fullName: 'Giáo Viên',
        dateOfBirth: '1995-03-04',
        password: 'matkhautam1',
        roles: [TenantRole.TEACHER],
      });
      expect(result.temporaryPassword).toBeNull();
      expect(
        users.rows.find((row) => row.email === 'giaovien@example.com')
          ?.passwordHash,
      ).toBe('hashed:matkhautam1');

      await expect(
        service.createAccount(ownerCtx, actor, {
          email: admin.user.email,
          fullName: 'Trùng',
          dateOfBirth: '1995-03-04',
          roles: [TenantRole.TEACHER],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('phụ huynh', () => {
    it('gắn phụ huynh cần đúng role và cùng tenant', async () => {
      const { service, ownerCtx, addMember, guardians } =
        await withOwnerAndAdmin();
      const student = await addMember([TenantRole.STUDENT]);
      const teacher = await addMember([TenantRole.TEACHER]);
      const parent = await addMember([TenantRole.PARENT]);
      const otherTenantParent = await addMember([TenantRole.PARENT], {
        tenantId: 't2',
      });

      await expect(
        service.addGuardian(ownerCtx, actor, teacher.membership.id, {
          parentMembershipId: parent.membership.id,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.addGuardian(ownerCtx, actor, student.membership.id, {
          parentMembershipId: teacher.membership.id,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.addGuardian(ownerCtx, actor, student.membership.id, {
          parentMembershipId: otherTenantParent.membership.id,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      const link = await service.addGuardian(
        ownerCtx,
        actor,
        student.membership.id,
        { parentMembershipId: parent.membership.id, relationship: 'Mẹ' },
      );
      expect(link).toMatchObject({
        relationship: 'Mẹ',
        member: {
          membershipId: parent.membership.id,
          fullName: parent.user.fullName,
        },
      });
      await expect(
        service.addGuardian(ownerCtx, actor, student.membership.id, {
          parentMembershipId: parent.membership.id,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(guardians.rows).toHaveLength(1);
    });

    it('bỏ role Học viên hoặc xoá phụ huynh thì gỡ liên kết', async () => {
      const { service, ownerCtx, addMember, guardians } =
        await withOwnerAndAdmin();
      const student = await addMember([TenantRole.STUDENT]);
      const parent = await addMember([TenantRole.PARENT]);
      const link = () =>
        service.addGuardian(ownerCtx, actor, student.membership.id, {
          parentMembershipId: parent.membership.id,
        });

      await link();
      await service.update(ownerCtx, student.membership.id, {
        roles: [TenantRole.TEACHER],
      });
      expect(guardians.rows).toHaveLength(0);

      await service.update(ownerCtx, student.membership.id, {
        roles: [TenantRole.STUDENT],
      });
      await link();
      await service.remove(ownerCtx, parent.membership.id);
      expect(guardians.rows).toHaveLength(0);
    });
  });
});
