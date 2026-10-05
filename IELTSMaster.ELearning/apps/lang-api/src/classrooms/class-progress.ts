import {
  AttendanceMark,
  CurriculumItemType,
  GradebookColumnKind,
  MembershipStatus,
  attendanceMarkOf,
  attendanceRate,
  autoScorePercent,
  averagePercent,
  examGroupResult,
  isBelowAttendanceThreshold,
  isGroupMemberRequired,
  type AttendanceCell,
  type AttendanceColumn,
  type AttendanceRow,
  type ClassAttemptSummary,
  type ClassFinalComment,
  type ClassProgressParams,
  type ClassProgressStudent,
  type ExamGroupMember,
  type GradebookCell,
  type GradebookColumn,
  type GradebookGroup,
  type GradebookGroupAverage,
  type GradebookRow,
  type LearnerAttendanceItem,
  type LearnerClassSummary,
} from '@lang/shared';
import { In, type EntityManager } from 'typeorm';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { LessonAttempt } from '../lesson-attempts/lesson-attempt.entity';
import { Membership } from '../memberships/membership.entity';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
import { manualScoresByAttempt } from './class-activity';
import { loadContents, type ClassContentRow } from './class-curriculum.service';
import { ClassGroup } from './class-group.entity';
import { ClassItem } from './class-item.entity';
import { ClassroomStudent } from './classroom-student.entity';
import { Classroom } from './classroom.entity';
import { classContentIdOf } from './classroom.mapper';
import {
  buildExamGroups,
  orderItems,
  rootIdOf,
  toAttemptSummary,
} from './learner-classes.service';

/** Học viên của lớp kèm tài khoản (giữ cả người đã rời lớp, giả định 15). */
interface StudentRow {
  enrollment: ClassroomStudent;
  membership: Membership | null;
  user: User;
}

/**
 * Dữ liệu chung của chuyên cần, bảng điểm, Excel và phần kết quả cuối khoá của
 * học viên: nạp một lần rồi tính bằng hàm thuần của `@lang/shared`.
 */
export interface ClassProgressData {
  classroom: Classroom;
  params: ClassProgressParams;
  groups: ClassGroup[];
  /** Mục theo thứ tự hiển thị, kể cả mục đã bỏ khỏi giáo trình (E3). */
  ordered: ClassItem[];
  contents: Map<string, ClassContentRow>;
  students: StudentRow[];
  examAttempts: ExamAttempt[];
  lessonAttempts: LessonAttempt[];
  manualScores: Map<string, number>;
  /** Người sửa nhận xét cuối khoá gần nhất. */
  commenters: Map<string, User>;
}

/** Tham số chuyên cần hiệu lực: của lớp nếu có, không thì của trung tâm. */
export function progressParams(
  classroom: Classroom,
  tenant: Tenant,
): ClassProgressParams {
  return {
    lateWeight: classroom.lateWeight ?? tenant.lateWeight,
    warningThreshold: classroom.warningThreshold ?? tenant.warningThreshold,
    classLateWeight: classroom.lateWeight ?? null,
    classWarningThreshold: classroom.warningThreshold ?? null,
    tenantLateWeight: tenant.lateWeight,
    tenantWarningThreshold: tenant.warningThreshold,
  };
}

export async function loadClassProgress(
  manager: EntityManager,
  classroom: Classroom,
): Promise<ClassProgressData> {
  const classroomId = classroom.id;
  const [tenant, groups, items, enrollments] = await Promise.all([
    // Tenant luôn tồn tại: mọi route đi qua `TenantGuard`.
    manager.getRepository(Tenant).findOneBy({ id: classroom.tenantId }),
    manager.getRepository(ClassGroup).findBy({ classroomId }),
    manager.getRepository(ClassItem).findBy({ classroomId }),
    manager.getRepository(ClassroomStudent).findBy({ classroomId }),
  ]);
  const itemIds = items.map((item) => item.id);
  const [contents, examAttempts, lessonAttempts, students, commenters] =
    await Promise.all([
      loadContents(manager, items),
      itemIds.length > 0
        ? manager
            .getRepository(ExamAttempt)
            .findBy({ classItemId: In(itemIds) })
        : Promise.resolve([]),
      itemIds.length > 0
        ? manager
            .getRepository(LessonAttempt)
            .findBy({ classItemId: In(itemIds) })
        : Promise.resolve([]),
      loadStudents(manager, classroom.tenantId, enrollments),
      loadUsers(
        manager,
        enrollments.flatMap((row) => row.finalCommentBy ?? []),
      ),
    ]);
  const manualScores = await manualScoresByAttempt(
    manager,
    examAttempts.map((row) => row.id),
  );
  return {
    classroom,
    params: progressParams(classroom, tenant!),
    groups,
    ordered: orderItems(groups, items),
    contents,
    students,
    examAttempts,
    lessonAttempts,
    manualScores,
    commenters,
  };
}

/** Học viên đã rời lớp xuống cuối, còn lại theo tên. */
const byStudentOrder = (
  a: { student: ClassProgressStudent },
  b: { student: ClassProgressStudent },
) =>
  Number(a.student.removed) - Number(b.student.removed) ||
  a.student.fullName.localeCompare(b.student.fullName, 'vi');

/** Bảng chuyên cần: cột là mục đề thi **có deadline** (R11, T1). */
export function attendanceColumns(data: ClassProgressData): AttendanceColumn[] {
  const groupTitleOf = new Map(data.groups.map((row) => [row.id, row.title]));
  const indexes = attemptIndexes(data);
  return data.ordered
    .filter(
      (item) =>
        item.itemType === CurriculumItemType.EXAM &&
        item.deadlineAt !== null &&
        item.removedAt === null,
    )
    .map((item) => ({
      itemId: item.id,
      title: titleOf(data, item),
      label: item.label,
      groupTitle: item.groupId
        ? (groupTitleOf.get(item.groupId) ?? null)
        : null,
      deadlineAt: item.deadlineAt!.toISOString(),
      acceptLate: item.acceptLate,
      attemptIndex: indexes.get(item.id) ?? 1,
    }));
}

export function attendanceRows(
  data: ClassProgressData,
  columns: AttendanceColumn[],
  now: Date,
): AttendanceRow[] {
  const itemById = new Map(data.ordered.map((item) => [item.id, item]));
  return data.students
    .map((student): AttendanceRow => {
      const groupMembers = examGroupsOf(data, student.user.id);
      const cells = columns.map((column): AttendanceCell => {
        const item = itemById.get(column.itemId)!;
        const members = groupMembers.get(rootIdOf(item, data.ordered)) ?? [];
        const attempt =
          members.find((member) => member.itemId === item.id)?.attempt ?? null;
        return {
          itemId: item.id,
          mark: attendanceMarkOf(
            {
              deadlineAt: column.deadlineAt,
              removed: item.removedAt !== null,
              required: isGroupMemberRequired(members, item.id),
              attempt,
            },
            now,
          ),
          startedAt: attempt?.startedAt ?? null,
          submittedAt: attempt?.submittedAt ?? null,
        };
      });
      const rate = attendanceRate(
        cells.map((cell) => cell.mark),
        data.params.lateWeight,
      );
      return {
        student: toProgressStudent(student),
        cells,
        rate,
        belowThreshold: isBelowAttendanceThreshold(
          rate.percent,
          data.params.warningThreshold,
        ),
      };
    })
    .sort(byStudentOrder);
}

/** Chương của lớp để lọc cột bảng điểm; mục chưa xếp chương đứng đầu. */
export function gradebookGroups(data: ClassProgressData): GradebookGroup[] {
  const groups: GradebookGroup[] = data.groups
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({ id: row.id, title: row.title }));
  const hasUngrouped = data.ordered.some(
    (item) => item.groupId === null && item.removedAt === null,
  );
  return hasUngrouped
    ? [{ id: null, title: UNGROUPED_TITLE }, ...groups]
    : groups;
}

export const UNGROUPED_TITLE = 'Chưa xếp chương';

/** Cột bảng điểm: mục bài học và **nhóm thi** (mục gốc + các lần thi lại). */
export function gradebookColumns(data: ClassProgressData): GradebookColumn[] {
  const groupTitleOf = new Map(data.groups.map((row) => [row.id, row.title]));
  const retakesOf = new Map<string, ClassItem[]>();
  for (const item of data.ordered) {
    if (item.itemType !== CurriculumItemType.EXAM || item.removedAt !== null) {
      continue;
    }
    const rootId = rootIdOf(item, data.ordered);
    retakesOf.set(rootId, [...(retakesOf.get(rootId) ?? []), item]);
  }
  return data.ordered.flatMap((item): GradebookColumn[] => {
    if (item.removedAt !== null) return [];
    const base = {
      id: item.id,
      title: titleOf(data, item),
      label: item.label,
      groupId: item.groupId,
      groupTitle: item.groupId
        ? (groupTitleOf.get(item.groupId) ?? null)
        : null,
    };
    if (item.itemType === CurriculumItemType.LESSON) {
      return [
        {
          ...base,
          kind: GradebookColumnKind.LESSON,
          itemIds: [item.id],
          passThreshold: null,
        },
      ];
    }
    // Lần thi lại gộp vào cột của mục gốc.
    const members = retakesOf.get(item.id);
    if (!members || members[0]?.id !== item.id) return [];
    return [
      {
        ...base,
        kind: GradebookColumnKind.EXAM,
        itemIds: members.map((row) => row.id),
        passThreshold: item.passThreshold,
      },
    ];
  });
}

export function gradebookRows(
  data: ClassProgressData,
  columns: GradebookColumn[],
): GradebookRow[] {
  const indexes = attemptIndexes(data);
  return data.students
    .map((student): GradebookRow => {
      const groupMembers = examGroupsOf(data, student.user.id);
      const cells = columns.map((column): GradebookCell => {
        if (column.kind === GradebookColumnKind.LESSON) {
          return lessonCell(data, column.id, student.user.id);
        }
        const members = groupMembers.get(column.id) ?? [];
        const result = examGroupResult(members);
        return {
          kind: GradebookColumnKind.EXAM,
          columnId: column.id,
          percent: result.bestPercent,
          passed: result.passed,
          hasPending: result.hasPending,
          attempts: members.flatMap((member) =>
            member.attempt
              ? [
                  {
                    itemId: member.itemId,
                    attemptIndex: indexes.get(member.itemId) ?? 1,
                    state: member.attempt.state,
                    percent: member.attempt.percent,
                    passed: member.attempt.passed,
                  },
                ]
              : [],
          ),
        };
      });
      return {
        student: toProgressStudent(student),
        cells,
        groupAverages: groupAverages(columns, cells),
        comment: toFinalComment(data, student.enrollment),
      };
    })
    .sort(byStudentOrder);
}

/** Trung bình chương = trung bình điểm các nhóm thi có điểm (giả định 9). */
export function groupAverages(
  columns: GradebookColumn[],
  cells: GradebookCell[],
): GradebookGroupAverage[] {
  const byGroup = new Map<string | null, (number | null)[]>();
  columns.forEach((column, index) => {
    if (column.kind !== GradebookColumnKind.EXAM) return;
    const cell = cells[index];
    const percent =
      cell && cell.kind === GradebookColumnKind.EXAM ? cell.percent : null;
    byGroup.set(column.groupId, [
      ...(byGroup.get(column.groupId) ?? []),
      percent,
    ]);
  });
  return [...byGroup.entries()].map(([groupId, values]) => ({
    groupId,
    percent: averagePercent(values),
  }));
}

/**
 * Kết quả cuối khoá của một học viên (R11.3, T5.3): chuyên cần, trung bình
 * chương và nhận xét. Chỉ gọi khi lớp `finished`.
 */
export function learnerSummary(
  data: ClassProgressData,
  membershipId: string,
  now: Date,
): LearnerClassSummary | null {
  const student = data.students.find(
    (row) => row.enrollment.membershipId === membershipId,
  );
  if (!student) return null;
  const columns = attendanceColumns(data);
  const row = attendanceRows(data, columns, now).find(
    (item) => item.student.membershipId === membershipId,
  );
  if (!row) return null;
  const gradeColumns = gradebookColumns(data);
  const gradeRow = gradebookRows(data, gradeColumns).find(
    (item) => item.student.membershipId === membershipId,
  );
  const titleOfGroup = new Map<string | null, string>([
    [null, UNGROUPED_TITLE],
    ...data.groups.map((group) => [group.id, group.title] as const),
  ]);
  return {
    attendance: row.rate,
    warningThreshold: data.params.warningThreshold,
    belowThreshold: row.belowThreshold,
    attendanceItems: columns.map((column, index): LearnerAttendanceItem => ({
      itemId: column.itemId,
      title: column.title,
      deadlineAt: column.deadlineAt,
      mark: row.cells[index]?.mark ?? AttendanceMark.EXCLUDED,
      startedAt: row.cells[index]?.startedAt ?? null,
    })),
    groupAverages: (gradeRow?.groupAverages ?? []).map((average) => ({
      ...average,
      title: titleOfGroup.get(average.groupId) ?? UNGROUPED_TITLE,
    })),
    finalComment: toFinalComment(data, student.enrollment),
  };
}

// --- Nội bộ -----------------------------------------------------------------

function titleOf(data: ClassProgressData, item: ClassItem): string {
  return item.title ?? data.contents.get(classContentIdOf(item))?.title ?? '';
}

/** Lần thứ mấy trong nhóm thi của từng mục đề thi (1 = mục gốc). */
function attemptIndexes(data: ClassProgressData): Map<string, number> {
  const indexes = new Map<string, number>();
  const counters = new Map<string, number>();
  for (const item of data.ordered) {
    if (item.itemType !== CurriculumItemType.EXAM) continue;
    const rootId = rootIdOf(item, data.ordered);
    const next = (counters.get(rootId) ?? 0) + 1;
    counters.set(rootId, next);
    indexes.set(item.id, next);
  }
  return indexes;
}

/** Nhóm thi của một học viên; bỏ lượt đã "Cho làm lại" (giả định 8). */
function examGroupsOf(
  data: ClassProgressData,
  userId: string,
): Map<string, ExamGroupMember[]> {
  const summaryOf = (item: ClassItem): ClassAttemptSummary | null => {
    const attempt = data.examAttempts.find(
      (row) =>
        row.classItemId === item.id && row.userId === userId && !row.voidedAt,
    );
    return attempt
      ? toAttemptSummary(
          attempt,
          data.manualScores.get(attempt.id) ?? 0,
          item.passThreshold,
        )
      : null;
  };
  return buildExamGroups(data.ordered, summaryOf);
}

/**
 * Mục bài học: `% đúng` các câu tự chấm của **lần nộp gần nhất** (người dùng
 * chốt Step 11: câu chấm tay của bài học thường chưa chấm nên không tính vào
 * %), ✔ khi đã học xong ở bất kỳ version nào (giả định 2).
 */
function lessonCell(
  data: ClassProgressData,
  itemId: string,
  userId: string,
): GradebookCell {
  const attempts = data.lessonAttempts.filter(
    (row) => row.classItemId === itemId && row.userId === userId,
  );
  const latest = attempts
    .filter((row) => row.submittedAt !== null)
    .sort((a, b) => a.submittedAt!.getTime() - b.submittedAt!.getTime())
    .at(-1);
  return {
    kind: GradebookColumnKind.LESSON,
    columnId: itemId,
    percent: latest
      ? autoScorePercent(latest.autoCorrect, latest.autoTotal)
      : null,
    completed: attempts.some((row) => row.completedAt !== null),
    started: attempts.length > 0,
  };
}

function toProgressStudent(row: StudentRow): ClassProgressStudent {
  return {
    membershipId: row.enrollment.membershipId,
    id: row.user.id,
    fullName: row.user.fullName,
    email: row.user.email,
    removed: row.enrollment.removedAt !== null,
    inactive:
      row.membership === null ||
      row.membership.deletedAt !== null ||
      row.membership.status !== MembershipStatus.ACTIVE,
  };
}

function toFinalComment(
  data: ClassProgressData,
  enrollment: ClassroomStudent,
): ClassFinalComment | null {
  const text = enrollment.finalComment ?? null;
  if (text === null) return null;
  const author = enrollment.finalCommentBy
    ? data.commenters.get(enrollment.finalCommentBy)
    : undefined;
  return {
    text,
    updatedAt: (enrollment.finalCommentAt ?? new Date()).toISOString(),
    author: author ? { id: author.id, fullName: author.fullName } : null,
  };
}

async function loadStudents(
  manager: EntityManager,
  tenantId: string,
  enrollments: ClassroomStudent[],
): Promise<StudentRow[]> {
  if (enrollments.length === 0) return [];
  const memberships = await manager.getRepository(Membership).find({
    where: { id: In(enrollments.map((row) => row.membershipId)), tenantId },
    withDeleted: true,
  });
  const users = await loadUsers(
    manager,
    memberships.map((row) => row.userId),
  );
  const membershipById = new Map(memberships.map((row) => [row.id, row]));
  return enrollments.flatMap((enrollment) => {
    const membership = membershipById.get(enrollment.membershipId) ?? null;
    const user = membership ? users.get(membership.userId) : undefined;
    return user ? [{ enrollment, membership, user }] : [];
  });
}

async function loadUsers(
  manager: EntityManager,
  ids: string[],
): Promise<Map<string, User>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const users = await manager
    .getRepository(User)
    .find({ where: { id: In(unique) }, withDeleted: true });
  return new Map(users.map((row) => [row.id, row]));
}
