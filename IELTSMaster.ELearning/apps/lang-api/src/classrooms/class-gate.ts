import { ClassroomStatus } from '@lang/shared';
import { ConflictException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { ClassItem } from './class-item.entity';
import { Classroom } from './classroom.entity';

export const CLASSROOM_NOT_ONGOING =
  'Lớp học không còn nhận bài (lớp chưa bắt đầu hoặc đã kết thúc/huỷ)';

/**
 * Lớp của một lượt làm/lượt học trong lớp còn nhận bài không (T6, R10.4): chỉ
 * lớp `ongoing`. Lượt tự do (`classItemId = null`) luôn đúng.
 */
export async function isAttemptClassOngoing(
  manager: EntityManager,
  classItemId: string | null,
): Promise<boolean> {
  if (classItemId === null) return true;
  const item = await manager
    .getRepository(ClassItem)
    .findOne({ select: { classroomId: true }, where: { id: classItemId } });
  if (!item) return false;
  const classroom = await manager
    .getRepository(Classroom)
    .findOne({ select: { status: true }, where: { id: item.classroomId } });
  return classroom?.status === ClassroomStatus.ONGOING;
}

/** Như trên nhưng ném 409 khi lớp đã kết thúc/huỷ (dùng ở luồng ghi). */
export async function assertAttemptClassOngoing(
  manager: EntityManager,
  classItemId: string | null,
): Promise<void> {
  if (!(await isAttemptClassOngoing(manager, classItemId))) {
    throw new ConflictException(CLASSROOM_NOT_ONGOING);
  }
}
