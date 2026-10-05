import { NotificationType, type NotificationParams } from '@lang/shared';
import { In, type EntityManager } from 'typeorm';
import { Membership } from '../memberships/membership.entity';
import { StudentGuardian } from '../memberships/student-guardian.entity';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
import { guardianChildLink } from './notification-targets';
import type { NotificationsService } from './notifications.service';

/** Học viên được nhắc tới trong thông báo gửi cho phụ huynh. */
export interface GuardianStudentRef {
  membershipId: string;
  fullName: string;
}

/**
 * Phụ huynh của từng học viên: membership học viên → user id của phụ huynh.
 * Liên kết chỉ tồn tại khi membership còn vai trò Phụ huynh (xem
 * `MembershipsService`), nên không phải lọc lại role ở đây.
 */
export async function guardianUserIdsByStudent(
  manager: EntityManager,
  tenantId: string,
  studentMembershipIds: readonly string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  const ids = [...new Set(studentMembershipIds)];
  if (ids.length === 0) return result;
  const links = await manager
    .getRepository(StudentGuardian)
    .findBy({ tenantId, studentMembershipId: In(ids) });
  if (links.length === 0) return result;
  const parents = await manager.getRepository(Membership).find({
    select: { id: true, userId: true },
    where: { id: In([...new Set(links.map((row) => row.parentMembershipId))]) },
  });
  const userByMembership = new Map(
    parents.map((row) => [row.id, row.userId] as const),
  );
  for (const link of links) {
    const userId = userByMembership.get(link.parentMembershipId);
    if (!userId) continue;
    const list = result.get(link.studentMembershipId) ?? [];
    if (!list.includes(userId)) list.push(userId);
    result.set(link.studentMembershipId, list);
  }
  return result;
}

export interface GuardianEventInput {
  tenantId: string;
  slug: string;
  /** Con được nhắc tới; mỗi con là một thông báo riêng (link khác nhau). */
  students: readonly GuardianStudentRef[];
  type: NotificationType;
  /** Cố định, hoặc dựng theo từng con (vd. tỉ lệ chuyên cần riêng). */
  params?:
    NotificationParams | ((student: GuardianStudentRef) => NotificationParams);
  /** Khoá chống trùng, dựng theo từng con. */
  dedupeKey?: (student: GuardianStudentRef) => string;
}

/**
 * Thông báo cho phụ huynh đã liên kết (Step 13, R19). Đường dẫn luôn vào trang
 * "Con của tôi" của đúng đứa con, nên không gộp nhiều con vào một thông báo.
 * Con chưa có phụ huynh liên kết thì không gửi gì.
 */
export async function notifyGuardians(
  manager: EntityManager,
  notifications: NotificationsService,
  input: GuardianEventInput,
): Promise<number> {
  const guardians = await guardianUserIdsByStudent(
    manager,
    input.tenantId,
    input.students.map((student) => student.membershipId),
  );
  if (guardians.size === 0) return 0;
  let sent = 0;
  for (const student of input.students) {
    const userIds = guardians.get(student.membershipId);
    if (!userIds || userIds.length === 0) continue;
    sent += await notifications.notify(manager, {
      userIds,
      tenantId: input.tenantId,
      type: input.type,
      params: {
        ...(typeof input.params === 'function'
          ? input.params(student)
          : input.params),
        childName: student.fullName,
      },
      link: guardianChildLink(input.slug, student.membershipId),
      dedupeKey: input.dedupeKey?.(student) ?? null,
    });
  }
  return sent;
}

/**
 * "Bài của con đã chấm xong" (Step 13): gọi ở **mọi** chỗ lượt chuyển sang đã
 * chấm xong – chấm tay xong, và cả lúc nộp đề/bài không có câu chấm tay. Tự
 * tra `slug` và họ tên con nên gọi được cả từ cron (không có `TenantContext`).
 */
export async function notifyGuardiansAttemptGraded(
  manager: EntityManager,
  notifications: NotificationsService,
  input: {
    tenantId: string;
    studentMembershipId: string;
    /** Tên đề thi / bài học. */
    title: string;
    dedupeKey: string;
  },
): Promise<number> {
  const guardians = await guardianUserIdsByStudent(manager, input.tenantId, [
    input.studentMembershipId,
  ]);
  if (guardians.size === 0) return 0;
  const [tenant, student] = await Promise.all([
    manager.getRepository(Tenant).findOneBy({ id: input.tenantId }),
    studentRef(manager, input.studentMembershipId),
  ]);
  if (!tenant || !student) return 0;
  return notifyGuardians(manager, notifications, {
    tenantId: input.tenantId,
    slug: tenant.slug,
    students: [student],
    type: NotificationType.CHILD_ATTEMPT_GRADED,
    params: { title: input.title },
    dedupeKey: () => input.dedupeKey,
  });
}

/** Học viên (membership) → tham chiếu dùng trong thông báo. */
async function studentRef(
  manager: EntityManager,
  membershipId: string,
): Promise<GuardianStudentRef | null> {
  const membership = await manager
    .getRepository(Membership)
    .findOneBy({ id: membershipId });
  if (!membership) return null;
  const user = await manager
    .getRepository(User)
    .findOneBy({ id: membership.userId });
  return user ? { membershipId, fullName: user.fullName } : null;
}
