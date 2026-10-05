import { GradingKind, GradingScopeType } from '@lang/shared';
import {
  canGradeAttempt,
  type GradableAttemptRow,
  type GraderScope,
} from './grading-access';

// Quy tắc `canGrade` (plan mục 4.7, R20): bài trong lớp → giáo viên của lớp;
// bài tự do → người soạn đề/bài học; Owner/Admin mọi bài; chuyển giao mở thêm
// đúng một phạm vi; không ai chấm bài của mình; lượt "Cho làm lại" bỏ qua.

const GRADER = 'grader-1';

function scope(overrides: Partial<GraderScope> = {}): GraderScope {
  return {
    graderId: GRADER,
    membershipId: 'membership-1',
    isManager: false,
    classroomIds: [],
    delegated: {
      [GradingScopeType.CLASS_ITEM]: [],
      [GradingScopeType.EXAM]: [],
      [GradingScopeType.LESSON]: [],
      [GradingScopeType.EXAM_ATTEMPT]: [],
      [GradingScopeType.LESSON_ATTEMPT]: [],
    },
    ...overrides,
  };
}

function classAttempt(
  overrides: Partial<GradableAttemptRow> = {},
): GradableAttemptRow {
  return {
    id: 'attempt-1',
    userId: 'student-1',
    voided: false,
    classItemId: 'item-1',
    classroomId: 'class-1',
    contentId: 'exam-1',
    authorId: 'teacher-2',
    ...overrides,
  };
}

const freeAttempt = (overrides: Partial<GradableAttemptRow> = {}) =>
  classAttempt({ classItemId: null, classroomId: null, ...overrides });

const can = (
  s: GraderScope,
  row: GradableAttemptRow,
  kind: GradingKind = GradingKind.EXAM,
) => canGradeAttempt(s, row, kind);

describe('canGradeAttempt', () => {
  it('không ai chấm bài của chính mình, kể cả Owner/Admin', () => {
    expect(
      can(scope({ isManager: true }), classAttempt({ userId: GRADER })),
    ).toBe(false);
  });

  it('bỏ qua lượt đã "Cho làm lại"', () => {
    expect(
      can(scope({ isManager: true }), classAttempt({ voided: true })),
    ).toBe(false);
  });

  it('Owner/Admin chấm mọi bài của trung tâm', () => {
    expect(can(scope({ isManager: true }), classAttempt())).toBe(true);
    expect(can(scope({ isManager: true }), freeAttempt())).toBe(true);
  });

  it('bài trong lớp: chỉ giáo viên của lớp', () => {
    expect(can(scope({ classroomIds: ['class-1'] }), classAttempt())).toBe(
      true,
    );
    expect(can(scope({ classroomIds: ['class-9'] }), classAttempt())).toBe(
      false,
    );
  });

  it('người soạn đề không tự động chấm được bài trong lớp của đề đó', () => {
    expect(can(scope(), classAttempt({ authorId: GRADER }))).toBe(false);
  });

  it('bài tự do: chỉ người soạn đề/bài học', () => {
    expect(can(scope(), freeAttempt({ authorId: GRADER }))).toBe(true);
    expect(can(scope(), freeAttempt())).toBe(false);
    expect(can(scope({ classroomIds: ['class-1'] }), freeAttempt())).toBe(
      false,
    );
  });

  it('chuyển giao theo mục lớp mở đúng mục đó', () => {
    const s = scope({
      delegated: {
        ...scope().delegated,
        [GradingScopeType.CLASS_ITEM]: ['item-1'],
      },
    });
    expect(can(s, classAttempt())).toBe(true);
    expect(can(s, classAttempt({ classItemId: 'item-2' }))).toBe(false);
  });

  it('chuyển giao theo đề chỉ áp dụng cho bài tự do', () => {
    const s = scope({
      delegated: { ...scope().delegated, [GradingScopeType.EXAM]: ['exam-1'] },
    });
    expect(can(s, freeAttempt())).toBe(true);
    expect(can(s, classAttempt())).toBe(false);
  });

  it('chuyển giao theo từng lượt mở đúng lượt đó', () => {
    const s = scope({
      delegated: {
        ...scope().delegated,
        [GradingScopeType.EXAM_ATTEMPT]: ['attempt-1'],
      },
    });
    expect(can(s, classAttempt())).toBe(true);
    expect(can(s, classAttempt({ id: 'attempt-2' }))).toBe(false);
  });

  it('phạm vi của bài học tách khỏi phạm vi của đề thi', () => {
    const s = scope({
      delegated: {
        ...scope().delegated,
        [GradingScopeType.LESSON]: ['lesson-1'],
        [GradingScopeType.LESSON_ATTEMPT]: ['attempt-9'],
      },
    });
    const row = freeAttempt({ contentId: 'lesson-1' });
    expect(can(s, row, GradingKind.LESSON)).toBe(true);
    expect(can(s, row, GradingKind.EXAM)).toBe(false);
    expect(can(s, freeAttempt({ id: 'attempt-9' }), GradingKind.LESSON)).toBe(
      true,
    );
  });
});
