import { NotificationType } from '@lang/shared';
import type { EntityManager } from 'typeorm';
import { ClassItem } from '../classrooms/class-item.entity';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
import { classroomTeacherUserIds, gradingLink } from './notification-targets';
import type { NotificationsService } from './notifications.service';

export interface PendingGradingInput {
  tenantId: string;
  attemptId: string;
  kind: 'exam' | 'lesson';
  /** Mục của lớp nếu là bài làm trong lớp, `null` nếu làm tự do. */
  classItemId: string | null;
  /** Người soạn đề/bài học (chỉ dùng cho bài làm tự do). */
  authorId: string | null;
  /** Người nộp bài: không nhận thông báo về bài của chính mình. */
  studentUserId: string;
  /** Tên đề thi / bài học. */
  title: string;
  dedupeKey: string;
}

/**
 * "Có bài mới cần chấm" (R18.1; người dùng chốt Step 12): gửi cho người có
 * **quyền chấm gốc** – giáo viên của lớp với bài làm trong lớp, người soạn
 * đề/bài học với bài làm tự do. Owner/Admin và người được chuyển giao không
 * nhận để chuông không ngập mỗi lần có người nộp bài.
 */
export async function notifyPendingGrading(
  manager: EntityManager,
  notifications: NotificationsService,
  input: PendingGradingInput,
): Promise<void> {
  const userIds = input.classItemId
    ? await teachersOfItem(manager, input.classItemId)
    : input.authorId
      ? [input.authorId]
      : [];
  if (userIds.length === 0) return;
  const [tenant, student] = await Promise.all([
    manager.getRepository(Tenant).findOneBy({ id: input.tenantId }),
    manager.getRepository(User).findOneBy({ id: input.studentUserId }),
  ]);
  if (!tenant) return;
  await notifications.notify(manager, {
    userIds,
    tenantId: input.tenantId,
    type: NotificationType.GRADING_PENDING,
    params: { title: input.title, actorName: student?.fullName ?? '' },
    link: gradingLink(tenant.slug, input.attemptId, input.kind),
    dedupeKey: input.dedupeKey,
    exceptUserId: input.studentUserId,
  });
}

async function teachersOfItem(
  manager: EntityManager,
  classItemId: string,
): Promise<string[]> {
  const item = await manager
    .getRepository(ClassItem)
    .findOneBy({ id: classItemId });
  return item ? classroomTeacherUserIds(manager, item.classroomId) : [];
}
