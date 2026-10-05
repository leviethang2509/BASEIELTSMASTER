import {
  GradingKind,
  GradingScopeType,
  TENANT_MANAGER_ROLES,
  hasAnyRole,
} from '@lang/shared';
import { Brackets, type EntityManager, type SelectQueryBuilder } from 'typeorm';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { ClassItem } from '../classrooms/class-item.entity';
import { ClassroomTeacher } from '../classrooms/classroom-teacher.entity';
import { Classroom } from '../classrooms/classroom.entity';
import { Exam } from '../exams/exam.entity';
import { LessonAttempt } from '../lesson-attempts/lesson-attempt.entity';
import { Lesson } from '../lessons/lesson.entity';
import type { TenantContext } from '../tenants/tenant-context';
import { GradingDelegation } from './grading-delegation.entity';

// Quyền chấm một lượt làm/lượt học (plan mục 4.7, R20): hàm thuần
// `canGradeAttempt` là bản gốc của quy tắc; truy vấn danh sách dựng điều kiện
// SQL tương đương từ cùng `GraderScope`.

/** Phạm vi chấm của một người trong một trung tâm. */
export interface GraderScope {
  graderId: string;
  membershipId: string;
  /** Owner/Admin: chấm mọi bài của trung tâm. */
  isManager: boolean;
  /** Lớp mình phụ trách (`classroom_teachers`). */
  classroomIds: readonly string[];
  /** Chuyển giao mình nhận, theo từng loại phạm vi. */
  delegated: Readonly<Record<GradingScopeType, readonly string[]>>;
}

/** Một lượt làm/lượt học với đủ dữ liệu để xét quyền chấm. */
export interface GradableAttemptRow {
  id: string;
  userId: string;
  /** Lượt đã "Cho làm lại": không đưa vào chấm (giả định 8). */
  voided: boolean;
  /** Mục giáo trình lớp sinh ra lượt; `null` = bài làm tự do. */
  classItemId: string | null;
  /** Lớp của mục (null khi bài tự do hoặc mục đã mất). */
  classroomId: string | null;
  /** Đề thi hoặc bài học của lượt. */
  contentId: string;
  /** `exams.created_by` / `lessons.created_by`. */
  authorId: string | null;
}

const emptyDelegations = (): Record<GradingScopeType, string[]> => ({
  [GradingScopeType.CLASS_ITEM]: [],
  [GradingScopeType.EXAM]: [],
  [GradingScopeType.LESSON]: [],
  [GradingScopeType.EXAM_ATTEMPT]: [],
  [GradingScopeType.LESSON_ATTEMPT]: [],
});

/** Loại phạm vi ứng với từng loại bài. */
export const attemptScopeOf = (kind: GradingKind): GradingScopeType =>
  kind === GradingKind.LESSON
    ? GradingScopeType.LESSON_ATTEMPT
    : GradingScopeType.EXAM_ATTEMPT;

export const contentScopeOf = (kind: GradingKind): GradingScopeType =>
  kind === GradingKind.LESSON ? GradingScopeType.LESSON : GradingScopeType.EXAM;

/**
 * Chấm được lượt này không (plan mục 4.7): không phải bài của mình, lượt chưa
 * bị "Cho làm lại", VÀ (Owner/Admin · bài trong lớp mình phụ trách · bài tự do
 * của đề/bài mình soạn · có chuyển giao khớp mục lớp, đề/bài hoặc chính lượt).
 */
export function canGradeAttempt(
  scope: GraderScope,
  row: GradableAttemptRow,
  kind: GradingKind,
): boolean {
  if (row.userId === scope.graderId) return false;
  if (row.voided) return false;
  if (scope.isManager) return true;
  if (scope.delegated[attemptScopeOf(kind)].includes(row.id)) return true;
  if (row.classItemId !== null) {
    return (
      (row.classroomId !== null &&
        scope.classroomIds.includes(row.classroomId)) ||
      scope.delegated[GradingScopeType.CLASS_ITEM].includes(row.classItemId)
    );
  }
  // Bài làm tự do: người soạn đề/bài học, hoặc người được giao đề/bài đó.
  return (
    (row.authorId !== null && row.authorId === scope.graderId) ||
    scope.delegated[contentScopeOf(kind)].includes(row.contentId)
  );
}

/** Nạp phạm vi chấm của người đang đăng nhập (1 lần cho mỗi request). */
export async function loadGraderScope(
  manager: EntityManager,
  ctx: TenantContext,
  graderId: string,
): Promise<GraderScope> {
  const isManager = hasAnyRole(ctx.roles, TENANT_MANAGER_ROLES);
  const [teacherRows, delegationRows] = await Promise.all([
    isManager
      ? Promise.resolve([])
      : manager
          .getRepository(ClassroomTeacher)
          .findBy({ membershipId: ctx.membershipId }),
    isManager
      ? Promise.resolve([])
      : manager.getRepository(GradingDelegation).findBy({
          tenantId: ctx.tenantId,
          delegateMembershipId: ctx.membershipId,
        }),
  ]);
  const delegated = emptyDelegations();
  for (const row of delegationRows) delegated[row.scopeType].push(row.scopeId);
  return {
    graderId,
    membershipId: ctx.membershipId,
    isManager,
    classroomIds: teacherRows.map((row) => row.classroomId),
    delegated,
  };
}

/**
 * Điều kiện SQL tương đương `canGradeAttempt` cho truy vấn danh sách. Truy vấn
 * phải join sẵn `item` (mục lớp, LEFT JOIN theo `attempt.classItemId`) và
 * `contentAlias` (đề thi/bài học của lượt). Phần "không phải bài của mình" và
 * "bỏ lượt đã cho làm lại" do truy vấn tự thêm.
 */
export function applyGraderScope(
  qb: SelectQueryBuilder<object>,
  scope: GraderScope,
  kind: GradingKind,
  contentAlias: string,
): void {
  if (scope.isManager) return;
  const classrooms = scope.classroomIds;
  const items = scope.delegated[GradingScopeType.CLASS_ITEM];
  const contents = scope.delegated[contentScopeOf(kind)];
  const attempts = scope.delegated[attemptScopeOf(kind)];
  qb.andWhere(
    new Brackets((where) => {
      // Bài tự do của đề/bài học mình soạn (luôn có, nên dùng làm mệnh đề đầu).
      where.where(
        `(attempt.classItemId IS NULL AND ${contentAlias}.createdBy = :scopeGrader)`,
        { scopeGrader: scope.graderId },
      );
      if (classrooms.length > 0) {
        where.orWhere('item.classroomId IN (:...scopeClassrooms)', {
          scopeClassrooms: classrooms,
        });
      }
      if (items.length > 0) {
        where.orWhere('attempt.classItemId IN (:...scopeItems)', {
          scopeItems: items,
        });
      }
      if (contents.length > 0) {
        where.orWhere(
          `(attempt.classItemId IS NULL AND ${contentAlias}.id IN (:...scopeContents))`,
          { scopeContents: contents },
        );
      }
      if (attempts.length > 0) {
        where.orWhere('attempt.id IN (:...scopeAttempts)', {
          scopeAttempts: attempts,
        });
      }
    }),
  );
}

/**
 * Quyền **gốc** trên một phạm vi (không tính chuyển giao mình nhận): chỉ người
 * này mới chuyển giao tiếp được (người dùng chốt Step 10: không giao lại).
 */
export async function canDelegateScope(
  manager: EntityManager,
  ctx: TenantContext,
  graderId: string,
  scopeType: GradingScopeType,
  scopeId: string,
): Promise<boolean> {
  if (hasAnyRole(ctx.roles, TENANT_MANAGER_ROLES)) return true;
  switch (scopeType) {
    case GradingScopeType.CLASS_ITEM:
      return isClassItemTeacher(manager, ctx, scopeId);
    case GradingScopeType.EXAM:
      return isExamAuthor(manager, ctx, scopeId, graderId);
    case GradingScopeType.LESSON:
      return isLessonAuthor(manager, ctx, scopeId, graderId);
    case GradingScopeType.EXAM_ATTEMPT: {
      const attempt = await manager
        .getRepository(ExamAttempt)
        .findOneBy({ id: scopeId, tenantId: ctx.tenantId });
      if (!attempt) return false;
      return attempt.classItemId
        ? isClassItemTeacher(manager, ctx, attempt.classItemId)
        : isExamAuthor(manager, ctx, attempt.examId, graderId);
    }
    case GradingScopeType.LESSON_ATTEMPT: {
      const attempt = await manager
        .getRepository(LessonAttempt)
        .findOneBy({ id: scopeId, tenantId: ctx.tenantId });
      if (!attempt) return false;
      return attempt.classItemId
        ? isClassItemTeacher(manager, ctx, attempt.classItemId)
        : isLessonAuthor(manager, ctx, attempt.lessonId, graderId);
    }
  }
}

async function isClassItemTeacher(
  manager: EntityManager,
  ctx: TenantContext,
  classItemId: string,
): Promise<boolean> {
  const item = await manager
    .getRepository(ClassItem)
    .findOneBy({ id: classItemId });
  if (!item) return false;
  const classroom = await manager
    .getRepository(Classroom)
    .findOneBy({ id: item.classroomId, tenantId: ctx.tenantId });
  if (!classroom) return false;
  return manager.getRepository(ClassroomTeacher).existsBy({
    classroomId: classroom.id,
    membershipId: ctx.membershipId,
  });
}

const isExamAuthor = (
  manager: EntityManager,
  ctx: TenantContext,
  examId: string,
  graderId: string,
): Promise<boolean> =>
  manager
    .getRepository(Exam)
    .existsBy({ id: examId, tenantId: ctx.tenantId, createdBy: graderId });

const isLessonAuthor = (
  manager: EntityManager,
  ctx: TenantContext,
  lessonId: string,
  graderId: string,
): Promise<boolean> =>
  manager
    .getRepository(Lesson)
    .existsBy({ id: lessonId, tenantId: ctx.tenantId, createdBy: graderId });
