import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClassLogAction,
  MembershipStatus,
  NotificationType,
  TenantRole,
  isClassroomClosed,
  type ClassroomMemberView,
  type ClassroomMembers,
  type ClassroomRef,
} from '@lang/shared';
import { DataSource, In, IsNull, Not, type EntityManager } from 'typeorm';
import { MembershipRole } from '../memberships/membership-role.entity';
import { Membership } from '../memberships/membership.entity';
import {
  dashboardClassLink,
  learnerClassLink,
} from '../notifications/notification-targets';
import { NotificationsService } from '../notifications/notifications.service';
import type { TenantContext } from '../tenants/tenant-context';
import { User } from '../users/user.entity';
import { writeClassLog } from './class-logs';
import {
  assertClassroomOpen,
  findClassroom,
  loadClassroomAccess,
} from './classroom-access';
import { ClassroomStudent } from './classroom-student.entity';
import { ClassroomTeacher } from './classroom-teacher.entity';
import { Classroom } from './classroom.entity';
import { toClassroomRef } from './classroom.mapper';

const MEMBER_NOT_FOUND = 'Không tìm thấy thành viên, hãy tải lại trang';
const TEACHER_NOT_IN_CLASS = 'Giáo viên không thuộc lớp này';
const STUDENT_NOT_IN_CLASS = 'Học viên không thuộc lớp này';

/** Thành viên kèm user, dùng để hiển thị và ghi nhật ký. */
export interface MemberInfo {
  membership: Membership;
  user: User;
}

/**
 * Giáo viên và học viên của lớp (D6–D9): chỉ Owner/Admin thêm/xoá (controller),
 * chọn từ thành viên có đúng role. Thêm học viên khoá dòng lớp để kiểm sĩ số
 * (D8); xoá học viên là xoá mềm, thêm lại thì khôi phục.
 */
@Injectable()
export class ClassMembersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  async list(
    ctx: TenantContext,
    classroomId: string,
  ): Promise<ClassroomMembers> {
    const manager = this.dataSource.manager;
    const { classroom } = await loadClassroomAccess(manager, ctx, classroomId);
    const [teacherRows, studentRows] = await Promise.all([
      manager.getRepository(ClassroomTeacher).findBy({ classroomId }),
      manager.getRepository(ClassroomStudent).findBy({ classroomId }),
    ]);
    const info = await loadMembers(manager, ctx.tenantId, [
      ...teacherRows.map((row) => row.membershipId),
      ...studentRows.map((row) => row.membershipId),
    ]);
    const otherClasses = await this.otherClassesOf(
      manager,
      classroom,
      studentRows
        .filter((row) => !row.removedAt)
        .map((row) => row.membershipId),
    );
    const byName = (a: { fullName: string }, b: { fullName: string }) =>
      a.fullName.localeCompare(b.fullName, 'vi');

    return {
      teachers: teacherRows
        .flatMap((row) => {
          const member = info.get(row.membershipId);
          return member ? [toMemberView(member, row.createdAt)] : [];
        })
        .sort(byName),
      students: studentRows
        .flatMap((row) => {
          const member = info.get(row.membershipId);
          if (!member) return [];
          return [
            {
              ...toMemberView(member, row.joinedAt),
              removedAt: row.removedAt?.toISOString() ?? null,
              otherClasses: row.removedAt
                ? []
                : (otherClasses.get(row.membershipId) ?? []),
            },
          ];
        })
        .sort(
          (a, b) =>
            Number(a.removedAt !== null) - Number(b.removedAt !== null) ||
            byName(a, b),
        ),
    };
  }

  /** Thêm giáo viên (thành viên đang hoạt động, có role Teacher – D6). */
  async addTeachers(
    ctx: TenantContext,
    actorId: string,
    classroomId: string,
    membershipIds: string[],
  ): Promise<ClassroomMembers> {
    await this.dataSource.transaction(async (manager) => {
      const classroom = await findClassroom(
        manager,
        ctx.tenantId,
        classroomId,
        true,
      );
      assertClassroomOpen(classroom);
      const members = await loadEligible(
        manager,
        ctx.tenantId,
        membershipIds,
        TenantRole.TEACHER,
        'Giáo viên',
      );
      const repository = manager.getRepository(ClassroomTeacher);
      const existing = new Set(
        (await repository.findBy({ classroomId })).map(
          (row) => row.membershipId,
        ),
      );
      const added = members.filter(
        ({ membership }) => !existing.has(membership.id),
      );
      if (added.length === 0) return;
      await repository.insert(
        added.map(({ membership }) =>
          repository.create({
            classroomId,
            membershipId: membership.id,
            addedBy: actorId,
            createdAt: new Date(),
          }),
        ),
      );
      await writeClassLog(
        manager,
        classroomId,
        actorId,
        ClassLogAction.TEACHERS_ADDED,
        { names: added.map(({ user }) => user.fullName) },
      );
      await this.notifications.notify(manager, {
        userIds: added.map(({ membership }) => membership.userId),
        tenantId: ctx.tenantId,
        type: NotificationType.CLASS_TEACHER_ADDED,
        params: { className: classroom.name },
        link: dashboardClassLink(ctx.slug, classroomId),
        exceptUserId: actorId,
      });
    });
    return this.list(ctx, classroomId);
  }

  async removeTeacher(
    ctx: TenantContext,
    actorId: string,
    classroomId: string,
    membershipId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const classroom = await findClassroom(
        manager,
        ctx.tenantId,
        classroomId,
        true,
      );
      assertClassroomOpen(classroom);
      const { affected } = await manager
        .getRepository(ClassroomTeacher)
        .delete({ classroomId, membershipId });
      if (!affected) throw new NotFoundException(TEACHER_NOT_IN_CLASS);
      const info = await loadMembers(manager, ctx.tenantId, [membershipId]);
      await writeClassLog(
        manager,
        classroomId,
        actorId,
        ClassLogAction.TEACHER_REMOVED,
        { names: [info.get(membershipId)?.user.fullName ?? ''] },
      );
    });
  }

  /**
   * Thêm học viên (thành viên đang hoạt động, có role Student – D7). Học viên đã
   * bị xoá khỏi lớp thì khôi phục. Vượt sĩ số tối đa → 409 (D8).
   */
  async addStudents(
    ctx: TenantContext,
    actorId: string,
    classroomId: string,
    membershipIds: string[],
  ): Promise<ClassroomMembers> {
    await this.dataSource.transaction(async (manager) => {
      const classroom = await findClassroom(
        manager,
        ctx.tenantId,
        classroomId,
        true,
      );
      assertClassroomOpen(classroom);
      const members = await loadEligible(
        manager,
        ctx.tenantId,
        membershipIds,
        TenantRole.STUDENT,
        'Học viên',
      );
      const repository = manager.getRepository(ClassroomStudent);
      const rows = new Map(
        (await repository.findBy({ classroomId })).map((row) => [
          row.membershipId,
          row,
        ]),
      );
      const added = members.filter(
        ({ membership }) =>
          !rows.has(membership.id) || rows.get(membership.id)!.removedAt,
      );
      if (added.length === 0) return;

      if (classroom.maxStudents !== null) {
        const current = [...rows.values()].filter(
          (row) => !row.removedAt,
        ).length;
        const room = Math.max(classroom.maxStudents - current, 0);
        if (added.length > room) {
          throw new ConflictException(
            room === 0
              ? `Lớp đã đủ sĩ số (${current}/${classroom.maxStudents})`
              : `Lớp chỉ còn ${room} chỗ (${current}/${classroom.maxStudents}), không thêm được ${added.length} học viên`,
          );
        }
      }

      const now = new Date();
      for (const { membership } of added) {
        const row = rows.get(membership.id);
        if (row) {
          await repository.update(row.id, {
            removedAt: null,
            joinedAt: now,
            addedBy: actorId,
          });
        } else {
          await repository.insert(
            repository.create({
              classroomId,
              membershipId: membership.id,
              joinedAt: now,
              removedAt: null,
              addedBy: actorId,
            }),
          );
        }
      }
      await writeClassLog(
        manager,
        classroomId,
        actorId,
        ClassLogAction.STUDENTS_ADDED,
        { names: added.map(({ user }) => user.fullName) },
      );
      await this.notifications.notify(manager, {
        userIds: added.map(({ membership }) => membership.userId),
        tenantId: ctx.tenantId,
        type: NotificationType.CLASS_STUDENT_ADDED,
        params: { className: classroom.name },
        link: learnerClassLink(ctx.slug, classroomId),
        exceptUserId: actorId,
      });
    });
    return this.list(ctx, classroomId);
  }

  /** Xoá mềm: bài làm và thống kê cũ giữ nguyên (D9.1). */
  async removeStudent(
    ctx: TenantContext,
    actorId: string,
    classroomId: string,
    membershipId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const classroom = await findClassroom(
        manager,
        ctx.tenantId,
        classroomId,
        true,
      );
      assertClassroomOpen(classroom);
      const { affected } = await manager
        .getRepository(ClassroomStudent)
        .update(
          { classroomId, membershipId, removedAt: IsNull() },
          { removedAt: new Date() },
        );
      if (!affected) throw new NotFoundException(STUDENT_NOT_IN_CLASS);
      const info = await loadMembers(manager, ctx.tenantId, [membershipId]);
      await writeClassLog(
        manager,
        classroomId,
        actorId,
        ClassLogAction.STUDENT_REMOVED,
        { names: [info.get(membershipId)?.user.fullName ?? ''] },
      );
    });
  }

  /** Lớp chưa kết thúc/huỷ khác của cùng khoá học mà học viên đang học (D7.3). */
  private async otherClassesOf(
    manager: EntityManager,
    classroom: Classroom,
    membershipIds: string[],
  ): Promise<Map<string, ClassroomRef[]>> {
    const result = new Map<string, ClassroomRef[]>();
    if (membershipIds.length === 0) return result;
    const siblings = (
      await manager.getRepository(Classroom).findBy({
        courseId: classroom.courseId,
        id: Not(classroom.id),
      })
    ).filter((row) => !isClassroomClosed(row.status));
    if (siblings.length === 0) return result;
    const siblingById = new Map(siblings.map((row) => [row.id, row]));
    const rows = await manager.getRepository(ClassroomStudent).findBy({
      classroomId: In(siblings.map((row) => row.id)),
      membershipId: In(membershipIds),
      removedAt: IsNull(),
    });
    for (const row of rows) {
      const list = result.get(row.membershipId) ?? [];
      list.push(toClassroomRef(siblingById.get(row.classroomId)!));
      result.set(row.membershipId, list);
    }
    return result;
  }
}

function toMemberView(
  { membership, user }: MemberInfo,
  addedAt: Date,
): ClassroomMemberView {
  return {
    membershipId: membership.id,
    userId: user.id,
    fullName: user.fullName,
    email: user.email,
    membershipStatus: membership.status,
    addedAt: addedAt.toISOString(),
  };
}

/** Membership của tenant (kể cả đã xoá, để vẫn hiện tên trong lớp) kèm user. */
export async function loadMembers(
  manager: EntityManager,
  tenantId: string,
  membershipIds: string[],
): Promise<Map<string, MemberInfo>> {
  const result = new Map<string, MemberInfo>();
  if (membershipIds.length === 0) return result;
  const memberships = await manager.getRepository(Membership).find({
    where: { id: In([...new Set(membershipIds)]), tenantId },
    withDeleted: true,
  });
  const users =
    memberships.length > 0
      ? await manager
          .getRepository(User)
          .findBy({ id: In(memberships.map((row) => row.userId)) })
      : [];
  const userById = new Map(users.map((row) => [row.id, row]));
  for (const membership of memberships) {
    const user = userById.get(membership.userId);
    if (user) result.set(membership.id, { membership, user });
  }
  return result;
}

/**
 * Thành viên được chọn phải thuộc tenant, chưa xoá, đang hoạt động và có
 * `role`; không thì 400 kèm tên người không hợp lệ.
 */
export async function loadEligible(
  manager: EntityManager,
  tenantId: string,
  membershipIds: string[],
  role: TenantRole,
  roleLabel: string,
): Promise<MemberInfo[]> {
  const ids = [...new Set(membershipIds)];
  const members = await loadMembers(manager, tenantId, ids);
  const withRole = new Set(
    (
      await manager
        .getRepository(MembershipRole)
        .findBy({ membershipId: In(ids), role })
    ).map((row) => row.membershipId),
  );
  const result: MemberInfo[] = [];
  for (const id of ids) {
    const member = members.get(id);
    if (!member || member.membership.deletedAt) {
      throw new BadRequestException(MEMBER_NOT_FOUND);
    }
    const name = member.user.fullName;
    if (member.membership.status !== MembershipStatus.ACTIVE) {
      throw new BadRequestException(`${name} đang bị ngừng trong trung tâm`);
    }
    if (!withRole.has(id)) {
      throw new BadRequestException(`${name} không có vai trò ${roleLabel}`);
    }
    result.push(member);
  }
  return result;
}
