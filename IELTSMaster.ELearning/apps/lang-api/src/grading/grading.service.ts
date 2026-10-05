import { explanationsFor, type ExamElement } from '@lang/exam-core';
import {
  AttemptStatus,
  GRADING_FREE_FILTER,
  GradingKind,
  NotificationType,
  QuestionGrading,
  isValidManualScore,
  type GradeAnswerInput,
  type GradeAnswerResult,
  type GradingAnswerState,
  type GradingAttemptDetail,
  type GradingAttemptItem,
  type GradingAttemptList,
  type GradingAttemptProgress,
  type GradingAttemptStatus,
  type GradingClassItemRef,
  type GradingQuestion,
  type GradingSection,
} from '@lang/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  IsNull,
  MoreThan,
  Not,
  type EntityManager,
  type Repository,
} from 'typeorm';
import { ATTEMPT_NOT_FOUND } from '../attempts/attempts.service';
import { ClassItem } from '../classrooms/class-item.entity';
import { ExamAttemptAnswer } from '../attempts/exam-attempt-answer.entity';
import { ExamAttemptSection } from '../attempts/exam-attempt-section.entity';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { toSkipTake } from '../common/pagination';
import { escapeLike } from '../common/sql';
import { ExamQuestion } from '../exams/exam-question.entity';
import { ExamSection } from '../exams/exam-section.entity';
import { Exam } from '../exams/exam.entity';
import { notifyGuardiansAttemptGraded } from '../notifications/guardian-notifications';
import { examResultLink } from '../notifications/notification-targets';
import { NotificationsService } from '../notifications/notifications.service';
import { R2Service } from '../storage/r2.service';
import type { TenantContext } from '../tenants/tenant-context';
import { User } from '../users/user.entity';
import type { ListGradingAttemptsQueryDto } from './dto/grading.dto';
import {
  applyGraderScope,
  canGradeAttempt,
  loadGraderScope,
  type GradableAttemptRow,
  type GraderScope,
} from './grading-access';
import { classFilterOptions, loadClassItemRefs } from './grading-class';
import { sectionPrompts } from './grading-content';

export const OWN_ATTEMPT = 'Bạn không được chấm bài làm của chính mình';
export const NOT_MY_GRADING =
  'Bạn không được chấm bài làm này. Hãy nhờ giáo viên của lớp hoặc người soạn đề chuyển giao chấm';
const VOIDED_ATTEMPT = 'Lượt thi này đã được cho làm lại, không chấm nữa';
const ANSWER_NOT_FOUND = 'Không tìm thấy câu trả lời';
const NOT_FINISHED = 'Lượt làm bài chưa nộp xong, chưa chấm được';
const NOT_MANUAL = 'Câu này chấm tự động, không chấm tay được';
const INVALID_SCORE = (max: number) => `Điểm phải từ 0 đến ${max}, bước 0,5`;
const RECORDING_NOT_FOUND = 'Không tìm thấy bản ghi âm';

const GRADABLE_STATUSES: GradingAttemptStatus[] = [
  AttemptStatus.SUBMITTED,
  AttemptStatus.GRADED,
];

const numberParam = (params: object, key: string): number | null => {
  const value = (params as Record<string, unknown>)[key];
  return typeof value === 'number' ? value : null;
};

function toProgress(attempt: ExamAttempt): GradingAttemptProgress {
  return {
    status: attempt.status as GradingAttemptStatus,
    gradedAt: attempt.gradedAt?.toISOString() ?? null,
    manualCount: attempt.manualCount,
    manualGradedCount: attempt.manualGradedCount,
  };
}

function toAnswerState(
  answer: ExamAttemptAnswer,
  graders: ReadonlyMap<string, User>,
): GradingAnswerState {
  const grader = answer.gradedBy ? graders.get(answer.gradedBy) : undefined;
  return {
    answerId: answer.id,
    score: answer.gradedAt ? answer.score : null,
    comment: answer.gradedAt ? answer.comment : null,
    gradedAt: answer.gradedAt?.toISOString() ?? null,
    grader: grader ? { id: grader.id, fullName: grader.fullName } : null,
  };
}

/**
 * Chấm tay Writing/Speaking (Step 14): Owner/Admin/Teacher chấm mọi lượt làm
 * đã nộp hết của tenant, trừ bài của chính mình. Không sửa kết quả tự động;
 * chấm lại được, lượt làm chuyển `graded` khi mọi câu chấm tay đã có điểm.
 */
@Injectable()
export class GradingService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly r2: R2Service,
    @InjectRepository(ExamAttempt)
    private readonly attempts: Repository<ExamAttempt>,
    @InjectRepository(ExamAttemptAnswer)
    private readonly answers: Repository<ExamAttemptAnswer>,
    private readonly notifications: NotificationsService,
  ) {}

  async list(
    ctx: TenantContext,
    graderId: string,
    query: ListGradingAttemptsQueryDto,
  ): Promise<GradingAttemptList> {
    const manager = this.dataSource.manager;
    const scope = await loadGraderScope(manager, ctx, graderId);
    const { skip, take } = toSkipTake(query);
    const qb = this.gradableQuery(ctx, scope)
      .innerJoinAndSelect('attempt.user', 'user')
      .orderBy('attempt.submittedAt', 'DESC')
      .addOrderBy('attempt.id', 'ASC')
      .skip(skip)
      .take(take);
    if (query.status) {
      qb.andWhere('attempt.status = :status', { status: query.status });
    }
    if (query.examId) {
      qb.andWhere('attempt.examId = :examId', { examId: query.examId });
    }
    if (query.classId === GRADING_FREE_FILTER) {
      qb.andWhere('attempt.classItemId IS NULL');
    } else if (query.classId) {
      qb.andWhere('item.classroomId = :classId', { classId: query.classId });
    }
    if (query.itemId) {
      qb.andWhere('attempt.classItemId = :itemId', { itemId: query.itemId });
    }
    if (query.q) {
      qb.andWhere('(user.fullName ILIKE :q OR user.email ILIKE :q)', {
        q: `%${escapeLike(query.q)}%`,
      });
    }
    // Giá trị của các ô lọc lấy trên **mọi** bài mình chấm được, không theo
    // bộ lọc đang chọn.
    const [[rows, total], scopeRows] = await Promise.all([
      qb.getManyAndCount(),
      this.gradableQuery(ctx, scope)
        .select('attempt.examId', 'examId')
        .addSelect('attempt.classItemId', 'classItemId')
        .distinct(true)
        .getRawMany<{ examId: string; classItemId: string | null }>(),
    ]);

    const [exams, refs] = await Promise.all([
      this.examsById([
        ...rows.map((row) => row.examId),
        ...scopeRows.map((row) => row.examId),
      ]),
      loadClassItemRefs(
        manager,
        scopeRows.flatMap((row) => row.classItemId ?? []),
      ),
    ]);
    return {
      items: rows.map((row) => this.toItem(row, row.user!, exams, refs)),
      total,
      page: query.page,
      pageSize: query.pageSize,
      exams: [...new Set(scopeRows.map((row) => row.examId))]
        .map((examId) => ({
          id: examId,
          title: exams.get(examId)?.title ?? '',
        }))
        .sort((a, b) => a.title.localeCompare(b.title, 'vi')),
      ...classFilterOptions(refs),
    };
  }

  async detail(
    ctx: TenantContext,
    graderId: string,
    id: string,
  ): Promise<GradingAttemptDetail> {
    const manager = this.dataSource.manager;
    const scope = await loadGraderScope(manager, ctx, graderId);
    const attempt = await this.findGradable(manager, ctx, scope, id);
    const attemptSections = (
      await manager
        .getRepository(ExamAttemptSection)
        .findBy({ attemptId: attempt.id })
    ).sort((a, b) => a.sortOrder - b.sortOrder);
    const sectionIds = attemptSections.map((section) => section.sectionId);
    const [examSections, questions, answers, next] = await Promise.all([
      manager.getRepository(ExamSection).findBy({ id: In(sectionIds) }),
      this.manualQuestions(manager, sectionIds),
      this.answers.findBy({ attemptId: attempt.id }),
      // Bài chờ chấm kế tiếp: cũng phải nằm trong phạm vi chấm của mình.
      this.nextGradableId(manager, ctx, scope, attempt.id),
    ]);
    const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]));
    const userIds = [
      attempt.userId,
      ...answers.flatMap((a) => (a.gradedBy ? [a.gradedBy] : [])),
    ];
    const [users, exams] = await Promise.all([
      this.usersById(manager, userIds),
      this.examsById([attempt.examId]),
    ]);
    const examSectionById = new Map(examSections.map((s) => [s.id, s]));

    const sections: GradingSection[] = [];
    for (const section of attemptSections) {
      const examSection = examSectionById.get(section.sectionId);
      const own = questions
        .filter((question) => question.sectionId === section.sectionId)
        .sort((a, b) => a.number - b.number);
      if (!examSection || own.length === 0) continue;
      const prompts = sectionPrompts(
        examSection.contentPublic as ExamElement[],
      );
      sections.push({
        id: section.id,
        name: examSection.name,
        correct: section.correct ?? 0,
        total: section.total ?? 0,
        autoSubmitted: section.autoSubmitted,
        submittedAt: section.submittedAt?.toISOString() ?? null,
        parts: prompts.parts,
        questions: own.flatMap((question): GradingQuestion[] => {
          const answer = answerByQuestion.get(question.id);
          if (!answer) return [];
          const prompt = prompts.questions.get(question.nodeId);
          return [
            {
              ...toAnswerState(answer, users),
              number: question.number,
              qtype: question.qtype,
              maxScore: question.maxScore,
              seconds: numberParam(question.params, 'seconds'),
              maxChars: numberParam(question.params, 'maxChars'),
              partIndex: prompt?.partIndex ?? null,
              prompt: prompt?.prompt ?? [],
              explanations: explanationsFor(
                examSection.explanations ?? [],
                question.number,
              ).map((item) => item.blocks),
              text:
                typeof answer.response === 'string' ? answer.response : null,
              hasRecording: answer.recordingKey !== null,
            },
          ];
        }),
      });
    }

    const refs = await loadClassItemRefs(
      manager,
      attempt.classItemId ? [attempt.classItemId] : [],
    );
    return {
      ...this.toItem(attempt, users.get(attempt.userId), exams, refs),
      startedAt: attempt.startedAt.toISOString(),
      sections,
      nextAttemptId: next,
    };
  }

  /** Chấm (hoặc chấm lại) một câu; đủ mọi câu chấm tay thì lượt làm → `graded`. */
  async grade(
    ctx: TenantContext,
    graderId: string,
    answerId: string,
    input: GradeAnswerInput,
  ): Promise<GradeAnswerResult> {
    const now = new Date();
    return this.dataSource.transaction(async (manager) => {
      const answerRepository = manager.getRepository(ExamAttemptAnswer);
      const answer = await answerRepository.findOneBy({ id: answerId });
      if (!answer) throw new NotFoundException(ANSWER_NOT_FOUND);
      // Khoá lượt làm: hai người chấm song song vẫn đếm đúng số câu đã chấm.
      const attempt = await manager.getRepository(ExamAttempt).findOne({
        where: { id: answer.attemptId, tenantId: ctx.tenantId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!attempt) throw new NotFoundException(ANSWER_NOT_FOUND);
      const scope = await loadGraderScope(manager, ctx, graderId);
      await assertGradable(manager, scope, attempt);

      const question = await manager
        .getRepository(ExamQuestion)
        .findOneBy({ id: answer.questionId });
      if (!question || question.grading !== QuestionGrading.MANUAL) {
        throw new BadRequestException(NOT_MANUAL);
      }
      if (!isValidManualScore(input.score, question.maxScore)) {
        throw new BadRequestException(INVALID_SCORE(question.maxScore));
      }

      const changes = {
        score: input.score,
        comment: input.comment?.trim() || null,
        gradedBy: graderId,
        gradedAt: now,
      };
      await answerRepository.update(answer.id, changes);
      Object.assign(answer, changes);

      const sectionIds = (
        await manager
          .getRepository(ExamAttemptSection)
          .findBy({ attemptId: attempt.id })
      ).map((section) => section.sectionId);
      const manualIds = (await this.manualQuestions(manager, sectionIds)).map(
        (q) => q.id,
      );
      const graded = await answerRepository.countBy({
        attemptId: attempt.id,
        questionId: In(manualIds),
        gradedAt: Not(IsNull()),
      });
      const attemptChanges: Partial<ExamAttempt> = {
        manualGradedCount: graded,
      };
      if (
        attempt.status === AttemptStatus.SUBMITTED &&
        graded >= attempt.manualCount
      ) {
        attemptChanges.status = AttemptStatus.GRADED;
        attemptChanges.gradedAt = now;
      }
      await manager
        .getRepository(ExamAttempt)
        .update({ id: attempt.id, status: attempt.status }, attemptChanges);
      if (attemptChanges.status === AttemptStatus.GRADED) {
        const exams = await this.examsById([attempt.examId]);
        const title = exams.get(attempt.examId)?.title ?? '';
        await this.notifications.notify(manager, {
          userIds: [attempt.userId],
          tenantId: ctx.tenantId,
          type: NotificationType.ATTEMPT_GRADED,
          params: { title },
          link: examResultLink(ctx.slug, attempt.id),
          // Chấm lại sau khi đã chấm xong không báo thêm lần nữa.
          dedupeKey: `graded:${attempt.id}`,
        });
        await notifyGuardiansAttemptGraded(manager, this.notifications, {
          tenantId: ctx.tenantId,
          studentMembershipId: attempt.membershipId,
          title,
          dedupeKey: `child_graded:${attempt.id}`,
        });
      }
      Object.assign(attempt, attemptChanges);

      const graders = await this.usersById(manager, [graderId]);
      return {
        answer: toAnswerState(answer, graders),
        attempt: toProgress(attempt),
      };
    });
  }

  /** Link nghe ghi âm Speaking (presigned, bucket private) cho người chấm. */
  async recordingUrl(
    ctx: TenantContext,
    graderId: string,
    id: string,
    answerId: string,
  ): Promise<{ url: string }> {
    const manager = this.dataSource.manager;
    const attempt = await this.findGradable(
      manager,
      ctx,
      await loadGraderScope(manager, ctx, graderId),
      id,
    );
    const answer = await this.answers.findOneBy({
      id: answerId,
      attemptId: attempt.id,
    });
    if (!answer?.recordingKey) {
      throw new NotFoundException(RECORDING_NOT_FOUND);
    }
    return { url: await this.r2.presignedGetUrl(answer.recordingKey) };
  }

  // --- Nội bộ ---------------------------------------------------------------

  /**
   * Lượt làm có câu chấm tay, đã nộp hết, chưa bị "Cho làm lại", không phải của
   * người chấm và nằm trong phạm vi chấm của họ (`canGradeAttempt`).
   */
  private gradableQuery(ctx: TenantContext, scope: GraderScope) {
    const qb = this.attempts
      .createQueryBuilder('attempt')
      .leftJoin(ClassItem, 'item', 'item.id = attempt.class_item_id')
      .leftJoin(Exam, 'exam', 'exam.id = attempt.exam_id')
      .where('attempt.tenantId = :tenantId', { tenantId: ctx.tenantId })
      .andWhere('attempt.status IN (:...statuses)', {
        statuses: GRADABLE_STATUSES,
      })
      .andWhere('attempt.manualCount > 0')
      .andWhere('attempt.voidedAt IS NULL')
      .andWhere('attempt.userId <> :graderId', { graderId: scope.graderId });
    applyGraderScope(qb, scope, GradingKind.EXAM, 'exam');
    return qb;
  }

  /**
   * Lượt chờ chấm kế tiếp (nộp sớm nhất) mà người chấm được chấm: lọc bằng
   * chính `canGradeAttempt` để khớp với danh sách.
   */
  private async nextGradableId(
    manager: EntityManager,
    ctx: TenantContext,
    scope: GraderScope,
    currentId: string,
  ): Promise<string | null> {
    const rows = await this.attempts.find({
      select: {
        id: true,
        userId: true,
        examId: true,
        classItemId: true,
        voidedAt: true,
      },
      where: {
        tenantId: ctx.tenantId,
        status: AttemptStatus.SUBMITTED,
        manualCount: MoreThan(0),
        voidedAt: IsNull(),
      },
      order: { submittedAt: 'ASC', id: 'ASC' },
    });
    const candidates = rows.filter(
      (row) => row.id !== currentId && row.userId !== scope.graderId,
    );
    if (candidates.length === 0) return null;
    const itemIds = [
      ...new Set(candidates.flatMap((row) => row.classItemId ?? [])),
    ];
    const [exams, items] = await Promise.all([
      manager.getRepository(Exam).find({
        select: { id: true, createdBy: true },
        where: { id: In([...new Set(candidates.map((row) => row.examId))]) },
        withDeleted: true,
      }),
      itemIds.length > 0
        ? manager.getRepository(ClassItem).findBy({ id: In(itemIds) })
        : Promise.resolve([]),
    ]);
    const authorOf = new Map(exams.map((row) => [row.id, row.createdBy]));
    const classroomOf = new Map(items.map((row) => [row.id, row.classroomId]));
    const next = candidates.find((row) =>
      canGradeAttempt(
        scope,
        {
          id: row.id,
          userId: row.userId,
          voided: false,
          classItemId: row.classItemId,
          classroomId: row.classItemId
            ? (classroomOf.get(row.classItemId) ?? null)
            : null,
          contentId: row.examId,
          authorId: authorOf.get(row.examId) ?? null,
        },
        GradingKind.EXAM,
      ),
    );
    return next?.id ?? null;
  }

  private async findGradable(
    manager: EntityManager,
    ctx: TenantContext,
    scope: GraderScope,
    id: string,
  ): Promise<ExamAttempt> {
    const attempt = await manager
      .getRepository(ExamAttempt)
      .findOneBy({ id, tenantId: ctx.tenantId });
    if (!attempt || attempt.manualCount === 0) {
      throw new NotFoundException(ATTEMPT_NOT_FOUND);
    }
    await assertGradable(manager, scope, attempt);
    return attempt;
  }

  private manualQuestions(
    manager: EntityManager,
    sectionIds: readonly string[],
  ): Promise<ExamQuestion[]> {
    if (sectionIds.length === 0) return Promise.resolve([]);
    return manager.getRepository(ExamQuestion).findBy({
      sectionId: In([...sectionIds]),
      grading: QuestionGrading.MANUAL,
    });
  }

  private async usersById(
    manager: EntityManager,
    ids: readonly string[],
  ): Promise<Map<string, User>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const users = await manager
      .getRepository(User)
      .find({ where: { id: In(unique) }, withDeleted: true });
    return new Map(users.map((user) => [user.id, user]));
  }

  private async examsById(ids: readonly string[]): Promise<Map<string, Exam>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    // Đề bị xoá mềm vẫn hiện tên trong bài làm cũ.
    const exams = await this.dataSource.manager
      .getRepository(Exam)
      .find({ where: { id: In(unique) }, withDeleted: true });
    return new Map(exams.map((exam) => [exam.id, exam]));
  }

  private toItem(
    attempt: ExamAttempt,
    user: User | undefined,
    exams: ReadonlyMap<string, Exam>,
    refs: ReadonlyMap<string, GradingClassItemRef>,
  ): GradingAttemptItem {
    return {
      id: attempt.id,
      exam: {
        id: attempt.examId,
        title: exams.get(attempt.examId)?.title ?? '',
      },
      classItem: attempt.classItemId
        ? (refs.get(attempt.classItemId) ?? null)
        : null,
      student: {
        userId: attempt.userId,
        fullName: user?.fullName ?? '',
        email: user?.email ?? '',
      },
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      autoCorrect: attempt.autoCorrect,
      autoTotal: attempt.autoTotal,
      ...toProgress(attempt),
    };
  }
}

/** Kiểm quyền chấm một lượt cụ thể (cùng quy tắc với `gradableQuery`). */
async function assertGradable(
  manager: EntityManager,
  scope: GraderScope,
  attempt: ExamAttempt,
): Promise<void> {
  if (attempt.userId === scope.graderId) {
    throw new ForbiddenException(OWN_ATTEMPT);
  }
  if (attempt.voidedAt) throw new ConflictException(VOIDED_ATTEMPT);
  const row = await examGradableRow(manager, attempt);
  if (!canGradeAttempt(scope, row, GradingKind.EXAM)) {
    throw new ForbiddenException(NOT_MY_GRADING);
  }
  if (attempt.status === AttemptStatus.IN_PROGRESS) {
    throw new ConflictException(NOT_FINISHED);
  }
}

/** Dữ liệu xét quyền của một lượt làm: mục lớp và người soạn đề. */
async function examGradableRow(
  manager: EntityManager,
  attempt: ExamAttempt,
): Promise<GradableAttemptRow> {
  const [exam, item] = await Promise.all([
    manager.getRepository(Exam).findOne({
      select: { id: true, createdBy: true },
      where: { id: attempt.examId },
      withDeleted: true,
    }),
    attempt.classItemId
      ? manager.getRepository(ClassItem).findOneBy({ id: attempt.classItemId })
      : Promise.resolve(null),
  ]);
  return {
    id: attempt.id,
    userId: attempt.userId,
    voided: attempt.voidedAt !== null,
    classItemId: attempt.classItemId,
    classroomId: item?.classroomId ?? null,
    contentId: attempt.examId,
    authorId: exam?.createdBy ?? null,
  };
}
