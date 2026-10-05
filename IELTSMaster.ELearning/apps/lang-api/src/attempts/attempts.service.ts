import { randomInt, randomUUID } from 'node:crypto';
import { buildPlan, shuffleOrdering, type ExamElement } from '@lang/exam-core';
import {
  ATTEMPT_GRACE_SECONDS,
  AttemptSectionStatus,
  AttemptStatus,
  ContentVisibility,
  ExamStatus,
  QuestionGrading,
  RECORDING_MAX_BYTES,
  RECORDING_MIME_TYPES,
  type AttemptCurrentSection,
  type AttemptRecording,
  type AttemptResponses,
  type AttemptResult,
  type AttemptSectionSummary,
  type AttemptView,
} from '@lang/shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  IsNull,
  LessThan,
  Not,
  type EntityManager,
  type Repository,
} from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { assertAttemptClassOngoing } from '../classrooms/class-gate';
import { isUniqueViolation } from '../common/database-errors';
import { ExamQuestion } from '../exams/exam-question.entity';
import { ExamSection } from '../exams/exam-section.entity';
import { Exam } from '../exams/exam.entity';
import { EXAM_NOT_FOUND, currentSections } from '../exams/exams.service';
import { insertable } from '../exams/section-content';
import { notifyPendingGrading } from '../notifications/grading-notifications';
import { notifyGuardiansAttemptGraded } from '../notifications/guardian-notifications';
import { NotificationsService } from '../notifications/notifications.service';
import { R2Service } from '../storage/r2.service';
import type { UploadedFile } from '../storage/media-file';
import type { TenantContext } from '../tenants/tenant-context';
import {
  emptyAttemptResponses,
  gradeSection,
  normalizeResponses,
  toGradable,
} from './attempt-grading';
import { ExamAttemptAnswer } from './exam-attempt-answer.entity';
import { ExamAttemptSection } from './exam-attempt-section.entity';
import { ExamAttempt } from './exam-attempt.entity';

export const ATTEMPT_NOT_FOUND = 'Không tìm thấy lượt làm bài';
const SECTION_NOT_FOUND = 'Không tìm thấy section trong lượt làm bài';
const EXAM_CLOSED = 'Đề thi không còn mở để làm bài';
export const ATTEMPT_IN_PROGRESS =
  'Bạn đang có lượt làm dở của đề này, hãy làm tiếp hoặc nộp bài trước';
const PREVIOUS_NOT_SUBMITTED =
  'Phải nộp section trước rồi mới bắt đầu được section này';
const SECTION_SUBMITTED = 'Section này đã nộp';
const SECTION_NOT_STARTED = 'Section này chưa bắt đầu';
export const TIME_UP = 'Đã hết giờ làm section này';
const NOT_FINISHED = 'Lượt làm bài chưa nộp xong';
const NOT_SPEAKING = 'Câu này không phải câu Speaking';
const RECORDING_MISSING = 'Thiếu file ghi âm';
const RECORDING_TYPE = 'File ghi âm phải là audio/webm hoặc audio/mp4';
const RECORDING_TOO_LARGE = `File ghi âm tối đa ${RECORDING_MAX_BYTES / 1024 / 1024}MB`;
const RECORDING_NOT_FOUND = 'Không tìm thấy bản ghi âm';

const GRACE_MS = ATTEMPT_GRACE_SECONDS * 1000;

const RECORDING_EXTENSIONS: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
};

/** Section đang làm đã quá `deadline_at` + thời gian trễ cho phép. */
export function isOverdue(section: ExamAttemptSection, now: Date): boolean {
  return (
    section.status === AttemptSectionStatus.IN_PROGRESS &&
    section.deadlineAt !== null &&
    now.getTime() > section.deadlineAt.getTime() + GRACE_MS
  );
}

const bySortOrder = (a: ExamAttemptSection, b: ExamAttemptSection) =>
  a.sortOrder - b.sortOrder;

/** Section đầu tiên chưa nộp: section tới lượt làm. */
const nextSection = (sections: readonly ExamAttemptSection[]) =>
  sections.find((section) => section.status !== AttemptSectionStatus.SUBMITTED);

/** Key ghi âm trên bucket private (plan Step 13). */
export const recordingKey = (
  tenantId: string,
  attemptId: string,
  questionId: string,
  extension: string,
) =>
  `tenants/${tenantId}/attempts/${attemptId}/${questionId}-${randomUUID()}.${extension}`;

interface SubmitTarget {
  section: ExamAttemptSection;
  responses: AttemptResponses;
  autoSubmitted: boolean;
}

interface LockedAttempt {
  attempt: ExamAttempt;
  /** Theo `sort_order`. */
  sections: ExamAttemptSection[];
}

/**
 * Lượt làm bài của học viên (Step 13). Mọi thao tác ghi khoá dòng lượt làm và
 * các section của nó, rồi chốt những section quá hạn trước khi làm việc khác
 * (lazy); cron `finalizeExpired` chốt nốt section không ai mở lại. Chấm bằng
 * dòng `exam_questions`, học viên chỉ nhận content_public đã xáo.
 */
@Injectable()
export class AttemptsService {
  private readonly logger = new Logger(AttemptsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly r2: R2Service,
    @InjectRepository(ExamAttempt)
    private readonly attempts: Repository<ExamAttempt>,
    @InjectRepository(ExamAttemptSection)
    private readonly attemptSections: Repository<ExamAttemptSection>,
    @InjectRepository(ExamAttemptAnswer)
    private readonly answers: Repository<ExamAttemptAnswer>,
    private readonly notifications: NotificationsService,
  ) {}

  /** Bắt đầu lượt làm mới trên version hiện tại của đề đang publish. */
  async create(
    ctx: TenantContext,
    userId: string,
    examId: string,
  ): Promise<AttemptView> {
    const now = new Date();
    let attemptId: string;
    try {
      attemptId = await this.dataSource.transaction(async (manager) => {
        // FOR SHARE: không chạy song song với lần lưu nội dung đề (FOR UPDATE).
        const exam = await manager.getRepository(Exam).findOne({
          where: { id: examId, tenantId: ctx.tenantId },
          lock: { mode: 'pessimistic_read' },
        });
        // Đề `private` chỉ làm qua lớp (Step 9), ở đây coi như không có.
        if (
          !exam ||
          exam.status === ExamStatus.DRAFT ||
          exam.visibility !== ContentVisibility.TENANT
        ) {
          throw new NotFoundException(EXAM_NOT_FOUND);
        }
        if (exam.status !== ExamStatus.PUBLISHED) {
          throw new ConflictException(EXAM_CLOSED);
        }
        const open = await manager.getRepository(ExamAttempt).existsBy({
          examId,
          userId,
          classItemId: IsNull(),
          status: AttemptStatus.IN_PROGRESS,
        });
        if (open) throw new ConflictException(ATTEMPT_IN_PROGRESS);
        return this.insertAttempt(manager, ctx, userId, exam, null, now);
      });
    } catch (error) {
      // Hai request bắt đầu cùng lúc: index unique chặn lượt thứ hai.
      if (isUniqueViolation(error)) {
        throw new ConflictException(ATTEMPT_IN_PROGRESS);
      }
      throw error;
    }
    return this.get(ctx, userId, attemptId);
  }

  /**
   * Bắt đầu lượt thi cho một mục giáo trình lớp (Step 9). Chạy trong
   * transaction của `LearnerClassesService` (đã khoá dòng lớp và kiểm ngày mở,
   * deadline, 1 lượt/mục): ở đây chỉ kiểm nội dung đề còn dùng được. Đề
   * `private` và đề đã lưu trữ vẫn thi được vì mục của lớp là căn cứ (người
   * dùng chốt Step 9).
   */
  async createForClassItem(
    manager: EntityManager,
    ctx: TenantContext,
    userId: string,
    examId: string,
    classItemId: string,
    now = new Date(),
  ): Promise<string> {
    const exam = await manager.getRepository(Exam).findOne({
      where: { id: examId, tenantId: ctx.tenantId },
      lock: { mode: 'pessimistic_read' },
    });
    if (!exam) throw new NotFoundException(EXAM_NOT_FOUND);
    if (exam.status === ExamStatus.DRAFT) {
      throw new ConflictException(EXAM_CLOSED);
    }
    return this.insertAttempt(manager, ctx, userId, exam, classItemId, now);
  }

  /** Dòng lượt làm + các section trên version hiện tại của đề (đã khoá FOR SHARE). */
  private async insertAttempt(
    manager: EntityManager,
    ctx: TenantContext,
    userId: string,
    exam: Exam,
    classItemId: string | null,
    now: Date,
  ): Promise<string> {
    const sections = await currentSections(manager, exam);
    if (sections.length === 0) throw new ConflictException(EXAM_CLOSED);

    const attempts = manager.getRepository(ExamAttempt);
    const attempt = await attempts.save(
      attempts.create({
        tenantId: ctx.tenantId,
        examId: exam.id,
        examVersion: exam.currentVersion,
        userId,
        membershipId: ctx.membershipId,
        classItemId,
        voidedAt: null,
        voidedBy: null,
        status: AttemptStatus.IN_PROGRESS,
        startedAt: now,
        submittedAt: null,
        gradedAt: null,
        autoCorrect: 0,
        autoTotal: 0,
        manualCount: 0,
        manualGradedCount: 0,
      }),
    );
    await manager.getRepository(ExamAttemptSection).insert(
      insertable(
        sections.map(
          (section, sortOrder): ExamAttemptSection =>
            ({
              id: randomUUID(),
              attemptId: attempt.id,
              sectionId: section.id,
              sortOrder,
              status: AttemptSectionStatus.NOT_STARTED,
              startedAt: null,
              deadlineAt: null,
              submittedAt: null,
              autoSubmitted: false,
              responses: emptyAttemptResponses(),
              orderSeed: randomInt(2 ** 31),
              correct: null,
              total: null,
            }) as ExamAttemptSection,
        ),
      ),
    );
    return attempt.id;
  }

  async get(
    ctx: TenantContext,
    userId: string,
    id: string,
  ): Promise<AttemptView> {
    const now = new Date();
    const { attempt, sections } = await this.refresh(ctx, userId, id, now);
    return this.buildView(attempt, sections, now);
  }

  /** Bắt đầu tính giờ section tới lượt. Gọi lại khi đang làm thì không đổi gì. */
  async start(
    ctx: TenantContext,
    userId: string,
    id: string,
    sectionId: string,
  ): Promise<AttemptView> {
    const now = new Date();
    const { attempt, sections } = await this.mutate(
      ctx,
      userId,
      id,
      now,
      async (manager, _attempt, sections) => {
        const target = findSection(sections, sectionId);
        if (target.status === AttemptSectionStatus.IN_PROGRESS) return;
        if (target.status === AttemptSectionStatus.SUBMITTED) {
          throw new ConflictException(SECTION_SUBMITTED);
        }
        if (nextSection(sections) !== target) {
          throw new ConflictException(PREVIOUS_NOT_SUBMITTED);
        }
        const examSection = await manager
          .getRepository(ExamSection)
          .findOneBy({ id: target.sectionId });
        if (!examSection) throw new NotFoundException(SECTION_NOT_FOUND);
        const changes = {
          status: AttemptSectionStatus.IN_PROGRESS,
          startedAt: now,
          deadlineAt: new Date(
            now.getTime() + examSection.durationMinutes * 60_000,
          ),
        };
        await manager
          .getRepository(ExamAttemptSection)
          .update(
            { id: target.id, status: AttemptSectionStatus.NOT_STARTED },
            changes,
          );
        Object.assign(target, changes);
      },
    );
    return this.buildView(attempt, sections, now);
  }

  /** Autosave: ghi đè câu trả lời của section đang làm, từ chối khi đã quá hạn. */
  async saveResponses(
    ctx: TenantContext,
    userId: string,
    id: string,
    sectionId: string,
    responses: AttemptResponses,
  ): Promise<{ savedAt: string }> {
    const now = new Date();
    const attempt = await this.findOwn(
      this.dataSource.manager,
      ctx,
      userId,
      id,
    );
    await assertAttemptClassOngoing(
      this.dataSource.manager,
      attempt.classItemId,
    );
    const section = await this.attemptSections.findOneBy({
      id: sectionId,
      attemptId: id,
    });
    if (!section) throw new NotFoundException(SECTION_NOT_FOUND);
    if (section.status === AttemptSectionStatus.NOT_STARTED) {
      throw new ConflictException(SECTION_NOT_STARTED);
    }
    if (section.status === AttemptSectionStatus.SUBMITTED) {
      throw new ConflictException(SECTION_SUBMITTED);
    }
    if (isOverdue(section, now)) throw new ConflictException(TIME_UP);

    // Điều kiện lặp lại trong câu lệnh: lần nộp chạy song song đã đổi trạng
    // thái thì không ghi đè nữa.
    const result = await this.attemptSections.update(
      {
        id: sectionId,
        attemptId: id,
        status: AttemptSectionStatus.IN_PROGRESS,
        deadlineAt: Not(LessThan(new Date(now.getTime() - GRACE_MS))),
      },
      { responses: normalizeResponses(responses) },
    );
    if (!result.affected) throw new ConflictException(TIME_UP);
    return { savedAt: now.toISOString() };
  }

  /**
   * Nộp section đang làm. Section đã được chốt (hết giờ, gửi hai lần) thì trả
   * về trạng thái hiện tại thay vì báo lỗi: client tự nộp lúc hết giờ có thể
   * tới sau cron.
   */
  async submitSection(
    ctx: TenantContext,
    userId: string,
    id: string,
    sectionId: string,
    responses: AttemptResponses | undefined,
  ): Promise<AttemptView> {
    const now = new Date();
    const { attempt, sections } = await this.mutate(
      ctx,
      userId,
      id,
      now,
      async (manager, attempt, sections) => {
        const target = findSection(sections, sectionId);
        if (target.status === AttemptSectionStatus.SUBMITTED) return;
        if (target.status === AttemptSectionStatus.NOT_STARTED) {
          throw new ConflictException(SECTION_NOT_STARTED);
        }
        // Section quá hạn đã bị chốt ở bước trên, nên tới đây vẫn còn trong hạn.
        await this.submitSections(
          manager,
          attempt,
          sections,
          [
            {
              section: target,
              responses: normalizeResponses(responses ?? target.responses),
              autoSubmitted:
                target.deadlineAt !== null &&
                now.getTime() >= target.deadlineAt.getTime(),
            },
          ],
          now,
        );
      },
    );
    return this.buildView(attempt, sections, now);
  }

  /** Nộp toàn bài: chốt mọi section còn lại (chưa làm thì tính bỏ trống). */
  async finish(
    ctx: TenantContext,
    userId: string,
    id: string,
  ): Promise<AttemptView> {
    const now = new Date();
    const { attempt, sections } = await this.mutate(
      ctx,
      userId,
      id,
      now,
      async (manager, attempt, sections) => {
        if (attempt.status !== AttemptStatus.IN_PROGRESS) return;
        await this.submitSections(
          manager,
          attempt,
          sections,
          sections
            .filter((s) => s.status !== AttemptSectionStatus.SUBMITTED)
            .map((section) => ({
              section,
              responses: normalizeResponses(section.responses),
              autoSubmitted: false,
            })),
          now,
        );
      },
    );
    return this.buildView(attempt, sections, now);
  }

  /** Ghi âm câu Speaking của section đang làm; ghi lại thì xoá file cũ. */
  async uploadRecording(
    ctx: TenantContext,
    userId: string,
    id: string,
    sectionId: string,
    number: number,
    file: UploadedFile | undefined,
  ): Promise<AttemptRecording> {
    if (!file) throw new BadRequestException(RECORDING_MISSING);
    const mimeType = (file.mimetype ?? '').split(';')[0].trim().toLowerCase();
    if (!RECORDING_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(RECORDING_TYPE);
    }
    if (file.size > RECORDING_MAX_BYTES) {
      throw new BadRequestException(RECORDING_TOO_LARGE);
    }

    // Kiểm trước khi tải lên để không đẩy file vô ích; kiểm lại trong transaction.
    const now = new Date();
    const manager = this.dataSource.manager;
    const own = await this.findOwn(manager, ctx, userId, id);
    await assertAttemptClassOngoing(manager, own.classItemId);
    const section = await this.attemptSections.findOneBy({
      id: sectionId,
      attemptId: id,
    });
    if (!section) throw new NotFoundException(SECTION_NOT_FOUND);
    assertOpen(section, now);
    const question = await manager
      .getRepository(ExamQuestion)
      .findOneBy({ sectionId: section.sectionId, number });
    if (!question || question.qtype !== 'speaking') {
      throw new BadRequestException(NOT_SPEAKING);
    }

    const key = recordingKey(
      ctx.tenantId,
      id,
      question.id,
      RECORDING_EXTENSIONS[mimeType],
    );
    await this.r2.put('private', key, file.buffer, mimeType);

    let previousKey: string | null = null;
    let answerId: string;
    try {
      answerId = await this.dataSource.transaction(async (manager) => {
        await this.lockAttempt(manager, {
          id,
          tenantId: ctx.tenantId,
          userId,
        });
        const [locked] = await this.lockSections(manager, id, sectionId);
        if (!locked) throw new NotFoundException(SECTION_NOT_FOUND);
        assertOpen(locked, new Date());

        const repository = manager.getRepository(ExamAttemptAnswer);
        const existing = await repository.findOneBy({
          attemptId: id,
          questionId: question.id,
        });
        if (existing) {
          previousKey = existing.recordingKey;
          await repository.update(existing.id, { recordingKey: key });
          return existing.id;
        }
        const answer = {
          id: randomUUID(),
          attemptId: id,
          attemptSectionId: sectionId,
          questionId: question.id,
          response: null,
          isCorrect: null,
          score: null,
          comment: null,
          recordingKey: key,
          gradedBy: null,
          gradedAt: null,
        } as ExamAttemptAnswer;
        await repository.insert(insertable([answer]));
        return answer.id;
      });
    } catch (error) {
      await this.deleteRecording(key);
      throw error;
    }
    if (previousKey) await this.deleteRecording(previousKey);
    return { answerId, number, uploadedAt: now.toISOString() };
  }

  /** Link nghe lại ghi âm (presigned, bucket private) cho chủ lượt làm. */
  async recordingUrl(
    ctx: TenantContext,
    userId: string,
    id: string,
    answerId: string,
  ): Promise<{ url: string }> {
    await this.findOwn(this.dataSource.manager, ctx, userId, id);
    const answer = await this.answers.findOneBy({
      id: answerId,
      attemptId: id,
    });
    if (!answer?.recordingKey) {
      throw new NotFoundException(RECORDING_NOT_FOUND);
    }
    return { url: await this.r2.presignedGetUrl(answer.recordingKey) };
  }

  /** Kết quả khi đã nộp hết: số câu đúng theo section, điểm chấm tay; không đáp án. */
  async result(
    ctx: TenantContext,
    userId: string,
    id: string,
  ): Promise<AttemptResult> {
    const { attempt, sections } = await this.refresh(
      ctx,
      userId,
      id,
      new Date(),
    );
    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      throw new ConflictException(NOT_FINISHED);
    }
    const manager = this.dataSource.manager;
    const sectionIds = sections.map((section) => section.sectionId);
    const [exam, examSections, manualQuestions] = await Promise.all([
      this.examOf(manager, attempt),
      manager.getRepository(ExamSection).findBy({ id: In(sectionIds) }),
      manager.getRepository(ExamQuestion).findBy({
        sectionId: In(sectionIds),
        grading: QuestionGrading.MANUAL,
      }),
    ]);
    const answers =
      manualQuestions.length > 0
        ? await this.answers.findBy({
            attemptId: id,
            questionId: In(manualQuestions.map((q) => q.id)),
          })
        : [];
    const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]));
    const nameOf = new Map(examSections.map((s) => [s.id, s.name]));

    return {
      id: attempt.id,
      exam: { id: attempt.examId, title: exam?.title ?? '' },
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      gradedAt: attempt.gradedAt?.toISOString() ?? null,
      autoCorrect: attempt.autoCorrect,
      autoTotal: attempt.autoTotal,
      manualCount: attempt.manualCount,
      manualGradedCount: attempt.manualGradedCount,
      sections: sections.map((section) => ({
        id: section.id,
        name: nameOf.get(section.sectionId) ?? '',
        correct: section.correct ?? 0,
        total: section.total ?? 0,
        autoSubmitted: section.autoSubmitted,
        submittedAt: section.submittedAt?.toISOString() ?? null,
        manual: manualQuestions
          .filter((q) => q.sectionId === section.sectionId)
          .sort((a, b) => a.number - b.number)
          .map((question) => {
            const answer = answerByQuestion.get(question.id);
            return {
              number: question.number,
              qtype: question.qtype,
              maxScore: question.maxScore,
              score: answer?.gradedAt ? answer.score : null,
              comment: answer?.gradedAt ? answer.comment : null,
              gradedAt: answer?.gradedAt?.toISOString() ?? null,
            };
          }),
      })),
    };
  }

  /** Cron: chốt các section quá hạn mà không có request nào tới lượt làm. */
  async finalizeExpired(now = new Date()): Promise<number> {
    const overdue = await this.attemptSections.find({
      select: { id: true, attemptId: true },
      where: {
        status: AttemptSectionStatus.IN_PROGRESS,
        deadlineAt: LessThan(new Date(now.getTime() - GRACE_MS)),
      },
    });
    let closed = 0;
    for (const attemptId of new Set(overdue.map((row) => row.attemptId))) {
      try {
        await this.dataSource.transaction(async (manager) => {
          const attempt = await this.lockAttempt(manager, { id: attemptId });
          const sections = await this.lockSections(manager, attemptId);
          await this.expireOverdue(manager, attempt, sections, now);
        });
        closed += 1;
      } catch (error) {
        this.logger.error(
          `Không chốt được lượt làm ${attemptId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    return closed;
  }

  /**
   * Lớp chuyển "Đã kết thúc" (T6, R10.4): chốt ngay mọi lượt thi đang làm dở
   * của các mục lớp – câu đã trả lời chấm như hết giờ, section chưa bắt đầu
   * tính 0. Chạy trong transaction của lần đổi trạng thái lớp (đã khoá dòng
   * lớp). Trả về số lượt đã chốt.
   */
  async finalizeForClassItems(
    manager: EntityManager,
    classItemIds: string[],
    now = new Date(),
  ): Promise<number> {
    if (classItemIds.length === 0) return 0;
    const open = await manager.getRepository(ExamAttempt).find({
      select: { id: true },
      where: {
        classItemId: In(classItemIds),
        status: AttemptStatus.IN_PROGRESS,
      },
    });
    for (const { id } of open) {
      await this.finalizeAttempt(manager, id, now);
    }
    return open.length;
  }

  /**
   * Chốt một lượt thi đang làm dở (như hết giờ): dùng khi lớp kết thúc và khi
   * giáo viên "Cho làm lại" lượt đang làm (người dùng chốt Step 9). Chạy trong
   * transaction của người gọi.
   */
  async finalizeAttempt(
    manager: EntityManager,
    attemptId: string,
    now = new Date(),
  ): Promise<void> {
    const attempt = await this.lockAttempt(manager, { id: attemptId });
    const sections = await this.lockSections(manager, attemptId);
    await this.submitSections(
      manager,
      attempt,
      sections,
      sections
        .filter((section) => section.status !== AttemptSectionStatus.SUBMITTED)
        .map((section) => ({
          section,
          responses: normalizeResponses(section.responses),
          autoSubmitted: true,
        })),
      now,
    );
  }

  // --- Nội bộ ---------------------------------------------------------------

  private async findOwn(
    manager: EntityManager,
    ctx: TenantContext,
    userId: string,
    id: string,
  ): Promise<ExamAttempt> {
    const attempt = await manager
      .getRepository(ExamAttempt)
      .findOneBy({ id, tenantId: ctx.tenantId, userId });
    if (!attempt) throw new NotFoundException(ATTEMPT_NOT_FOUND);
    return attempt;
  }

  private async lockAttempt(
    manager: EntityManager,
    where: { id: string; tenantId?: string; userId?: string },
  ): Promise<ExamAttempt> {
    const attempt = await manager.getRepository(ExamAttempt).findOne({
      where,
      lock: { mode: 'pessimistic_write' },
    });
    if (!attempt) throw new NotFoundException(ATTEMPT_NOT_FOUND);
    return attempt;
  }

  private async lockSections(
    manager: EntityManager,
    attemptId: string,
    sectionId?: string,
  ): Promise<ExamAttemptSection[]> {
    const sections = await manager.getRepository(ExamAttemptSection).find({
      where: sectionId ? { attemptId, id: sectionId } : { attemptId },
      lock: { mode: 'pessimistic_write' },
    });
    return sections.sort(bySortOrder);
  }

  /** Đọc lượt làm; có section quá hạn thì chốt trước (lazy). */
  private async refresh(
    ctx: TenantContext,
    userId: string,
    id: string,
    now: Date,
  ): Promise<LockedAttempt> {
    const manager = this.dataSource.manager;
    const attempt = await this.findOwn(manager, ctx, userId, id);
    const sections = (
      await this.attemptSections.findBy({ attemptId: id })
    ).sort(bySortOrder);
    if (!sections.some((section) => isOverdue(section, now))) {
      return { attempt, sections };
    }
    return this.mutate(ctx, userId, id, now, async () => undefined, {
      classMayBeClosed: true,
    });
  }

  /**
   * Transaction ghi: khoá lượt làm + section, chốt section quá hạn rồi chạy
   * `run`. Lượt trong lớp chỉ ghi được khi lớp còn `ongoing` (T6, R10.4);
   * `classMayBeClosed` dành cho lần chốt lười khi chỉ đọc.
   */
  private mutate(
    ctx: TenantContext,
    userId: string,
    id: string,
    now: Date,
    run: (
      manager: EntityManager,
      attempt: ExamAttempt,
      sections: ExamAttemptSection[],
    ) => Promise<void>,
    { classMayBeClosed = false }: { classMayBeClosed?: boolean } = {},
  ): Promise<LockedAttempt> {
    return this.dataSource.transaction(async (manager) => {
      const attempt = await this.lockAttempt(manager, {
        id,
        tenantId: ctx.tenantId,
        userId,
      });
      if (!classMayBeClosed) {
        await assertAttemptClassOngoing(manager, attempt.classItemId);
      }
      const sections = await this.lockSections(manager, id);
      await this.expireOverdue(manager, attempt, sections, now);
      await run(manager, attempt, sections);
      return { attempt, sections };
    });
  }

  private expireOverdue(
    manager: EntityManager,
    attempt: ExamAttempt,
    sections: ExamAttemptSection[],
    now: Date,
  ): Promise<void> {
    return this.submitSections(
      manager,
      attempt,
      sections,
      sections
        .filter((section) => isOverdue(section, now))
        .map((section) => ({
          section,
          responses: normalizeResponses(section.responses),
          autoSubmitted: true,
        })),
      now,
    );
  }

  /**
   * Chấm và chốt các section (đã khoá), ghi `exam_attempt_answers`, cộng dồn
   * số liệu lượt làm; nộp hết thì chốt lượt làm: `graded` nếu không có câu chấm
   * tay, ngược lại `submitted`. Cập nhật luôn các object truyền vào.
   */
  private async submitSections(
    manager: EntityManager,
    attempt: ExamAttempt,
    sections: readonly ExamAttemptSection[],
    targets: readonly SubmitTarget[],
    now: Date,
  ): Promise<void> {
    if (targets.length === 0 || attempt.status !== AttemptStatus.IN_PROGRESS) {
      return;
    }
    const questions = await manager.getRepository(ExamQuestion).findBy({
      sectionId: In(targets.map((target) => target.section.sectionId)),
    });
    const answerRepository = manager.getRepository(ExamAttemptAnswer);
    // Chỉ câu Speaking đã ghi âm mới có dòng từ trước.
    const existing = new Map(
      (
        await answerRepository.findBy({
          attemptId: attempt.id,
          attemptSectionId: In(targets.map((target) => target.section.id)),
        })
      ).map((answer) => [answer.questionId, answer]),
    );

    const inserts: ExamAttemptAnswer[] = [];
    let correct = 0;
    let total = 0;
    let manual = 0;
    for (const { section, responses, autoSubmitted } of targets) {
      const graded = gradeSection(
        questions
          .filter((question) => question.sectionId === section.sectionId)
          .sort((a, b) => a.number - b.number),
        responses,
      );
      for (const answer of graded.answers) {
        const values = {
          response: answer.response,
          isCorrect: answer.isCorrect,
          score: answer.score,
        };
        const row = existing.get(answer.questionId);
        if (row) {
          await answerRepository.update(
            row.id,
            values as QueryDeepPartialEntity<ExamAttemptAnswer>,
          );
        } else {
          inserts.push({
            id: randomUUID(),
            attemptId: attempt.id,
            attemptSectionId: section.id,
            questionId: answer.questionId,
            ...values,
            comment: null,
            recordingKey: null,
            gradedBy: null,
            gradedAt: null,
          } as ExamAttemptAnswer);
        }
      }

      const changes = {
        status: AttemptSectionStatus.SUBMITTED,
        submittedAt: now,
        autoSubmitted,
        responses,
        correct: graded.correct,
        total: graded.total,
      };
      await manager
        .getRepository(ExamAttemptSection)
        .update({ id: section.id, status: section.status }, changes);
      Object.assign(section, changes);
      correct += graded.correct;
      total += graded.total;
      manual += graded.manual;
    }
    if (inserts.length > 0) await answerRepository.insert(insertable(inserts));

    const manualCount = attempt.manualCount + manual;
    const changes: Partial<ExamAttempt> = {
      autoCorrect: attempt.autoCorrect + correct,
      autoTotal: attempt.autoTotal + total,
      manualCount,
    };
    if (!nextSection(sections)) {
      changes.status =
        manualCount > 0 ? AttemptStatus.SUBMITTED : AttemptStatus.GRADED;
      changes.submittedAt = now;
      if (manualCount === 0) changes.gradedAt = now;
    }
    await manager
      .getRepository(ExamAttempt)
      .update({ id: attempt.id, status: AttemptStatus.IN_PROGRESS }, changes);
    Object.assign(attempt, changes);

    if (changes.status === AttemptStatus.SUBMITTED) {
      const exam = await this.examOf(manager, attempt);
      await notifyPendingGrading(manager, this.notifications, {
        tenantId: attempt.tenantId,
        attemptId: attempt.id,
        kind: 'exam',
        classItemId: attempt.classItemId,
        authorId: exam?.createdBy ?? null,
        studentUserId: attempt.userId,
        title: exam?.title ?? '',
        dedupeKey: `grade_pending:${attempt.id}`,
      });
    } else if (changes.status === AttemptStatus.GRADED) {
      // Đề tự chấm hết: có kết quả ngay khi nộp, báo cho phụ huynh (Step 13).
      const exam = await this.examOf(manager, attempt);
      await notifyGuardiansAttemptGraded(manager, this.notifications, {
        tenantId: attempt.tenantId,
        studentMembershipId: attempt.membershipId,
        title: exam?.title ?? '',
        dedupeKey: `child_graded:${attempt.id}`,
      });
    }
  }

  private examOf(
    manager: EntityManager,
    attempt: ExamAttempt,
  ): Promise<Exam | null> {
    // Đề bị xoá mềm vẫn hiện tên trong lượt làm cũ.
    return manager
      .getRepository(Exam)
      .findOne({ where: { id: attempt.examId }, withDeleted: true });
  }

  private async buildView(
    attempt: ExamAttempt,
    sections: readonly ExamAttemptSection[],
    now: Date,
  ): Promise<AttemptView> {
    const manager = this.dataSource.manager;
    const [exam, examSections] = await Promise.all([
      this.examOf(manager, attempt),
      manager
        .getRepository(ExamSection)
        .findBy({ id: In(sections.map((section) => section.sectionId)) }),
    ]);
    const byId = new Map(examSections.map((section) => [section.id, section]));
    const next =
      attempt.status === AttemptStatus.IN_PROGRESS
        ? nextSection(sections)
        : undefined;

    return {
      id: attempt.id,
      exam: { id: attempt.examId, title: exam?.title ?? '' },
      status: attempt.status,
      serverNow: now.toISOString(),
      sections: sections.map((section) =>
        toSectionSummary(section, byId.get(section.sectionId)!),
      ),
      current: next
        ? await this.currentSection(next, byId.get(next.sectionId)!)
        : null,
    };
  }

  private async currentSection(
    section: ExamAttemptSection,
    examSection: ExamSection,
  ): Promise<AttemptCurrentSection> {
    const content = examSection.contentPublic as ExamElement[];
    if (section.status === AttemptSectionStatus.NOT_STARTED) {
      // Chưa bắt đầu tính giờ thì chỉ lộ phần hướng dẫn.
      return {
        sectionId: section.id,
        status: AttemptSectionStatus.NOT_STARTED,
        intro: buildPlan(content).intro,
      };
    }
    const [questions, recorded] = await Promise.all([
      this.dataSource.manager
        .getRepository(ExamQuestion)
        .findBy({ sectionId: examSection.id }),
      this.answers.findBy({
        attemptSectionId: section.id,
        recordingKey: Not(IsNull()),
      }),
    ]);
    const numberOf = new Map(questions.map((q) => [q.id, q.number]));
    return {
      sectionId: section.id,
      status: AttemptSectionStatus.IN_PROGRESS,
      content: shuffleOrdering(
        content,
        section.orderSeed,
        questions.map(toGradable),
      ),
      responses: normalizeResponses(section.responses),
      recordings: recorded.map((answer) => ({
        answerId: answer.id,
        number: numberOf.get(answer.questionId) ?? 0,
        uploadedAt: answer.updatedAt.toISOString(),
      })),
    };
  }

  private async deleteRecording(key: string): Promise<void> {
    try {
      await this.r2.delete('private', key);
    } catch (error) {
      this.logger.warn(
        `Không xoá được ghi âm ${key}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

function findSection(
  sections: readonly ExamAttemptSection[],
  sectionId: string,
): ExamAttemptSection {
  const section = sections.find((item) => item.id === sectionId);
  if (!section) throw new NotFoundException(SECTION_NOT_FOUND);
  return section;
}

/** Section đang làm và còn trong hạn. */
function assertOpen(section: ExamAttemptSection, now: Date): void {
  if (section.status === AttemptSectionStatus.NOT_STARTED) {
    throw new ConflictException(SECTION_NOT_STARTED);
  }
  if (section.status === AttemptSectionStatus.SUBMITTED) {
    throw new ConflictException(SECTION_SUBMITTED);
  }
  if (isOverdue(section, now)) throw new ConflictException(TIME_UP);
}

function toSectionSummary(
  section: ExamAttemptSection,
  examSection: ExamSection,
): AttemptSectionSummary {
  return {
    id: section.id,
    name: examSection.name,
    durationMinutes: examSection.durationMinutes,
    questionCount: examSection.questionCount,
    status: section.status,
    startedAt: section.startedAt?.toISOString() ?? null,
    deadlineAt: section.deadlineAt?.toISOString() ?? null,
    submittedAt: section.submittedAt?.toISOString() ?? null,
    autoSubmitted: section.autoSubmitted,
  };
}
