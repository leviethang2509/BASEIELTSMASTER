import {
  ClassroomStatus,
  CurriculumItemType,
  NOTIFICATION_DEADLINE_SOON_HOURS,
  NotificationType,
  effectiveOpensAt,
} from '@lang/shared';
import { Between, In, IsNull, type EntityManager } from 'typeorm';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { ClassGroup } from '../classrooms/class-group.entity';
import { ClassItem } from '../classrooms/class-item.entity';
import { loadContents } from '../classrooms/class-curriculum.service';
import { ClassroomStudent } from '../classrooms/classroom-student.entity';
import { Classroom } from '../classrooms/classroom.entity';
import { LessonAttempt } from '../lesson-attempts/lesson-attempt.entity';
import { Membership } from '../memberships/membership.entity';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
import {
  notifyGuardians,
  type GuardianStudentRef,
} from './guardian-notifications';
import { learnerClassLink } from './notification-targets';
import type { NotificationsService } from './notifications.service';

/**
 * Chỉ xét các mốc trong vài ngày gần đây: `dedupe_key` đã chặn trùng, cửa sổ
 * này chỉ để cron không quét lại toàn bộ giáo trình cũ. API dừng lâu hơn số
 * ngày này thì các mốc rơi vào lúc dừng không được báo.
 */
const SWEEP_WINDOW_DAYS = 3;

const DAY = 24 * 60 * 60 * 1000;

export interface SweepCounts {
  /** Mục tới ngày mở. */
  opened: number;
  /** Mục còn dưới 24 giờ tới hạn mà học viên chưa nộp. */
  deadlineSoon: number;
  /** Mục quá hạn mà học viên chưa nộp. */
  overdue: number;
  /** Thông báo "con quá hạn chưa nộp" gửi cho phụ huynh (Step 13). */
  guardianOverdue: number;
}

/** Học viên của lớp: user để gửi thông báo, membership để tra phụ huynh. */
interface SweepStudent extends GuardianStudentRef {
  userId: string;
}

/**
 * Cron 15 phút (R18.1, R18.5): mục vừa mở, mục sắp hết hạn và mục quá hạn của
 * các lớp **đang học**. "Chưa nộp" đọc đúng dữ liệu mà chuyên cần dùng: đề thi
 * = chưa có lượt nào (trừ lượt đã "Cho làm lại"), bài học = chưa nộp lần nào.
 */
export async function sweepClassItems(
  manager: EntityManager,
  notifications: NotificationsService,
  now = new Date(),
): Promise<SweepCounts> {
  const counts: SweepCounts = {
    opened: 0,
    deadlineSoon: 0,
    overdue: 0,
    guardianOverdue: 0,
  };
  const windowStart = new Date(now.getTime() - SWEEP_WINDOW_DAYS * DAY);
  const soonLimit = new Date(
    now.getTime() + NOTIFICATION_DEADLINE_SOON_HOURS * 60 * 60 * 1000,
  );

  const items = await candidateItems(manager, windowStart, now, soonLimit);
  if (items.length === 0) return counts;

  const classrooms = new Map(
    (
      await manager.getRepository(Classroom).findBy({
        id: In([...new Set(items.map((item) => item.classroomId))]),
        status: ClassroomStatus.ONGOING,
      })
    ).map((classroom) => [classroom.id, classroom]),
  );
  const pending = items.filter((item) => classrooms.has(item.classroomId));
  if (pending.length === 0) return counts;

  const classroomIds = [...classrooms.keys()];
  const [tenants, groups, students, contents] = await Promise.all([
    tenantsById(manager, [...classrooms.values()]),
    manager.getRepository(ClassGroup).findBy({ classroomId: In(classroomIds) }),
    studentsByClassroom(manager, classroomIds),
    loadContents(manager, pending),
  ]);
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const done = await submittedUsersByItem(manager, pending);

  for (const item of pending) {
    const classroom = classrooms.get(item.classroomId)!;
    const tenant = tenants.get(classroom.tenantId);
    if (!tenant) continue;
    const enrolled = students.get(classroom.id) ?? [];
    if (enrolled.length === 0) continue;
    const learners = enrolled.map((student) => student.userId);

    const contentId = item.examId ?? item.lessonId;
    const params = {
      className: classroom.name,
      title:
        item.title ?? (contentId ? (contents.get(contentId)?.title ?? '') : ''),
    };
    const link = learnerClassLink(tenant.slug, classroom.id);
    const notify = (
      type: NotificationType,
      dedupeKey: string,
      userIds: string[],
      at?: Date | null,
    ) =>
      notifications.notify(manager, {
        userIds,
        tenantId: classroom.tenantId,
        type,
        params: at ? { ...params, at: at.toISOString() } : params,
        link,
        dedupeKey,
      });

    const opensAt = effectiveOpensAt(
      groupById.get(item.groupId ?? '')?.opensAt?.toISOString() ?? null,
      item.opensAt?.toISOString() ?? null,
    );
    if (opensAt && inWindow(opensAt, windowStart, now)) {
      counts.opened += await notify(
        NotificationType.CLASS_ITEM_OPENED,
        `open:${item.id}`,
        learners,
      );
    }

    if (!item.deadlineAt) continue;
    const submitted = done.get(item.id) ?? new Set<string>();
    const pendingStudents = enrolled.filter(
      (student) => !submitted.has(student.userId),
    );
    const waiting = pendingStudents.map((student) => student.userId);
    if (waiting.length === 0) continue;
    const deadline = item.deadlineAt.getTime();
    if (deadline > now.getTime() && deadline <= soonLimit.getTime()) {
      counts.deadlineSoon += await notify(
        NotificationType.ITEM_DEADLINE_SOON,
        `soon:${item.id}`,
        waiting,
        item.deadlineAt,
      );
    } else if (deadline <= now.getTime() && deadline > windowStart.getTime()) {
      counts.overdue += await notify(
        NotificationType.ITEM_OVERDUE,
        `late:${item.id}`,
        waiting,
        item.deadlineAt,
      );
      // Phụ huynh cũng được báo con quá hạn chưa nộp (R19, Step 13).
      counts.guardianOverdue += await notifyGuardians(manager, notifications, {
        tenantId: classroom.tenantId,
        slug: tenant.slug,
        students: pendingStudents,
        type: NotificationType.CHILD_ITEM_OVERDUE,
        params: { ...params, at: item.deadlineAt.toISOString() },
        dedupeKey: (student) => `child_late:${item.id}:${student.membershipId}`,
      });
    }
  }
  return counts;
}

const inWindow = (value: string, from: Date, to: Date) => {
  const time = Date.parse(value);
  return time > from.getTime() && time <= to.getTime();
};

/** Mục có mốc mở hoặc hạn nộp rơi vào cửa sổ quét (kể cả mở theo chương). */
async function candidateItems(
  manager: EntityManager,
  windowStart: Date,
  now: Date,
  soonLimit: Date,
): Promise<ClassItem[]> {
  const items = manager.getRepository(ClassItem);
  const [byDeadline, byOpen, openedGroups] = await Promise.all([
    items.findBy({
      removedAt: IsNull(),
      deadlineAt: Between(windowStart, soonLimit),
    }),
    items.findBy({ removedAt: IsNull(), opensAt: Between(windowStart, now) }),
    manager
      .getRepository(ClassGroup)
      .findBy({ opensAt: Between(windowStart, now) }),
  ]);
  const byGroup =
    openedGroups.length > 0
      ? await items.findBy({
          removedAt: IsNull(),
          groupId: In(openedGroups.map((group) => group.id)),
        })
      : [];
  return [
    ...new Map(
      [...byDeadline, ...byOpen, ...byGroup].map((item) => [item.id, item]),
    ).values(),
  ];
}

async function tenantsById(
  manager: EntityManager,
  classrooms: Classroom[],
): Promise<Map<string, Tenant>> {
  const rows = await manager
    .getRepository(Tenant)
    .findBy({ id: In([...new Set(classrooms.map((row) => row.tenantId))]) });
  return new Map(rows.map((tenant) => [tenant.id, tenant]));
}

async function studentsByClassroom(
  manager: EntityManager,
  classroomIds: string[],
): Promise<Map<string, SweepStudent[]>> {
  const rows = await manager
    .getRepository(ClassroomStudent)
    .findBy({ classroomId: In(classroomIds), removedAt: IsNull() });
  if (rows.length === 0) return new Map();
  const memberships = await manager.getRepository(Membership).find({
    select: { id: true, userId: true },
    where: { id: In([...new Set(rows.map((row) => row.membershipId))]) },
  });
  // Họ tên để dựng câu "Con bạn … chưa nộp" cho phụ huynh (Step 13).
  const users = await manager.getRepository(User).find({
    select: { id: true, fullName: true },
    where: { id: In([...new Set(memberships.map((row) => row.userId))]) },
  });
  const nameByUser = new Map(users.map((row) => [row.id, row.fullName]));
  const userByMembership = new Map(
    memberships.map((membership) => [membership.id, membership.userId]),
  );
  const result = new Map<string, SweepStudent[]>();
  for (const row of rows) {
    const userId = userByMembership.get(row.membershipId);
    if (!userId) continue;
    const list = result.get(row.classroomId) ?? [];
    if (list.some((student) => student.userId === userId)) continue;
    list.push({
      userId,
      membershipId: row.membershipId,
      fullName: nameByUser.get(userId) ?? '',
    });
    result.set(row.classroomId, list);
  }
  return result;
}

/** Học viên đã nộp mục nào: đề thi = có lượt chưa bị "Cho làm lại". */
async function submittedUsersByItem(
  manager: EntityManager,
  items: ClassItem[],
): Promise<Map<string, Set<string>>> {
  const examIds = items
    .filter(
      (item) => item.deadlineAt && item.itemType === CurriculumItemType.EXAM,
    )
    .map((item) => item.id);
  const lessonIds = items
    .filter(
      (item) => item.deadlineAt && item.itemType === CurriculumItemType.LESSON,
    )
    .map((item) => item.id);
  const [examAttempts, lessonAttempts] = await Promise.all([
    examIds.length > 0
      ? manager
          .getRepository(ExamAttempt)
          .findBy({ classItemId: In(examIds), voidedAt: IsNull() })
      : Promise.resolve([]),
    lessonIds.length > 0
      ? manager
          .getRepository(LessonAttempt)
          .findBy({ classItemId: In(lessonIds) })
      : Promise.resolve([]),
  ]);
  const result = new Map<string, Set<string>>();
  const add = (itemId: string | null, userId: string) => {
    if (!itemId) return;
    const set = result.get(itemId) ?? new Set<string>();
    set.add(userId);
    result.set(itemId, set);
  };
  for (const attempt of examAttempts) add(attempt.classItemId, attempt.userId);
  for (const attempt of lessonAttempts) {
    if (attempt.submittedAt) add(attempt.classItemId, attempt.userId);
  }
  return result;
}
