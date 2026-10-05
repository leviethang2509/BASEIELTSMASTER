import {
  AttemptStatus,
  ClassAttemptState,
  ClassItemLock,
  ClassSessionStatus,
  ClassroomStatus,
  CurriculumItemType,
  attemptScorePercent,
  classItemLock,
  effectiveOpensAt,
  examGroupResult,
  isGroupMemberRequired,
  type CalendarFeed,
  type ClassAttemptSummary,
  type ExamGroupMember,
  type ExamUserRef,
  type LearnerClassDetail,
  type LearnerClassGroupView,
  type LearnerClassItem,
  type LearnerClassItemView,
  type LearnerExamGroupView,
  type LearnerSessionRef,
  type StartClassItemResult,
} from '@lang/shared';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DataSource,
  In,
  IsNull,
  MoreThanOrEqual,
  type EntityManager,
} from 'typeorm';
import { AttemptsService } from '../attempts/attempts.service';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { bySortOrder, toUserRef } from '../exams/exam.mapper';
import { LessonAttempt } from '../lesson-attempts/lesson-attempt.entity';
import { LessonAttemptsService } from '../lesson-attempts/lesson-attempts.service';
import { Membership } from '../memberships/membership.entity';
import type { TenantContext } from '../tenants/tenant-context';
import { Course } from '../training/course.entity';
import { toCourseRef } from '../training/training.mapper';
import { User } from '../users/user.entity';
import { manualScoresByAttempt } from './class-activity';
import { learnerSummary, loadClassProgress } from './class-progress';
import { loadContents, type ClassContentRow } from './class-curriculum.service';
import { ClassGroup } from './class-group.entity';
import { ClassItem } from './class-item.entity';
import { ClassSessionLink } from './class-session-link.entity';
import { ClassSession } from './class-session.entity';
import { CLASSROOM_NOT_FOUND } from './classroom-access';
import { ClassroomStudent } from './classroom-student.entity';
import { ClassroomTeacher } from './classroom-teacher.entity';
import { Classroom } from './classroom.entity';
import { classContentIdOf, toClassroomRef } from './classroom.mapper';
import type { CalendarRangeQueryDto } from './dto/class-schedule.dto';
import { ScheduleFeedService } from './schedule-feed.service';

const ITEM_NOT_FOUND = 'Không tìm thấy mục này trong giáo trình lớp';

/** Thông báo cho từng lý do mục chưa vào được (`classItemLock`). */
const LOCK_MESSAGES: Record<ClassItemLock, string> = {
  [ClassItemLock.CLASSROOM]:
    'Lớp học chưa bắt đầu hoặc đã kết thúc, không vào mục này được',
  [ClassItemLock.NOT_OPEN]: 'Mục này chưa tới ngày mở',
  [ClassItemLock.DEADLINE]: 'Đã quá hạn và mục này không nhận bài quá hạn',
  [ClassItemLock.DONE]:
    'Bạn đã làm bài này rồi. Mỗi bài kiểm tra/bài thi chỉ làm một lần',
  [ClassItemLock.CONTENT]: 'Bài học/đề thi của mục này không còn',
};

/** Số buổi sắp tới hiện trên trang lớp của học viên. */
const UPCOMING_SESSION_LIMIT = 5;

interface Enrollment {
  classroom: Classroom;
  student: ClassroomStudent;
}

/**
 * Người mà dữ liệu nói về: chính học viên đang đăng nhập, hoặc con của phụ
 * huynh (Step 13) – khi đó `membershipId`/`userId` là của con, còn quyền đã
 * được `GuardianService` kiểm trước bằng `student_guardians`.
 */
export interface LearnerViewer {
  membershipId: string;
  userId: string;
}

/**
 * Khu vực học viên trong lớp (req-3 Step 9): lớp của tôi, giáo trình lớp kèm
 * trạng thái từng mục, bắt đầu mục và lịch học của tôi. Chỉ thấy lớp mà mình
 * còn là học viên (`classroom_students.removed_at IS NULL`); lớp `ongoing` mới
 * vào học/làm bài được (giả định 3).
 */
@Injectable()
export class LearnerClassesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly attempts: AttemptsService,
    private readonly lessonAttempts: LessonAttemptsService,
    private readonly feeds: ScheduleFeedService,
  ) {}

  /** Lớp tôi đang học, lớp đang học trước rồi sắp mở, đã kết thúc, đã huỷ. */
  list(ctx: TenantContext, userId: string): Promise<LearnerClassItem[]> {
    return this.listFor(ctx, { membershipId: ctx.membershipId, userId });
  }

  /** Như `list` nhưng cho một học viên bất kỳ (phụ huynh xem lớp của con). */
  async listFor(
    ctx: TenantContext,
    viewer: LearnerViewer,
  ): Promise<LearnerClassItem[]> {
    const manager = this.dataSource.manager;
    const rows = await manager.getRepository(ClassroomStudent).findBy({
      membershipId: viewer.membershipId,
      removedAt: IsNull(),
    });
    if (rows.length === 0) return [];
    const classrooms = await manager.getRepository(Classroom).findBy({
      id: In(rows.map((row) => row.classroomId)),
      tenantId: ctx.tenantId,
    });
    if (classrooms.length === 0) return [];
    const classroomIds = classrooms.map((row) => row.id);
    const items = await manager
      .getRepository(ClassItem)
      .findBy({ classroomId: In(classroomIds), removedAt: IsNull() });
    const [base, progress] = await Promise.all([
      this.baseItems(manager, classrooms),
      this.myProgress(manager, viewer.userId, items),
    ]);
    return classrooms
      .map((classroom) => {
        const mine = items.filter((item) => item.classroomId === classroom.id);
        return {
          ...base.get(classroom.id)!,
          itemCount: mine.length,
          doneCount: mine.filter((item) => progress.isDone(item)).length,
        };
      })
      .sort(byClassroomOrder);
  }

  detail(
    ctx: TenantContext,
    userId: string,
    classroomId: string,
  ): Promise<LearnerClassDetail> {
    return this.detailFor(
      ctx,
      { membershipId: ctx.membershipId, userId },
      classroomId,
    );
  }

  /** Như `detail` nhưng cho một học viên bất kỳ (phụ huynh xem lớp của con). */
  async detailFor(
    ctx: TenantContext,
    viewer: LearnerViewer,
    classroomId: string,
  ): Promise<LearnerClassDetail> {
    const manager = this.dataSource.manager;
    const { classroom } = await this.enrollment(
      manager,
      ctx,
      viewer.membershipId,
      classroomId,
    );
    const now = new Date();
    const [groups, items] = await Promise.all([
      manager.getRepository(ClassGroup).findBy({ classroomId }),
      manager
        .getRepository(ClassItem)
        .findBy({ classroomId, removedAt: IsNull() }),
    ]);
    const [base, contents, progress, links, upcoming, summary] =
      await Promise.all([
        this.baseItems(manager, [classroom]),
        loadContents(manager, items),
        this.myProgress(manager, viewer.userId, items),
        this.sessionLinks(manager, classroom),
        this.upcomingSessions(manager, classroom, now),
        // Chuyên cần, trung bình chương, nhận xét: chỉ khi lớp đã kết thúc
        // (R11.3–4; lớp đã huỷ không tổng kết – giả định 3).
        classroom.status === ClassroomStatus.FINISHED
          ? loadClassProgress(manager, classroom).then((data) =>
              learnerSummary(data, viewer.membershipId, now),
            )
          : Promise.resolve(null),
      ]);

    // Nhóm thi: mục gốc + các lần thi lại, theo thứ tự trong giáo trình.
    const ordered = orderItems(groups, items);
    const groupMembers = buildExamGroups(ordered, (item) =>
      progress.examAttempt(item),
    );
    const view = (item: ClassItem): LearnerClassItemView => {
      const group = groups.find((row) => row.id === item.groupId) ?? null;
      const content = contents.get(classContentIdOf(item))!;
      const members = groupMembers.get(rootIdOf(item, items)) ?? [];
      const opensAt = effectiveOpensAt(
        group?.opensAt?.toISOString() ?? null,
        item.opensAt?.toISOString() ?? null,
      );
      const attempt = progress.examAttempt(item);
      const lessonAttempt = progress.lessonAttempt(item, content);
      return {
        id: item.id,
        itemType: item.itemType,
        title: item.title ?? content.title,
        label: item.label,
        note: item.note,
        content: {
          id: content.id,
          title: content.title,
          status: content.status,
        },
        opensAt,
        deadlineAt: item.deadlineAt?.toISOString() ?? null,
        acceptLate: item.acceptLate,
        passThreshold: item.passThreshold,
        retakeOfItemId: item.retakeOfItemId,
        attemptIndex:
          item.itemType === CurriculumItemType.EXAM
            ? Math.max(
                1,
                members.findIndex((member) => member.itemId === item.id) + 1,
              )
            : null,
        required:
          item.itemType === CurriculumItemType.EXAM
            ? isGroupMemberRequired(members, item.id)
            : true,
        lock: classItemLock(
          {
            classroomStatus: classroom.status,
            itemType: item.itemType,
            opensAt,
            deadlineAt: item.deadlineAt?.toISOString() ?? null,
            acceptLate: item.acceptLate,
            hasAttempt: attempt !== null,
            contentAvailable: !content.deleted,
          },
          now,
        ),
        sessions: links.get(item.id) ?? links.get(item.groupId ?? '') ?? [],
        attempt,
        lessonAttempt,
        lessonCompletedAt: progress.lessonCompletedAt(item),
      };
    };
    const inGroup = (groupId: string | null) =>
      items
        .filter((item) => item.groupId === groupId)
        .sort(bySortOrder)
        .map(view);

    return {
      ...base.get(classroom.id)!,
      itemCount: items.length,
      doneCount: items.filter((item) => progress.isDone(item)).length,
      description: classroom.description,
      isOpen: classroom.status === ClassroomStatus.ONGOING,
      ungrouped: inGroup(null),
      groups: groups.sort(bySortOrder).map((group): LearnerClassGroupView => ({
        id: group.id,
        title: group.title,
        opensAt: group.opensAt?.toISOString() ?? null,
        items: inGroup(group.id),
      })),
      examGroups: [...groupMembers.entries()]
        .filter(([, members]) => members.length > 1)
        .map(([rootId, members]): LearnerExamGroupView => {
          const root = items.find((item) => item.id === rootId);
          return {
            rootItemId: rootId,
            title:
              root?.title ??
              contents.get(root ? classContentIdOf(root) : '')?.title ??
              '',
            itemIds: members.map((member) => member.itemId),
            ...examGroupResult(members),
          };
        }),
      upcomingSessions: upcoming,
      summary,
    };
  }

  /**
   * Bắt đầu (hoặc mở lại) một mục của giáo trình lớp. Khoá dòng lớp để trạng
   * thái lớp và mục không đổi giữa chừng; mục đề thi chỉ tạo lượt mới khi chưa
   * có lượt nào chưa bị "Cho làm lại" (R10.5).
   */
  async startItem(
    ctx: TenantContext,
    userId: string,
    classroomId: string,
    itemId: string,
  ): Promise<StartClassItemResult> {
    const now = new Date();
    return this.dataSource.transaction(async (manager) => {
      const { classroom } = await this.enrollment(
        manager,
        ctx,
        ctx.membershipId,
        classroomId,
        true,
      );
      const item = await manager
        .getRepository(ClassItem)
        .findOneBy({ id: itemId, classroomId });
      if (!item || item.removedAt) {
        throw new NotFoundException(ITEM_NOT_FOUND);
      }
      const [group, contents, hasAttempt] = await Promise.all([
        item.groupId
          ? manager.getRepository(ClassGroup).findOneBy({ id: item.groupId })
          : Promise.resolve(null),
        loadContents(manager, [item]),
        item.itemType === CurriculumItemType.EXAM
          ? manager.getRepository(ExamAttempt).existsBy({
              classItemId: itemId,
              userId,
              voidedAt: IsNull(),
            })
          : Promise.resolve(false),
      ]);
      const content = contents.get(classContentIdOf(item));
      const lock = classItemLock(
        {
          classroomStatus: classroom.status,
          itemType: item.itemType,
          opensAt: effectiveOpensAt(
            group?.opensAt?.toISOString() ?? null,
            item.opensAt?.toISOString() ?? null,
          ),
          deadlineAt: item.deadlineAt?.toISOString() ?? null,
          acceptLate: item.acceptLate,
          hasAttempt,
          contentAvailable: !!content && !content.deleted,
        },
        now,
      );
      if (lock) throw new ConflictException(LOCK_MESSAGES[lock]);

      const attemptId =
        item.itemType === CurriculumItemType.EXAM
          ? await this.attempts.createForClassItem(
              manager,
              ctx,
              userId,
              item.examId!,
              item.id,
              now,
            )
          : await this.lessonAttempts.startForClassItem(
              manager,
              ctx,
              userId,
              item.lessonId!,
              item.id,
            );
      return { itemType: item.itemType, attemptId };
    });
  }

  /** "Lịch học của tôi": buổi của các lớp mình đang học (R16). */
  schedule(
    ctx: TenantContext,
    range: CalendarRangeQueryDto,
  ): Promise<CalendarFeed> {
    return this.scheduleFor(ctx, ctx.membershipId, range);
  }

  /** Lịch của một học viên bất kỳ (phụ huynh xem lịch học của con). */
  async scheduleFor(
    ctx: TenantContext,
    membershipId: string,
    range: CalendarRangeQueryDto,
  ): Promise<CalendarFeed> {
    const rows = await this.dataSource.manager
      .getRepository(ClassroomStudent)
      .findBy({ membershipId, removedAt: IsNull() });
    return this.feeds.forClassrooms(
      ctx,
      range,
      rows.map((row) => row.classroomId),
    );
  }

  // --- Nội bộ ---------------------------------------------------------------

  /** Lớp của tenant mà học viên còn theo học; không thì 404 (giấu lớp khác). */
  private async enrollment(
    manager: EntityManager,
    ctx: TenantContext,
    membershipId: string,
    classroomId: string,
    lock = false,
  ): Promise<Enrollment> {
    const classroom = await manager.getRepository(Classroom).findOne({
      where: { id: classroomId, tenantId: ctx.tenantId },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!classroom) throw new NotFoundException(CLASSROOM_NOT_FOUND);
    const student = await manager.getRepository(ClassroomStudent).findOneBy({
      classroomId,
      membershipId,
      removedAt: IsNull(),
    });
    if (!student) throw new NotFoundException(CLASSROOM_NOT_FOUND);
    return { classroom, student };
  }

  /** Phần chung của thẻ lớp: khoá học, giáo viên, sĩ số, buổi kế tiếp. */
  private async baseItems(
    manager: EntityManager,
    classrooms: Classroom[],
  ): Promise<Map<string, LearnerClassItem>> {
    const ids = classrooms.map((row) => row.id);
    const [courses, teacherRows, studentRows, sessions] = await Promise.all([
      manager
        .getRepository(Course)
        .findBy({ id: In(classrooms.map((row) => row.courseId)) }),
      manager.getRepository(ClassroomTeacher).findBy({ classroomId: In(ids) }),
      manager
        .getRepository(ClassroomStudent)
        .findBy({ classroomId: In(ids), removedAt: IsNull() }),
      manager.getRepository(ClassSession).findBy({
        classroomId: In(ids),
        status: ClassSessionStatus.SCHEDULED,
        startsAt: MoreThanOrEqual(new Date()),
      }),
    ]);
    const teacherRefs = await this.userRefs(
      manager,
      teacherRows.map((row) => row.membershipId),
    );
    const courseById = new Map(courses.map((row) => [row.id, row]));
    return new Map(
      classrooms.map((classroom) => {
        const next = sessions
          .filter((session) => session.classroomId === classroom.id)
          .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
        return [
          classroom.id,
          {
            ...toClassroomRef(classroom),
            course: toCourseRef(courseById.get(classroom.courseId)!),
            startDate: classroom.startDate,
            endDate: classroom.endDate,
            location: classroom.location,
            teachers: teacherRows
              .filter((row) => row.classroomId === classroom.id)
              .flatMap((row) => teacherRefs.get(row.membershipId) ?? []),
            studentCount: studentRows.filter(
              (row) => row.classroomId === classroom.id,
            ).length,
            itemCount: 0,
            doneCount: 0,
            nextSession: next ? toSessionRef(next, classroom) : null,
          },
        ];
      }),
    );
  }

  private async userRefs(manager: EntityManager, membershipIds: string[]) {
    if (membershipIds.length === 0) return new Map<string, ExamUserRef[]>();
    const memberships = await manager
      .getRepository(Membership)
      .findBy({ id: In([...new Set(membershipIds)]) });
    const users = await manager
      .getRepository(User)
      .findBy({ id: In(memberships.map((row) => row.userId)) });
    const userById = new Map(users.map((row) => [row.id, row]));
    return new Map(
      memberships.map((membership) => {
        const ref = toUserRef(userById.get(membership.userId));
        return [membership.id, ref ? [ref] : []];
      }),
    );
  }

  /** Mục/chương của giáo trình lớp → các buổi có map (R17). */
  private async sessionLinks(
    manager: EntityManager,
    classroom: Classroom,
  ): Promise<Map<string, LearnerSessionRef[]>> {
    const sessions = await manager
      .getRepository(ClassSession)
      .findBy({ classroomId: classroom.id });
    if (sessions.length === 0) return new Map();
    const links = await manager
      .getRepository(ClassSessionLink)
      .findBy({ sessionId: In(sessions.map((row) => row.id)) });
    const sessionById = new Map(sessions.map((row) => [row.id, row]));
    const result = new Map<string, LearnerSessionRef[]>();
    for (const link of links.sort(
      (a, b) =>
        sessionById.get(a.sessionId)!.startsAt.getTime() -
        sessionById.get(b.sessionId)!.startsAt.getTime(),
    )) {
      const key = link.classItemId ?? link.classGroupId;
      if (!key) continue;
      const list = result.get(key) ?? [];
      list.push(toSessionRef(sessionById.get(link.sessionId)!, classroom));
      result.set(key, list);
    }
    return result;
  }

  private async upcomingSessions(
    manager: EntityManager,
    classroom: Classroom,
    now: Date,
  ): Promise<LearnerSessionRef[]> {
    const sessions = await manager.getRepository(ClassSession).findBy({
      classroomId: classroom.id,
      status: ClassSessionStatus.SCHEDULED,
      startsAt: MoreThanOrEqual(now),
    });
    return sessions
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .slice(0, UPCOMING_SESSION_LIMIT)
      .map((session) => toSessionRef(session, classroom));
  }

  /** Lượt thi/lượt học của tôi trên các mục đang xét. */
  private async myProgress(
    manager: EntityManager,
    userId: string,
    items: ClassItem[],
  ): Promise<MyProgress> {
    const itemIds = items.map((item) => item.id);
    if (itemIds.length === 0) return new MyProgress([], [], new Map());
    const [examAttempts, lessonAttempts] = await Promise.all([
      manager.getRepository(ExamAttempt).findBy({
        classItemId: In(itemIds),
        userId,
        voidedAt: IsNull(),
      }),
      manager
        .getRepository(LessonAttempt)
        .findBy({ classItemId: In(itemIds), userId }),
    ]);
    const manualScores = await manualScoresByAttempt(
      manager,
      examAttempts.map((row) => row.id),
    );
    return new MyProgress(examAttempts, lessonAttempts, manualScores);
  }
}

/** Lượt của học viên trên các mục lớp, tra theo mục. */
class MyProgress {
  constructor(
    private readonly exams: ExamAttempt[],
    private readonly lessons: LessonAttempt[],
    private readonly manualScores: Map<string, number>,
  ) {}

  /** Mục đề thi: lượt duy nhất chưa bị "Cho làm lại". */
  examAttempt(item: ClassItem): ClassAttemptSummary | null {
    if (item.itemType !== CurriculumItemType.EXAM) return null;
    const attempt = this.exams.find((row) => row.classItemId === item.id);
    if (!attempt) return null;
    return toAttemptSummary(
      attempt,
      this.manualScores.get(attempt.id) ?? 0,
      item.passThreshold,
    );
  }

  /** Mục bài học: lượt trên version hiện tại của bài (giả định 2). */
  lessonAttempt(item: ClassItem, content: ClassContentRow) {
    if (item.itemType !== CurriculumItemType.LESSON) return null;
    const attempt = this.lessons.find(
      (row) =>
        row.classItemId === item.id &&
        row.lessonVersion === content.currentVersion,
    );
    return attempt
      ? {
          attemptId: attempt.id,
          status: attempt.status,
          completedAt: attempt.completedAt?.toISOString() ?? null,
        }
      : null;
  }

  /** Học xong ở bất kỳ version nào: lần sớm nhất (giả định 2). */
  lessonCompletedAt(item: ClassItem): string | null {
    const done = this.lessons
      .filter((row) => row.classItemId === item.id && row.completedAt)
      .map((row) => row.completedAt!.getTime());
    return done.length > 0 ? new Date(Math.min(...done)).toISOString() : null;
  }

  /** Mục đã xong: bài học đã học xong, đề thi đã nộp hết. */
  isDone(item: ClassItem): boolean {
    if (item.itemType === CurriculumItemType.LESSON) {
      return this.lessonCompletedAt(item) !== null;
    }
    const attempt = this.exams.find((row) => row.classItemId === item.id);
    return !!attempt && attempt.status !== AttemptStatus.IN_PROGRESS;
  }
}

export function toAttemptSummary(
  attempt: ExamAttempt,
  manualScore: number,
  passThreshold: number,
): ClassAttemptSummary {
  const state =
    attempt.status === AttemptStatus.IN_PROGRESS
      ? ClassAttemptState.IN_PROGRESS
      : attempt.status === AttemptStatus.GRADED
        ? ClassAttemptState.GRADED
        : ClassAttemptState.PENDING_GRADING;
  const percent =
    state === ClassAttemptState.GRADED
      ? attemptScorePercent({
          autoCorrect: attempt.autoCorrect,
          autoTotal: attempt.autoTotal,
          manualScore,
          manualCount: attempt.manualCount,
        })
      : null;
  return {
    id: attempt.id,
    state,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    percent,
    passed: percent === null ? null : percent >= passThreshold,
  };
}

function toSessionRef(
  session: ClassSession,
  classroom: Classroom,
): LearnerSessionRef {
  return {
    id: session.id,
    kind: session.kind,
    seq: session.seq,
    startsAt: session.startsAt.toISOString(),
    endsAt: session.endsAt.toISOString(),
    status: session.status,
    location: session.location ?? classroom.location,
  };
}

/** Mục theo thứ tự hiển thị: chưa xếp chương trước, rồi từng chương. */
export function orderItems(
  groups: ClassGroup[],
  items: ClassItem[],
): ClassItem[] {
  const inGroup = (groupId: string | null) =>
    items.filter((item) => item.groupId === groupId).sort(bySortOrder);
  return [
    ...inGroup(null),
    ...groups.sort(bySortOrder).flatMap((group) => inGroup(group.id)),
  ];
}

/** Mục gốc của nhóm thi (chính nó nếu không phải lần thi lại). */
export function rootIdOf(item: ClassItem, items: ClassItem[]): string {
  if (!item.retakeOfItemId) return item.id;
  return items.some((row) => row.id === item.retakeOfItemId)
    ? item.retakeOfItemId
    : item.id;
}

/**
 * Nhóm thi theo mục gốc: mục gốc đứng đầu rồi các lần thi lại theo thứ tự
 * giáo trình (giả định 7).
 */
export function buildExamGroups(
  ordered: ClassItem[],
  attemptOf: (item: ClassItem) => ClassAttemptSummary | null,
): Map<string, ExamGroupMember[]> {
  const groups = new Map<string, ExamGroupMember[]>();
  for (const item of ordered) {
    if (item.itemType !== CurriculumItemType.EXAM) continue;
    const rootId = rootIdOf(item, ordered);
    const members = groups.get(rootId) ?? [];
    members.push({
      itemId: item.id,
      passThreshold: item.passThreshold,
      attempt: attemptOf(item),
    });
    groups.set(rootId, members);
  }
  return groups;
}

const STATUS_ORDER: Record<ClassroomStatus, number> = {
  [ClassroomStatus.ONGOING]: 0,
  [ClassroomStatus.UPCOMING]: 1,
  [ClassroomStatus.FINISHED]: 2,
  [ClassroomStatus.CANCELLED]: 3,
};

const byClassroomOrder = (a: LearnerClassItem, b: LearnerClassItem) =>
  STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
  b.startDate.localeCompare(a.startDate) ||
  a.code.localeCompare(b.code);
