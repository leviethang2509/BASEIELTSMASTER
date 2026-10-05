import { In, IsNull, type EntityManager } from 'typeorm';
import { ClassroomStudent } from '../classrooms/classroom-student.entity';
import { ClassroomTeacher } from '../classrooms/classroom-teacher.entity';
import { Membership } from '../memberships/membership.entity';

/**
 * Người nhận thông báo là **user** (chuông gộp mọi trung tâm) trong khi lớp
 * lưu theo membership, nên mọi chỗ gửi đều đi qua các hàm này. Học viên bị
 * ngừng hoạt động vẫn còn trong lớp (giả định 16) nên vẫn nhận thông báo.
 */
export async function userIdsOfMemberships(
  manager: EntityManager,
  membershipIds: readonly string[],
): Promise<string[]> {
  const ids = [...new Set(membershipIds)];
  if (ids.length === 0) return [];
  const rows = await manager.getRepository(Membership).find({
    select: { id: true, userId: true },
    where: { id: In(ids) },
  });
  return [...new Set(rows.map((row) => row.userId))];
}

/** Học viên chưa rời lớp. */
export async function classroomStudentUserIds(
  manager: EntityManager,
  classroomId: string,
): Promise<string[]> {
  const rows = await manager
    .getRepository(ClassroomStudent)
    .findBy({ classroomId, removedAt: IsNull() });
  return userIdsOfMemberships(
    manager,
    rows.map((row) => row.membershipId),
  );
}

/** Giáo viên của lớp. */
export async function classroomTeacherUserIds(
  manager: EntityManager,
  classroomId: string,
): Promise<string[]> {
  const rows = await manager
    .getRepository(ClassroomTeacher)
    .findBy({ classroomId });
  return userIdsOfMemberships(
    manager,
    rows.map((row) => row.membershipId),
  );
}

// Đường dẫn trong ứng dụng (khớp route của lang-app, plan mục 6.1).

export const learnerClassLink = (slug: string, classroomId: string) =>
  `/t/${slug}/classes/${classroomId}`;

/** Trang "Con của tôi" của một đứa con (phụ huynh, Step 13). */
export const guardianChildLink = (slug: string, studentMembershipId: string) =>
  `/t/${slug}/children/${studentMembershipId}`;

export const dashboardClassLink = (
  slug: string,
  classroomId: string,
  tab?: string,
) => `/t/${slug}/dashboard/classes/${classroomId}${tab ? `?tab=${tab}` : ''}`;

export const examResultLink = (slug: string, attemptId: string) =>
  `/t/${slug}/attempts/${attemptId}/result`;

export const lessonAttemptLink = (slug: string, attemptId: string) =>
  `/t/${slug}/lesson-attempts/${attemptId}`;

export const gradingLink = (
  slug: string,
  attemptId: string,
  kind: 'exam' | 'lesson',
) =>
  kind === 'lesson'
    ? `/t/${slug}/dashboard/grading/lessons/${attemptId}`
    : `/t/${slug}/dashboard/grading/${attemptId}`;

export const gradingListLink = (slug: string) => `/t/${slug}/dashboard/grading`;

export const sessionLink = (slug: string, sessionId: string) =>
  `/t/${slug}/dashboard/sessions/${sessionId}`;
