import {
  NotificationType,
  type NotificationParams,
  type RecomputeScheduleResult,
} from '@lang/shared';
import { IsNull, type EntityManager } from 'typeorm';
import { notifyGuardians } from '../notifications/guardian-notifications';
import {
  classroomStudentUserIds,
  classroomTeacherUserIds,
  dashboardClassLink,
  learnerClassLink,
  sessionLink,
  userIdsOfMemberships,
} from '../notifications/notification-targets';
import type { NotificationsService } from '../notifications/notifications.service';
import {
  attendanceColumns,
  attendanceRows,
  loadClassProgress,
} from './class-progress';
import { movedCount } from './class-schedule';
import type { ClassSession } from './class-session.entity';
import { ClassroomStudent } from './classroom-student.entity';
import { Classroom } from './classroom.entity';

/** Lớp đủ để dựng thông báo (không cần cả entity). */
export type ClassroomRefRow = Pick<Classroom, 'id' | 'tenantId' | 'name'>;

export interface ClassEventInput {
  classroom: ClassroomRefRow;
  slug: string;
  type: NotificationType;
  params?: NotificationParams;
  /** Người gây ra sự kiện: không tự nhận thông báo của mình. */
  actorId: string | null;
  /** Đường dẫn cho giáo viên; mặc định trang lớp ở dashboard. */
  teacherLink?: string;
  dedupeKey?: string | null;
}

/** Thông báo cho học viên của lớp (link vào trang lớp ở khu vực chính). */
export function notifyClassStudents(
  manager: EntityManager,
  notifications: NotificationsService,
  input: ClassEventInput,
): Promise<number> {
  return send(manager, notifications, input, 'students');
}

/** Thông báo cho giáo viên của lớp (link vào trang lớp ở dashboard). */
export function notifyClassTeachers(
  manager: EntityManager,
  notifications: NotificationsService,
  input: ClassEventInput,
): Promise<number> {
  return send(manager, notifications, input, 'teachers');
}

/** Gửi cho cả học viên lẫn giáo viên (hai thông báo, khác đường dẫn). */
export async function notifyClassMembers(
  manager: EntityManager,
  notifications: NotificationsService,
  input: ClassEventInput,
): Promise<void> {
  await notifyClassStudents(manager, notifications, input);
  await notifyClassTeachers(manager, notifications, input);
}

async function send(
  manager: EntityManager,
  notifications: NotificationsService,
  input: ClassEventInput,
  audience: 'students' | 'teachers',
): Promise<number> {
  const { classroom, slug } = input;
  const userIds =
    audience === 'students'
      ? await classroomStudentUserIds(manager, classroom.id)
      : await classroomTeacherUserIds(manager, classroom.id);
  if (userIds.length === 0) return 0;
  return notifications.notify(manager, {
    userIds,
    tenantId: classroom.tenantId,
    type: input.type,
    params: { className: classroom.name, ...input.params },
    link:
      audience === 'students'
        ? learnerClassLink(slug, classroom.id)
        : (input.teacherLink ?? dashboardClassLink(slug, classroom.id)),
    // Cùng một khoá chống trùng dùng cho hai nhóm nên thêm hậu tố nhóm.
    dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${audience}` : null,
    exceptUserId: input.actorId,
  });
}

/**
 * Dời lịch: **một** thông báo gộp cho mỗi lớp (U5.3), kể cả khi tính lại vì
 * ngày nghỉ của trung tâm hay vì lớp mở lại.
 */
export async function notifySessionsMoved(
  manager: EntityManager,
  notifications: NotificationsService,
  input: {
    classroom: ClassroomRefRow;
    slug: string;
    result: RecomputeScheduleResult;
    actorId: string | null;
  },
): Promise<void> {
  const moved = movedCount(input.result);
  if (moved === 0) return;
  const first = input.result.changed
    .filter((row) => row.dateChanged)
    .map((row) => row.startsAt)
    .sort()[0];
  await notifyClassMembers(manager, notifications, {
    classroom: input.classroom,
    slug: input.slug,
    actorId: input.actorId,
    type: NotificationType.SESSIONS_MOVED,
    params: { count: moved, at: first },
    teacherLink: dashboardClassLink(input.slug, input.classroom.id, 'schedule'),
  });
}

/** Buổi học bị huỷ, đổi giờ hoặc thêm buổi bù. */
export async function notifySessionChanged(
  manager: EntityManager,
  notifications: NotificationsService,
  input: {
    classroom: ClassroomRefRow;
    slug: string;
    session: Pick<ClassSession, 'id' | 'seq' | 'startsAt'>;
    type: NotificationType;
    actorId: string | null;
  },
): Promise<void> {
  await notifyClassMembers(manager, notifications, {
    classroom: input.classroom,
    slug: input.slug,
    actorId: input.actorId,
    type: input.type,
    params: {
      seq: input.session.seq,
      at: input.session.startsAt.toISOString(),
    },
    teacherLink: sessionLink(input.slug, input.session.id),
  });
}

/**
 * Lớp chuyển sang "Đã kết thúc": học viên đã có nhận xét cuối khoá được báo
 * một lần (T5.3). Nhận xét sửa sau đó báo riêng ở `ClassProgressService`.
 */
export async function notifyFinalComments(
  manager: EntityManager,
  notifications: NotificationsService,
  input: { classroom: ClassroomRefRow; slug: string; actorId: string | null },
): Promise<void> {
  const rows = await manager.getRepository(ClassroomStudent).findBy({
    classroomId: input.classroom.id,
    removedAt: IsNull(),
  });
  const commented = rows.filter((row) => row.finalComment);
  if (commented.length === 0) return;
  await notifications.notify(manager, {
    userIds: await userIdsOfMemberships(
      manager,
      commented.map((row) => row.membershipId),
    ),
    tenantId: input.classroom.tenantId,
    type: NotificationType.FINAL_COMMENT_PUBLISHED,
    params: { className: input.classroom.name },
    link: learnerClassLink(input.slug, input.classroom.id),
    dedupeKey: `final_comment:${input.classroom.id}`,
    exceptUserId: input.actorId,
  });
}

/** Giáo viên được xếp dạy một buổi (dạy thế hoặc buổi bù – R14.2). */
export async function notifySessionTeachers(
  manager: EntityManager,
  notifications: NotificationsService,
  input: {
    classroom: ClassroomRefRow;
    slug: string;
    session: Pick<ClassSession, 'id' | 'seq' | 'startsAt'>;
    membershipIds: readonly string[];
    actorId: string | null;
  },
): Promise<void> {
  await notifications.notify(manager, {
    userIds: await userIdsOfMemberships(manager, input.membershipIds),
    tenantId: input.classroom.tenantId,
    type: NotificationType.SESSION_TEACHER_ASSIGNED,
    params: {
      className: input.classroom.name,
      seq: input.session.seq,
      at: input.session.startsAt.toISOString(),
    },
    link: sessionLink(input.slug, input.session.id),
    exceptUserId: input.actorId,
  });
}

/**
 * Lớp chuyển "Đã kết thúc": phụ huynh của học viên có chuyên cần **dưới
 * ngưỡng** được báo (R19, Step 13). Gọi sau khi đã chốt các lượt đang làm dở
 * để số liệu khớp tab Tiến độ & Chuyên cần; học viên đã rời lớp không tính
 * (giả định 15).
 */
export async function notifyGuardiansAttendance(
  manager: EntityManager,
  notifications: NotificationsService,
  input: { classroom: Classroom; slug: string; now?: Date },
): Promise<number> {
  const data = await loadClassProgress(manager, input.classroom);
  const columns = attendanceColumns(data);
  if (columns.length === 0) return 0;
  const rows = attendanceRows(data, columns, input.now ?? new Date()).filter(
    (row) => row.belowThreshold && !row.student.removed,
  );
  if (rows.length === 0) return 0;
  const percentOf = new Map(
    rows.map((row) => [row.student.membershipId, row.rate.percent] as const),
  );
  return notifyGuardians(manager, notifications, {
    tenantId: input.classroom.tenantId,
    slug: input.slug,
    students: rows.map((row) => ({
      membershipId: row.student.membershipId,
      fullName: row.student.fullName,
    })),
    type: NotificationType.CHILD_ATTENDANCE_LOW,
    params: (student) => ({
      className: input.classroom.name,
      percent: percentOf.get(student.membershipId) ?? 0,
      count: data.params.warningThreshold,
    }),
    dedupeKey: (student) =>
      `child_attendance:${input.classroom.id}:${student.membershipId}`,
  });
}
