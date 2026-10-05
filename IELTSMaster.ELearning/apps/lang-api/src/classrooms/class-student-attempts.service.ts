import {
  AttemptStatus,
  CurriculumItemType,
  attemptScorePercent,
  effectiveOpensAt,
  examGroupResult,
  isGroupMemberRequired,
  type AttemptReview,
  type AttemptReviewSection,
  type ClassStudentAttemptRow,
  type ClassStudentAttempts,
  type ClassStudentItemView,
  type ClassStudentLessonRow,
  type LearnerExamGroupView,
} from '@lang/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In, type EntityManager } from 'typeorm';
import { examSectionReview } from '../attempts/attempt-review';
import { ExamAttemptAnswer } from '../attempts/exam-attempt-answer.entity';
import { ExamAttemptSection } from '../attempts/exam-attempt-section.entity';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { ExamQuestion } from '../exams/exam-question.entity';
import { ExamSection } from '../exams/exam-section.entity';
import { bySortOrder } from '../exams/exam.mapper';
import { LessonAttemptAnswer } from '../lesson-attempts/lesson-attempt-answer.entity';
import { LessonAttemptSection } from '../lesson-attempts/lesson-attempt-section.entity';
import { LessonAttempt } from '../lesson-attempts/lesson-attempt.entity';
import { toSectionView } from '../lesson-attempts/lesson-attempts.service';
import { LessonQuestion } from '../lessons/lesson-question.entity';
import { LessonSection } from '../lessons/lesson-section.entity';
import { Membership } from '../memberships/membership.entity';
import { R2Service } from '../storage/r2.service';
import type { TenantContext } from '../tenants/tenant-context';
import { User } from '../users/user.entity';
import { manualScoresByAttempt } from './class-activity';
import { loadContents } from './class-curriculum.service';
import { ClassGroup } from './class-group.entity';
import { ClassItem } from './class-item.entity';
import {
  buildExamGroups,
  orderItems,
  rootIdOf,
  toAttemptSummary,
} from './learner-classes.service';
import { loadClassroomAccess } from './classroom-access';
import { ClassroomStudent } from './classroom-student.entity';
import { classContentIdOf, toClassroomRef } from './classroom.mapper';

const STUDENT_NOT_FOUND = 'Không tìm thấy học viên này trong lớp';
const ATTEMPT_NOT_FOUND = 'Không tìm thấy bài làm của học viên trong lớp này';
const RECORDING_NOT_FOUND = 'Không tìm thấy bản ghi âm';

/**
 * Bài làm chi tiết của một học viên trong lớp (req-3 Step 10, F4): giáo viên
 * của lớp và Owner/Admin xem được đáp án học viên chọn và đúng/sai từng câu.
 * Khác trang Chấm bài: xem **mọi** mục của học viên (kể cả lượt đã "Cho làm
 * lại" và mục đã bỏ khỏi giáo trình), không sửa điểm ở đây.
 */
@Injectable()
export class ClassStudentAttemptsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly r2: R2Service,
  ) {}

  async listForStudent(
    ctx: TenantContext,
    classroomId: string,
    membershipId: string,
  ): Promise<ClassStudentAttempts> {
    const manager = this.dataSource.manager;
    const { classroom } = await loadClassroomAccess(manager, ctx, classroomId);
    const student = await this.student(manager, classroomId, membershipId);
    const [groups, items] = await Promise.all([
      manager.getRepository(ClassGroup).findBy({ classroomId }),
      manager.getRepository(ClassItem).findBy({ classroomId }),
    ]);
    const [contents, exams, lessons] = await Promise.all([
      loadContents(manager, items),
      items.length > 0
        ? manager.getRepository(ExamAttempt).findBy({
            classItemId: In(items.map((item) => item.id)),
            userId: student.user.id,
          })
        : Promise.resolve([]),
      items.length > 0
        ? manager.getRepository(LessonAttempt).findBy({
            classItemId: In(items.map((item) => item.id)),
            userId: student.user.id,
          })
        : Promise.resolve([]),
    ]);
    const manualScores = await manualScoresByAttempt(
      manager,
      exams.map((row) => row.id),
    );

    // Nhóm thi tính trên lượt còn hiệu lực (bỏ lượt đã "Cho làm lại").
    const currentOf = (item: ClassItem) =>
      exams.find((row) => row.classItemId === item.id && !row.voidedAt) ?? null;
    const summaryOf = (item: ClassItem) => {
      const attempt = currentOf(item);
      return attempt
        ? toAttemptSummary(
            attempt,
            manualScores.get(attempt.id) ?? 0,
            item.passThreshold,
          )
        : null;
    };
    const ordered = orderItems(groups, items);
    const groupMembers = buildExamGroups(ordered, summaryOf);
    const groupTitleOf = new Map(groups.map((row) => [row.id, row.title]));

    const view = (item: ClassItem): ClassStudentItemView => {
      const members = groupMembers.get(rootIdOf(item, items)) ?? [];
      const isExam = item.itemType === CurriculumItemType.EXAM;
      const group = groups.find((row) => row.id === item.groupId) ?? null;
      const lesson = lessons.find((row) => row.classItemId === item.id);
      return {
        id: item.id,
        itemType: item.itemType,
        title: item.title ?? contents.get(classContentIdOf(item))?.title ?? '',
        label: item.label,
        groupTitle: item.groupId
          ? (groupTitleOf.get(item.groupId) ?? null)
          : null,
        opensAt: effectiveOpensAt(
          group?.opensAt?.toISOString() ?? null,
          item.opensAt?.toISOString() ?? null,
        ),
        deadlineAt: item.deadlineAt?.toISOString() ?? null,
        passThreshold: item.passThreshold,
        attemptIndex: isExam
          ? Math.max(
              1,
              members.findIndex((member) => member.itemId === item.id) + 1,
            )
          : null,
        required: isExam ? isGroupMemberRequired(members, item.id) : true,
        removed: item.removedAt !== null,
        attempts: isExam
          ? exams
              .filter((row) => row.classItemId === item.id)
              .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
              .map((attempt): ClassStudentAttemptRow => {
                const summary = toAttemptSummary(
                  attempt,
                  manualScores.get(attempt.id) ?? 0,
                  item.passThreshold,
                );
                return {
                  ...summary,
                  voidedAt: attempt.voidedAt?.toISOString() ?? null,
                  canReview: attempt.status !== AttemptStatus.IN_PROGRESS,
                };
              })
          : [],
        lessonAttempt: lesson ? toLessonRow(lesson) : null,
      };
    };

    // Mục đã bỏ khỏi giáo trình chỉ hiện khi học viên còn bài làm ở đó (E3).
    const shown = ordered.filter(
      (item) =>
        item.removedAt === null ||
        exams.some((row) => row.classItemId === item.id) ||
        lessons.some((row) => row.classItemId === item.id),
    );
    return {
      classroom: toClassroomRef(classroom),
      student: {
        membershipId,
        id: student.user.id,
        fullName: student.user.fullName,
        email: student.user.email,
      },
      removed: student.enrollment.removedAt !== null,
      items: shown.map(view),
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
    };
  }

  /** Bài thi của học viên: nội dung, câu trả lời, đúng/sai, đáp án. */
  async examReview(
    ctx: TenantContext,
    classroomId: string,
    membershipId: string,
    attemptId: string,
  ): Promise<AttemptReview> {
    const manager = this.dataSource.manager;
    const { attempt, item, student } = await this.findExamAttempt(
      ctx,
      classroomId,
      membershipId,
      attemptId,
    );
    const attemptSections = (
      await manager
        .getRepository(ExamAttemptSection)
        .findBy({ attemptId: attempt.id })
    ).sort(bySortOrder);
    const sectionIds = attemptSections.map((section) => section.sectionId);
    const [examSections, questions, answers, contents, manualScores] =
      await Promise.all([
        sectionIds.length > 0
          ? manager.getRepository(ExamSection).findBy({ id: In(sectionIds) })
          : Promise.resolve([]),
        sectionIds.length > 0
          ? manager
              .getRepository(ExamQuestion)
              .findBy({ sectionId: In(sectionIds) })
          : Promise.resolve([]),
        manager
          .getRepository(ExamAttemptAnswer)
          .findBy({ attemptId: attempt.id }),
        loadContents(manager, [item]),
        manualScoresByAttempt(manager, [attempt.id]),
      ]);
    const examSectionById = new Map(examSections.map((row) => [row.id, row]));
    const sections: AttemptReviewSection[] = attemptSections.flatMap(
      (section) => {
        const examSection = examSectionById.get(section.sectionId);
        if (!examSection) return [];
        return [
          examSectionReview(
            section,
            examSection,
            questions
              .filter((question) => question.sectionId === section.sectionId)
              .sort((a, b) => a.number - b.number),
            answers,
          ),
        ];
      },
    );
    const percent =
      attempt.status === AttemptStatus.GRADED
        ? attemptScorePercent({
            autoCorrect: attempt.autoCorrect,
            autoTotal: attempt.autoTotal,
            manualScore: manualScores.get(attempt.id) ?? 0,
            manualCount: attempt.manualCount,
          })
        : null;
    return {
      id: attempt.id,
      itemType: CurriculumItemType.EXAM,
      title: contents.get(classContentIdOf(item))?.title ?? '',
      itemTitle:
        item.title ?? contents.get(classContentIdOf(item))?.title ?? '',
      student,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      percent,
      passed: percent === null ? null : percent >= item.passThreshold,
      voidedAt: attempt.voidedAt?.toISOString() ?? null,
      autoCorrect: attempt.autoCorrect,
      autoTotal: attempt.autoTotal,
      manualCount: attempt.manualCount,
      manualGradedCount: attempt.manualGradedCount,
      sections,
    };
  }

  /** Lượt học của học viên: lần nộp gần nhất của từng phần. */
  async lessonReview(
    ctx: TenantContext,
    classroomId: string,
    membershipId: string,
    attemptId: string,
  ): Promise<AttemptReview> {
    const manager = this.dataSource.manager;
    const { attempt, item, student } = await this.findLessonAttempt(
      ctx,
      classroomId,
      membershipId,
      attemptId,
    );
    const attemptSections = (
      await manager
        .getRepository(LessonAttemptSection)
        .findBy({ attemptId: attempt.id })
    ).sort(bySortOrder);
    const sectionIds = attemptSections.map((section) => section.sectionId);
    const [lessonSections, questions, answers, contents] = await Promise.all([
      sectionIds.length > 0
        ? manager.getRepository(LessonSection).findBy({ id: In(sectionIds) })
        : Promise.resolve([]),
      sectionIds.length > 0
        ? manager
            .getRepository(LessonQuestion)
            .findBy({ sectionId: In(sectionIds) })
        : Promise.resolve([]),
      manager
        .getRepository(LessonAttemptAnswer)
        .findBy({ attemptId: attempt.id }),
      loadContents(manager, [item]),
    ]);
    const lessonSectionById = new Map(
      lessonSections.map((row) => [row.id, row]),
    );
    const sections: AttemptReviewSection[] = attemptSections.flatMap(
      (section) => {
        const lessonSection = lessonSectionById.get(section.sectionId);
        if (!lessonSection) return [];
        const view = toSectionView(
          section,
          lessonSection,
          questions
            .filter((question) => question.sectionId === section.sectionId)
            .sort((a, b) => a.number - b.number),
          answers.filter((row) => row.attemptSectionId === section.id),
        );
        return [
          {
            id: view.id,
            name: view.name,
            content: view.content,
            result: view.result,
          },
        ];
      },
    );
    return {
      id: attempt.id,
      itemType: CurriculumItemType.LESSON,
      title: contents.get(classContentIdOf(item))?.title ?? '',
      itemTitle:
        item.title ?? contents.get(classContentIdOf(item))?.title ?? '',
      student,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      percent: null,
      passed: null,
      voidedAt: null,
      autoCorrect: attempt.autoCorrect,
      autoTotal: attempt.autoTotal,
      manualCount: attempt.manualCount,
      manualGradedCount: attempt.manualGradedCount,
      sections,
    };
  }

  /** Nghe lại câu Speaking của học viên (bucket private). */
  async examRecordingUrl(
    ctx: TenantContext,
    classroomId: string,
    membershipId: string,
    attemptId: string,
    answerId: string,
  ): Promise<{ url: string }> {
    const { attempt } = await this.findExamAttempt(
      ctx,
      classroomId,
      membershipId,
      attemptId,
    );
    const answer = await this.dataSource.manager
      .getRepository(ExamAttemptAnswer)
      .findOneBy({ id: answerId, attemptId: attempt.id });
    return this.signed(answer?.recordingKey ?? null);
  }

  async lessonRecordingUrl(
    ctx: TenantContext,
    classroomId: string,
    membershipId: string,
    attemptId: string,
    answerId: string,
  ): Promise<{ url: string }> {
    const { attempt } = await this.findLessonAttempt(
      ctx,
      classroomId,
      membershipId,
      attemptId,
    );
    const answer = await this.dataSource.manager
      .getRepository(LessonAttemptAnswer)
      .findOneBy({ id: answerId, attemptId: attempt.id });
    return this.signed(answer?.recordingKey ?? null);
  }

  // --- Nội bộ ---------------------------------------------------------------

  private async signed(key: string | null): Promise<{ url: string }> {
    if (!key) throw new NotFoundException(RECORDING_NOT_FOUND);
    return { url: await this.r2.presignedGetUrl(key) };
  }

  /** Học viên của lớp (kể cả đã rời lớp: bài làm cũ vẫn xem được). */
  private async student(
    manager: EntityManager,
    classroomId: string,
    membershipId: string,
  ) {
    const enrollment = await manager
      .getRepository(ClassroomStudent)
      .findOneBy({ classroomId, membershipId });
    if (!enrollment) throw new NotFoundException(STUDENT_NOT_FOUND);
    const membership = await manager
      .getRepository(Membership)
      .findOne({ where: { id: membershipId }, withDeleted: true });
    const user = membership
      ? await manager
          .getRepository(User)
          .findOne({ where: { id: membership.userId }, withDeleted: true })
      : null;
    if (!user) throw new NotFoundException(STUDENT_NOT_FOUND);
    return { enrollment, user };
  }

  private async findExamAttempt(
    ctx: TenantContext,
    classroomId: string,
    membershipId: string,
    attemptId: string,
  ) {
    const manager = this.dataSource.manager;
    await loadClassroomAccess(manager, ctx, classroomId);
    const student = await this.student(manager, classroomId, membershipId);
    const attempt = await manager.getRepository(ExamAttempt).findOneBy({
      id: attemptId,
      tenantId: ctx.tenantId,
      userId: student.user.id,
    });
    const item = attempt?.classItemId
      ? await manager
          .getRepository(ClassItem)
          .findOneBy({ id: attempt.classItemId, classroomId })
      : null;
    if (!attempt || !item) throw new NotFoundException(ATTEMPT_NOT_FOUND);
    return { attempt, item, student: toStudentRef(membershipId, student.user) };
  }

  private async findLessonAttempt(
    ctx: TenantContext,
    classroomId: string,
    membershipId: string,
    attemptId: string,
  ) {
    const manager = this.dataSource.manager;
    await loadClassroomAccess(manager, ctx, classroomId);
    const student = await this.student(manager, classroomId, membershipId);
    const attempt = await manager.getRepository(LessonAttempt).findOneBy({
      id: attemptId,
      tenantId: ctx.tenantId,
      userId: student.user.id,
    });
    const item = attempt?.classItemId
      ? await manager
          .getRepository(ClassItem)
          .findOneBy({ id: attempt.classItemId, classroomId })
      : null;
    if (!attempt || !item) throw new NotFoundException(ATTEMPT_NOT_FOUND);
    return { attempt, item, student: toStudentRef(membershipId, student.user) };
  }
}

const toStudentRef = (membershipId: string, user: User) => ({
  membershipId,
  id: user.id,
  fullName: user.fullName,
  email: user.email,
});

function toLessonRow(attempt: LessonAttempt): ClassStudentLessonRow {
  return {
    attemptId: attempt.id,
    lessonVersion: attempt.lessonVersion,
    status: attempt.status,
    completedAt: attempt.completedAt?.toISOString() ?? null,
    autoCorrect: attempt.autoCorrect,
    autoTotal: attempt.autoTotal,
    manualCount: attempt.manualCount,
    manualGradedCount: attempt.manualGradedCount,
    canReview: attempt.submittedAt !== null,
  };
}
