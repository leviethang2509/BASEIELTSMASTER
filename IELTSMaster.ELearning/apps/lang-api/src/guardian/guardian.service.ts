import {
  AttemptStatus,
  CHILD_FREE_ATTEMPT_LIMIT,
  MembershipStatus,
  QuestionGrading,
  attemptScorePercent,
  type CalendarFeed,
  type ChildClassDetail,
  type ChildExamAttempt,
  type ChildLessonAttempt,
  type ChildManualAnswer,
  type ChildManualAnswers,
  type ChildOverview,
  type GuardianChild,
} from '@lang/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In, IsNull, Not, type EntityManager } from 'typeorm';
import { ExamAttemptAnswer } from '../attempts/exam-attempt-answer.entity';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { manualScoresByAttempt } from '../classrooms/class-activity';
import {
  LearnerClassesService,
  type LearnerViewer,
} from '../classrooms/learner-classes.service';
import type { CalendarRangeQueryDto } from '../classrooms/dto/class-schedule.dto';
import { ExamQuestion } from '../exams/exam-question.entity';
import { ExamSection } from '../exams/exam-section.entity';
import { Exam } from '../exams/exam.entity';
import { LessonAttemptAnswer } from '../lesson-attempts/lesson-attempt-answer.entity';
import { LessonAttempt } from '../lesson-attempts/lesson-attempt.entity';
import { LessonQuestion } from '../lessons/lesson-question.entity';
import { LessonSection } from '../lessons/lesson-section.entity';
import { Lesson } from '../lessons/lesson.entity';
import { Membership } from '../memberships/membership.entity';
import { StudentGuardian } from '../memberships/student-guardian.entity';
import { ClassroomStudent } from '../classrooms/classroom-student.entity';
import type { TenantContext } from '../tenants/tenant-context';
import { User } from '../users/user.entity';

const CHILD_NOT_FOUND = 'Không tìm thấy học viên đã liên kết với bạn';

/** Con đã liên kết, kèm membership và tài khoản để tra cứu tiếp. */
interface ChildRow {
  child: GuardianChild;
  viewer: LearnerViewer;
}

/**
 * Khu vực "Con của tôi" (req-3 Step 13, R19): phụ huynh xem lớp, lịch, giáo
 * trình + trạng thái từng mục và kết quả của con. Mọi route đi qua
 * `loadChild`, chỉ trả học viên có dòng `student_guardians` trỏ tới membership
 * của người gọi — học viên khác trả 404 để không lộ có tồn tại hay không.
 * Phụ huynh không xem nội dung đề/bài học và không làm bài thay con (R19.2).
 */
@Injectable()
export class GuardianService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly classes: LearnerClassesService,
  ) {}

  /** Các con đã liên kết, theo tên. */
  async list(ctx: TenantContext): Promise<GuardianChild[]> {
    const manager = this.dataSource.manager;
    const links = await manager.getRepository(StudentGuardian).findBy({
      tenantId: ctx.tenantId,
      parentMembershipId: ctx.membershipId,
    });
    if (links.length === 0) return [];
    const children = await this.toChildren(manager, ctx, links);
    return children
      .map((row) => row.child)
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
  }

  /** Tổng quan một con: lớp đang học và các lượt làm tự do gần đây. */
  async overview(
    ctx: TenantContext,
    membershipId: string,
  ): Promise<ChildOverview> {
    const manager = this.dataSource.manager;
    const { child, viewer } = await this.loadChild(manager, ctx, membershipId);
    const [classes, examAttempts, lessonAttempts] = await Promise.all([
      this.classes.listFor(ctx, viewer),
      this.freeExamAttempts(manager, ctx, viewer.userId),
      this.freeLessonAttempts(manager, ctx, viewer.userId),
    ]);
    return {
      child,
      classes,
      examAttempts,
      lessonAttempts,
      manualAnswers: await this.manualAnswers(
        manager,
        examAttempts.map((row) => row.id),
        lessonAttempts.map((row) => row.id),
      ),
    };
  }

  /** Trang lớp của con: đúng dữ liệu con thấy, thêm nhận xét chấm tay. */
  async classDetail(
    ctx: TenantContext,
    membershipId: string,
    classroomId: string,
  ): Promise<ChildClassDetail> {
    const manager = this.dataSource.manager;
    const { child, viewer } = await this.loadChild(manager, ctx, membershipId);
    const classroom = await this.classes.detailFor(ctx, viewer, classroomId);
    const items = [
      ...classroom.ungrouped,
      ...classroom.groups.flatMap((group) => group.items),
    ];
    return {
      child,
      classroom,
      manualAnswers: await this.manualAnswers(
        manager,
        items.flatMap((item) => (item.attempt ? [item.attempt.id] : [])),
        items.flatMap((item) =>
          item.lessonAttempt ? [item.lessonAttempt.attemptId] : [],
        ),
      ),
    };
  }

  /** "Lịch học của con": buổi của các lớp con đang học. */
  async schedule(
    ctx: TenantContext,
    membershipId: string,
    range: CalendarRangeQueryDto,
  ): Promise<CalendarFeed> {
    const { viewer } = await this.loadChild(
      this.dataSource.manager,
      ctx,
      membershipId,
    );
    return this.classes.scheduleFor(ctx, viewer.membershipId, range);
  }

  // --- Nội bộ ---------------------------------------------------------------

  /** Con đã liên kết với người gọi; không có liên kết → 404. */
  private async loadChild(
    manager: EntityManager,
    ctx: TenantContext,
    membershipId: string,
  ): Promise<ChildRow> {
    const link = await manager.getRepository(StudentGuardian).findOneBy({
      tenantId: ctx.tenantId,
      parentMembershipId: ctx.membershipId,
      studentMembershipId: membershipId,
    });
    if (!link) throw new NotFoundException(CHILD_NOT_FOUND);
    const [row] = await this.toChildren(manager, ctx, [link]);
    if (!row) throw new NotFoundException(CHILD_NOT_FOUND);
    return row;
  }

  private async toChildren(
    manager: EntityManager,
    ctx: TenantContext,
    links: StudentGuardian[],
  ): Promise<ChildRow[]> {
    const memberships = await manager.getRepository(Membership).findBy({
      id: In(links.map((link) => link.studentMembershipId)),
      tenantId: ctx.tenantId,
    });
    if (memberships.length === 0) return [];
    const [users, enrollments] = await Promise.all([
      manager
        .getRepository(User)
        .findBy({ id: In(memberships.map((row) => row.userId)) }),
      manager.getRepository(ClassroomStudent).findBy({
        membershipId: In(memberships.map((row) => row.id)),
        removedAt: IsNull(),
      }),
    ]);
    const userById = new Map(users.map((row) => [row.id, row]));
    const membershipById = new Map(memberships.map((row) => [row.id, row]));
    return links.flatMap((link): ChildRow[] => {
      const membership = membershipById.get(link.studentMembershipId);
      const user = membership ? userById.get(membership.userId) : undefined;
      if (!membership || !user) return [];
      return [
        {
          child: {
            membershipId: membership.id,
            fullName: user.fullName,
            email: user.email,
            relationship: link.relationship,
            inactive: membership.status !== MembershipStatus.ACTIVE,
            classCount: enrollments.filter(
              (row) => row.membershipId === membership.id,
            ).length,
          },
          viewer: { membershipId: membership.id, userId: user.id },
        },
      ];
    });
  }

  /** Lượt thi ngoài lớp (`class_item_id IS NULL`), mới nhất trước. */
  private async freeExamAttempts(
    manager: EntityManager,
    ctx: TenantContext,
    userId: string,
  ): Promise<ChildExamAttempt[]> {
    const attempts = await manager.getRepository(ExamAttempt).find({
      where: { tenantId: ctx.tenantId, userId, classItemId: IsNull() },
      order: { startedAt: 'DESC' },
      take: CHILD_FREE_ATTEMPT_LIMIT,
    });
    if (attempts.length === 0) return [];
    const [exams, manualScores] = await Promise.all([
      manager
        .getRepository(Exam)
        .findBy({ id: In(attempts.map((row) => row.examId)) }),
      manualScoresByAttempt(
        manager,
        attempts.map((row) => row.id),
      ),
    ]);
    const titleById = new Map(exams.map((row) => [row.id, row.title]));
    return attempts.map((attempt) => ({
      id: attempt.id,
      title: titleById.get(attempt.examId) ?? '',
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      autoCorrect: attempt.autoCorrect,
      autoTotal: attempt.autoTotal,
      manualCount: attempt.manualCount,
      manualGradedCount: attempt.manualGradedCount,
      percent:
        attempt.status === AttemptStatus.GRADED
          ? attemptScorePercent({
              autoCorrect: attempt.autoCorrect,
              autoTotal: attempt.autoTotal,
              manualScore: manualScores.get(attempt.id) ?? 0,
              manualCount: attempt.manualCount,
            })
          : null,
    }));
  }

  /** Lượt học ngoài lớp, mới nhất trước. */
  private async freeLessonAttempts(
    manager: EntityManager,
    ctx: TenantContext,
    userId: string,
  ): Promise<ChildLessonAttempt[]> {
    const attempts = await manager.getRepository(LessonAttempt).find({
      where: { tenantId: ctx.tenantId, userId, classItemId: IsNull() },
      order: { startedAt: 'DESC' },
      take: CHILD_FREE_ATTEMPT_LIMIT,
    });
    if (attempts.length === 0) return [];
    const lessons = await manager
      .getRepository(Lesson)
      .findBy({ id: In(attempts.map((row) => row.lessonId)) });
    const titleById = new Map(lessons.map((row) => [row.id, row.title]));
    return attempts.map((attempt) => ({
      id: attempt.id,
      title: titleById.get(attempt.lessonId) ?? '',
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      completedAt: attempt.completedAt?.toISOString() ?? null,
      autoCorrect: attempt.autoCorrect,
      autoTotal: attempt.autoTotal,
      manualCount: attempt.manualCount,
      manualGradedCount: attempt.manualGradedCount,
    }));
  }

  /**
   * Điểm và nhận xét của các câu chấm tay **đã chấm** theo lượt (R19.1). Câu
   * chấm tự động không có `graded_at` nên không lọt vào đây; đề bài, câu trả
   * lời và đáp án không trả ra (R19.2).
   */
  private async manualAnswers(
    manager: EntityManager,
    examAttemptIds: string[],
    lessonAttemptIds: string[],
  ): Promise<ChildManualAnswers> {
    const [examAnswers, lessonAnswers] = await Promise.all([
      examAttemptIds.length > 0
        ? manager.getRepository(ExamAttemptAnswer).findBy({
            attemptId: In(examAttemptIds),
            gradedAt: Not(IsNull()),
          })
        : Promise.resolve([]),
      lessonAttemptIds.length > 0
        ? manager.getRepository(LessonAttemptAnswer).findBy({
            attemptId: In(lessonAttemptIds),
            gradedAt: Not(IsNull()),
          })
        : Promise.resolve([]),
    ]);
    const [examQuestions, lessonQuestions] = await Promise.all([
      examAnswers.length > 0
        ? manager.getRepository(ExamQuestion).findBy({
            id: In(examAnswers.map((row) => row.questionId)),
            grading: QuestionGrading.MANUAL,
          })
        : Promise.resolve([]),
      lessonAnswers.length > 0
        ? manager.getRepository(LessonQuestion).findBy({
            id: In(lessonAnswers.map((row) => row.questionId)),
            grading: QuestionGrading.MANUAL,
          })
        : Promise.resolve([]),
    ]);
    const [examSections, lessonSections] = await Promise.all([
      examQuestions.length > 0
        ? manager
            .getRepository(ExamSection)
            .findBy({ id: In(examQuestions.map((row) => row.sectionId)) })
        : Promise.resolve([]),
      lessonQuestions.length > 0
        ? manager
            .getRepository(LessonSection)
            .findBy({ id: In(lessonQuestions.map((row) => row.sectionId)) })
        : Promise.resolve([]),
    ]);

    const sectionOf = new Map<string, { name: string; sortOrder: number }>([
      ...examSections.map(
        (row) =>
          [row.id, { name: row.name, sortOrder: row.sortOrder }] as const,
      ),
      ...lessonSections.map(
        (row) =>
          [row.id, { name: row.name, sortOrder: row.sortOrder }] as const,
      ),
    ]);
    const rows = new Map<string, (ChildManualAnswer & { order: number })[]>();
    const add = (
      attemptId: string,
      question:
        { number: number; maxScore: number; sectionId: string } | undefined,
      answer: {
        score: number | null;
        comment: string | null;
        gradedAt: Date | null;
      },
    ) => {
      if (!question) return;
      const section = sectionOf.get(question.sectionId);
      const list = rows.get(attemptId) ?? [];
      list.push({
        sectionName: section?.name ?? '',
        number: question.number,
        score: answer.score,
        maxScore: question.maxScore,
        comment: answer.comment,
        gradedAt: answer.gradedAt?.toISOString() ?? null,
        order: section?.sortOrder ?? 0,
      });
      rows.set(attemptId, list);
    };
    const examQuestionById = new Map(examQuestions.map((row) => [row.id, row]));
    for (const answer of examAnswers) {
      add(answer.attemptId, examQuestionById.get(answer.questionId), answer);
    }
    const lessonQuestionById = new Map(
      lessonQuestions.map((row) => [row.id, row]),
    );
    for (const answer of lessonAnswers) {
      add(answer.attemptId, lessonQuestionById.get(answer.questionId), answer);
    }

    // Theo thứ tự phần trong đề/bài rồi tới số câu (số câu đánh lại từ 1 ở
    // mỗi phần).
    const result: ChildManualAnswers = {};
    for (const [attemptId, list] of rows) {
      result[attemptId] = list
        .sort((a, b) => a.order - b.order || a.number - b.number)
        .map(({ order: _order, ...answer }) => answer);
    }
    return result;
  }
}
