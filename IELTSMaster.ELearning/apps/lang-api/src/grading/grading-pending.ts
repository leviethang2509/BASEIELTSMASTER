import { AttemptStatus, GradingKind } from '@lang/shared';
import type { EntityManager } from 'typeorm';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { ClassItem } from '../classrooms/class-item.entity';
import { Exam } from '../exams/exam.entity';
import { LessonAttempt } from '../lesson-attempts/lesson-attempt.entity';
import { Lesson } from '../lessons/lesson.entity';
import type { TenantContext } from '../tenants/tenant-context';
import { applyGraderScope, loadGraderScope } from './grading-access';

/**
 * Số bài **đang chờ người này chấm** (thẻ "Bài chờ chấm" của dashboard tenant):
 * đúng phạm vi và đúng bộ lọc "Chờ chấm" của trang Chấm bài — lượt thi đã nộp
 * hết còn câu chưa chấm, cộng lượt học có câu chấm tay chưa chấm đủ.
 */
export async function countPendingGrading(
  manager: EntityManager,
  ctx: TenantContext,
  graderId: string,
): Promise<number> {
  const scope = await loadGraderScope(manager, ctx, graderId);

  const exams = manager
    .getRepository(ExamAttempt)
    .createQueryBuilder('attempt')
    .leftJoin(ClassItem, 'item', 'item.id = attempt.class_item_id')
    .leftJoin(Exam, 'exam', 'exam.id = attempt.exam_id')
    .where('attempt.tenantId = :tenantId', { tenantId: ctx.tenantId })
    .andWhere('attempt.status = :status', { status: AttemptStatus.SUBMITTED })
    .andWhere('attempt.manualCount > 0')
    .andWhere('attempt.voidedAt IS NULL')
    .andWhere('attempt.userId <> :graderId', { graderId: scope.graderId });
  applyGraderScope(exams, scope, GradingKind.EXAM, 'exam');

  const lessons = manager
    .getRepository(LessonAttempt)
    .createQueryBuilder('attempt')
    .leftJoin(ClassItem, 'item', 'item.id = attempt.class_item_id')
    .leftJoin(Lesson, 'lesson', 'lesson.id = attempt.lesson_id')
    .where('attempt.tenantId = :tenantId', { tenantId: ctx.tenantId })
    .andWhere('attempt.manualCount > 0')
    .andWhere('attempt.manualGradedCount < attempt.manualCount')
    .andWhere('attempt.userId <> :graderId', { graderId: scope.graderId });
  applyGraderScope(lessons, scope, GradingKind.LESSON, 'lesson');

  const [examCount, lessonCount] = await Promise.all([
    exams.getCount(),
    lessons.getCount(),
  ]);
  return examCount + lessonCount;
}
