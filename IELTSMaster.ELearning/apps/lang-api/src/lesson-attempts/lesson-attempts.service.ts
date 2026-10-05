import { randomInt, randomUUID } from 'node:crypto';
import { shuffleOrdering, type ExamElement } from '@lang/exam-core';
import {
  ContentVisibility,
  LessonAttemptSectionStatus,
  LessonAttemptStatus,
  LessonStatus,
  QuestionGrading,
  RECORDING_MAX_BYTES,
  RECORDING_MIME_TYPES,
  type AttemptResponses,
  type LessonAttemptSectionView,
  type LessonAttemptView,
  type LessonDraftRecording,
  type LessonSectionResult,
  type LessonSectionViewResult,
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
  type EntityManager,
  type Repository,
} from 'typeorm';
import {
  emptyAttemptResponses,
  gradeSection,
  normalizeResponses,
  toGradable,
} from '../attempts/attempt-grading';
import {
  CLASSROOM_NOT_ONGOING,
  isAttemptClassOngoing,
} from '../classrooms/class-gate';
import { isUniqueViolation } from '../common/database-errors';
import { insertable } from '../exams/section-content';
import { LessonQuestion } from '../lessons/lesson-question.entity';
import { LessonSection } from '../lessons/lesson-section.entity';
import { Lesson } from '../lessons/lesson.entity';
import { notifyPendingGrading } from '../notifications/grading-notifications';
import { notifyGuardiansAttemptGraded } from '../notifications/guardian-notifications';
import { NotificationsService } from '../notifications/notifications.service';
import {
  LESSON_NOT_FOUND,
  currentLessonSections,
} from '../lessons/lessons.service';
import type { UploadedFile } from '../storage/media-file';
import { R2Service } from '../storage/r2.service';
import type { TenantContext } from '../tenants/tenant-context';
import { LessonAttemptAnswer } from './lesson-attempt-answer.entity';
import {
  LessonAttemptSection,
  type DraftRecordings,
} from './lesson-attempt-section.entity';
import { LessonAttempt } from './lesson-attempt.entity';

export const LESSON_ATTEMPT_NOT_FOUND = 'Không tìm thấy lượt học';
const SECTION_NOT_FOUND = 'Không tìm thấy phần này trong lượt học';
const LESSON_CLOSED = 'Bài học không còn mở để học';
export const READ_ONLY =
  'Lượt học này chỉ còn xem lại (bài học đã có phiên bản mới hoặc không còn mở)';
export const SECTION_SUBMITTED =
  'Phần này đã nộp, bấm "Làm lại" nếu muốn làm lại';
const NO_QUESTIONS = 'Phần này không có câu hỏi để nộp';
const NOT_SPEAKING = 'Câu này không phải câu Speaking';
const RECORDING_MISSING = 'Thiếu file ghi âm';
const RECORDING_TYPE = 'File ghi âm phải là audio/webm hoặc audio/mp4';
const RECORDING_TOO_LARGE = `File ghi âm tối đa ${RECORDING_MAX_BYTES / 1024 / 1024}MB`;
const RECORDING_NOT_FOUND = 'Không tìm thấy bản ghi âm';

const RECORDING_EXTENSIONS: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
};

/** Key ghi âm trên bucket private (plan 4.3). */
export const lessonRecordingKey = (
  tenantId: string,
  attemptId: string,
  questionId: string,
  extension: string,
) =>
  `tenants/${tenantId}/lesson-attempts/${attemptId}/${questionId}-${randomUUID()}.${extension}`;

const bySortOrder = (
  a: { sortOrder: number },
  b: { sortOrder: number },
): number => a.sortOrder - b.sortOrder;

/** Bài đang mở cho học tự do: đã publish, hiển thị `tenant`, chưa xoá. */
export function isLessonOpen(lesson: Lesson): boolean {
  return (
    lesson.status === LessonStatus.PUBLISHED &&
    lesson.visibility === ContentVisibility.TENANT &&
    !lesson.deletedAt
  );
}

/**
 * Nộp/làm lại được: lượt trên version hiện tại của bài. Lượt tự do cần bài còn
 * mở (publish + hiển thị `tenant`); lượt trong lớp (Step 9) chỉ cần lớp còn
 * `ongoing` (T6.3) và bài chưa bị xoá — bài `private`/đã lưu trữ vẫn học được
 * vì mục của lớp là căn cứ (người dùng chốt Step 9).
 */
export function canSubmitAttempt(
  attempt: LessonAttempt,
  lesson: Lesson | null,
  classOngoing = true,
): boolean {
  if (!lesson || attempt.lessonVersion !== lesson.currentVersion) return false;
  if (attempt.classItemId !== null) return classOngoing && !lesson.deletedAt;
  return isLessonOpen(lesson);
}

interface LockedAttempt {
  attempt: LessonAttempt;
  lesson: Lesson | null;
  /** Theo `sort_order`. */
  sections: LessonAttemptSection[];
  /** Lượt trong lớp: lớp còn `ongoing`; lượt tự do luôn `true`. */
  classOngoing: boolean;
}

/**
 * Lượt học bài học (req-3 Step 5), chép luồng lượt làm đề thi nhưng không có
 * đồng hồ: các section mở cùng lúc, nộp từng section → chấm + đáp án + giải
 * thích; làm lại không giới hạn, chỉ giữ lần nộp gần nhất (R21). Mọi thao tác
 * ghi khoá dòng lượt học rồi mới khoá section.
 */
@Injectable()
export class LessonAttemptsService {
  private readonly logger = new Logger(LessonAttemptsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly r2: R2Service,
    @InjectRepository(LessonAttempt)
    private readonly attempts: Repository<LessonAttempt>,
    @InjectRepository(LessonAttemptSection)
    private readonly attemptSections: Repository<LessonAttemptSection>,
    @InjectRepository(LessonAttemptAnswer)
    private readonly answers: Repository<LessonAttemptAnswer>,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Mở lượt học của version hiện tại (đã có thì dùng lại). Lượt của version cũ
   * vẫn giữ nhưng chỉ xem lại.
   */
  async start(
    ctx: TenantContext,
    userId: string,
    lessonId: string,
  ): Promise<LessonAttemptView> {
    const findExisting = (manager: EntityManager, version: number) =>
      manager.getRepository(LessonAttempt).findOneBy({
        tenantId: ctx.tenantId,
        lessonId,
        lessonVersion: version,
        userId,
        classItemId: IsNull(),
      });

    let attemptId: string;
    try {
      attemptId = await this.dataSource.transaction(async (manager) => {
        // FOR SHARE: không chạy song song với lần lưu nội dung bài (FOR UPDATE).
        const lesson = await manager.getRepository(Lesson).findOne({
          where: { id: lessonId, tenantId: ctx.tenantId },
          lock: { mode: 'pessimistic_read' },
        });
        // Bài `private` chỉ học qua lớp (Step 9), ở đây coi như không có.
        if (
          !lesson ||
          lesson.status === LessonStatus.DRAFT ||
          lesson.visibility !== ContentVisibility.TENANT
        ) {
          throw new NotFoundException(LESSON_NOT_FOUND);
        }
        if (!isLessonOpen(lesson)) throw new ConflictException(LESSON_CLOSED);

        const existing = await findExisting(manager, lesson.currentVersion);
        if (existing) return existing.id;
        return this.insertAttempt(manager, ctx, userId, lesson, null);
      });
    } catch (error) {
      // Hai request mở bài cùng lúc: index unique chặn lượt thứ hai.
      if (!isUniqueViolation(error)) throw error;
      const lesson = await this.dataSource.manager
        .getRepository(Lesson)
        .findOneBy({ id: lessonId, tenantId: ctx.tenantId });
      const existing =
        lesson &&
        (await findExisting(this.dataSource.manager, lesson.currentVersion));
      if (!existing) throw error;
      attemptId = existing.id;
    }
    return this.get(ctx, userId, attemptId);
  }

  /**
   * Mở lượt học cho một mục giáo trình lớp (Step 9), dùng lại lượt của version
   * hiện tại nếu đã có. Chạy trong transaction của `LearnerClassesService` (đã
   * khoá dòng lớp và kiểm ngày mở): bài `private`/đã lưu trữ vẫn học được.
   */
  async startForClassItem(
    manager: EntityManager,
    ctx: TenantContext,
    userId: string,
    lessonId: string,
    classItemId: string,
  ): Promise<string> {
    const lesson = await manager.getRepository(Lesson).findOne({
      where: { id: lessonId, tenantId: ctx.tenantId },
      lock: { mode: 'pessimistic_read' },
    });
    if (!lesson) throw new NotFoundException(LESSON_NOT_FOUND);
    if (lesson.status === LessonStatus.DRAFT) {
      throw new ConflictException(LESSON_CLOSED);
    }
    const existing = await manager.getRepository(LessonAttempt).findOneBy({
      tenantId: ctx.tenantId,
      lessonId,
      lessonVersion: lesson.currentVersion,
      userId,
      classItemId,
    });
    if (existing) return existing.id;
    return this.insertAttempt(manager, ctx, userId, lesson, classItemId);
  }

  /** Dòng lượt học + các section trên version hiện tại của bài (đã khoá FOR SHARE). */
  private async insertAttempt(
    manager: EntityManager,
    ctx: TenantContext,
    userId: string,
    lesson: Lesson,
    classItemId: string | null,
  ): Promise<string> {
    const sections = await currentLessonSections(manager, lesson);
    if (sections.length === 0) throw new ConflictException(LESSON_CLOSED);
    const attempts = manager.getRepository(LessonAttempt);
    const attempt = await attempts.save(
      attempts.create({
        tenantId: ctx.tenantId,
        lessonId: lesson.id,
        lessonVersion: lesson.currentVersion,
        userId,
        membershipId: ctx.membershipId,
        classItemId,
        status: LessonAttemptStatus.IN_PROGRESS,
        startedAt: new Date(),
        completedAt: null,
        submittedAt: null,
        gradedAt: null,
        autoCorrect: 0,
        autoTotal: 0,
        manualCount: 0,
        manualGradedCount: 0,
      }),
    );
    await manager.getRepository(LessonAttemptSection).insert(
      insertable(
        sections.map(
          (section, sortOrder): LessonAttemptSection =>
            ({
              id: randomUUID(),
              attemptId: attempt.id,
              sectionId: section.id,
              sortOrder,
              status: LessonAttemptSectionStatus.OPEN,
              viewedAt: null,
              responses: emptyAttemptResponses(),
              recordings: {},
              orderSeed: randomInt(2 ** 31),
              submittedResponses: null,
              submittedAt: null,
              submitCount: 0,
              correct: null,
              total: null,
              manualCount: 0,
              manualGradedCount: 0,
            }) as LessonAttemptSection,
        ),
      ),
    );
    return attempt.id;
  }

  async get(
    ctx: TenantContext,
    userId: string,
    id: string,
  ): Promise<LessonAttemptView> {
    const manager = this.dataSource.manager;
    const attempt = await this.findOwn(manager, ctx, userId, id);
    const [lesson, sections, classOngoing] = await Promise.all([
      this.lessonOf(manager, attempt),
      this.attemptSections.findBy({ attemptId: id }),
      isAttemptClassOngoing(manager, attempt.classItemId),
    ]);
    return this.buildView({
      attempt,
      lesson,
      sections: sections.sort(bySortOrder),
      classOngoing,
    });
  }

  /** Mở tab section (điều kiện học xong). Lượt chỉ xem lại thì không ghi gì. */
  async view(
    ctx: TenantContext,
    userId: string,
    id: string,
    sectionId: string,
  ): Promise<LessonSectionViewResult> {
    const now = new Date();
    const { attempt, sections } = await this.mutate(
      ctx,
      userId,
      id,
      async (manager, locked) => {
        const target = findSection(locked.sections, sectionId);
        if (
          !canSubmitAttempt(locked.attempt, locked.lesson, locked.classOngoing)
        ) {
          return;
        }
        if (target.viewedAt) return;
        await manager
          .getRepository(LessonAttemptSection)
          .update(target.id, { viewedAt: now });
        target.viewedAt = now;
        await this.recountAttempt(manager, locked, now);
      },
    );
    const target = findSection(sections, sectionId);
    return {
      status: attempt.status,
      completedAt: attempt.completedAt?.toISOString() ?? null,
      viewedAt: target.viewedAt?.toISOString() ?? null,
    };
  }

  /** Autosave câu trả lời của section đang làm. */
  async saveResponses(
    ctx: TenantContext,
    userId: string,
    id: string,
    sectionId: string,
    responses: AttemptResponses,
  ): Promise<{ savedAt: string }> {
    const now = new Date();
    await this.mutate(ctx, userId, id, async (manager, locked) => {
      const target = findSection(locked.sections, sectionId);
      assertCanSubmit(locked);
      if (target.status !== LessonAttemptSectionStatus.OPEN) {
        throw new ConflictException(SECTION_SUBMITTED);
      }
      await manager
        .getRepository(LessonAttemptSection)
        .update(target.id, { responses: normalizeResponses(responses) });
    });
    return { savedAt: now.toISOString() };
  }

  /**
   * Nộp section: chấm, thay toàn bộ câu trả lời của lần nộp trước (điểm chấm
   * tay cũ bỏ – R20.5), chuyển ghi âm đang làm sang câu trả lời mới.
   */
  async submit(
    ctx: TenantContext,
    userId: string,
    id: string,
    sectionId: string,
    responses: AttemptResponses | undefined,
  ): Promise<LessonAttemptView> {
    const now = new Date();
    const obsoleteKeys: string[] = [];
    const locked = await this.mutate(
      ctx,
      userId,
      id,
      async (manager, locked) => {
        const target = findSection(locked.sections, sectionId);
        assertCanSubmit(locked);
        if (target.status !== LessonAttemptSectionStatus.OPEN) {
          throw new ConflictException(SECTION_SUBMITTED);
        }
        const questions = (
          await manager
            .getRepository(LessonQuestion)
            .findBy({ sectionId: target.sectionId })
        ).sort((a, b) => a.number - b.number);
        if (questions.length === 0) {
          throw new ConflictException(NO_QUESTIONS);
        }

        const answerRepository = manager.getRepository(LessonAttemptAnswer);
        const previous = await answerRepository.findBy({
          attemptSectionId: target.id,
        });
        obsoleteKeys.push(
          ...previous.flatMap((answer) =>
            answer.recordingKey ? [answer.recordingKey] : [],
          ),
        );
        if (previous.length > 0) {
          await answerRepository.delete({ attemptSectionId: target.id });
        }

        const finalResponses = normalizeResponses(
          responses ?? target.responses,
        );
        const graded = gradeSection(questions, finalResponses);
        const numberOf = new Map(questions.map((q) => [q.id, q.number]));
        const recordings = target.recordings ?? {};
        if (graded.answers.length > 0) {
          await answerRepository.insert(
            insertable(
              graded.answers.map(
                (answer): LessonAttemptAnswer =>
                  ({
                    id: randomUUID(),
                    attemptId: locked.attempt.id,
                    attemptSectionId: target.id,
                    questionId: answer.questionId,
                    response: answer.response,
                    isCorrect: answer.isCorrect,
                    score: answer.score,
                    comment: null,
                    recordingKey:
                      recordings[String(numberOf.get(answer.questionId))]
                        ?.key ?? null,
                    gradedBy: null,
                    gradedAt: null,
                  }) as LessonAttemptAnswer,
              ),
            ),
          );
        }
        // Ghi âm của câu không còn trong section (không nên xảy ra) thì xoá.
        const used = new Set(
          questions.map((question) => String(question.number)),
        );
        obsoleteKeys.push(
          ...Object.entries(recordings).flatMap(([number, recording]) =>
            used.has(number) ? [] : [recording.key],
          ),
        );

        const changes = {
          status: LessonAttemptSectionStatus.SUBMITTED,
          viewedAt: target.viewedAt ?? now,
          responses: finalResponses,
          recordings: {},
          submittedResponses: finalResponses,
          submittedAt: now,
          submitCount: target.submitCount + 1,
          correct: graded.correct,
          total: graded.total,
          manualCount: graded.manual,
          manualGradedCount: 0,
        };
        await manager
          .getRepository(LessonAttemptSection)
          .update(target.id, changes);
        Object.assign(target, changes);
        await this.recountAttempt(manager, locked, now);
        if (graded.manual > 0) {
          const lesson = await manager.getRepository(Lesson).findOne({
            where: { id: locked.attempt.lessonId },
            withDeleted: true,
          });
          await notifyPendingGrading(manager, this.notifications, {
            tenantId: locked.attempt.tenantId,
            attemptId: locked.attempt.id,
            kind: 'lesson',
            classItemId: locked.attempt.classItemId,
            authorId: lesson?.createdBy ?? null,
            studentUserId: locked.attempt.userId,
            title: lesson?.title ?? '',
            // Nộp lại section là một lần chờ chấm mới.
            dedupeKey: `lesson_pending:${target.id}:${changes.submitCount}`,
          });
        } else if (
          locked.attempt.status === LessonAttemptStatus.COMPLETED &&
          locked.attempt.manualCount === 0
        ) {
          // Bài không có câu chấm tay: học xong là đã có kết quả cuối cùng,
          // báo cho phụ huynh một lần cho mỗi lượt học (Step 13).
          const lesson = await manager.getRepository(Lesson).findOne({
            where: { id: locked.attempt.lessonId },
            withDeleted: true,
          });
          await notifyGuardiansAttemptGraded(manager, this.notifications, {
            tenantId: locked.attempt.tenantId,
            studentMembershipId: locked.attempt.membershipId,
            title: lesson?.title ?? '',
            dedupeKey: `child_lesson_done:${locked.attempt.id}`,
          });
        }
      },
    );
    await Promise.all(obsoleteKeys.map((key) => this.deleteRecording(key)));
    return this.buildView(locked);
  }

  /**
   * Làm lại section đã nộp: xoá câu trả lời đang làm, giữ kết quả lần nộp gần
   * nhất (xem lại được) cho tới khi nộp lần mới.
   */
  async retry(
    ctx: TenantContext,
    userId: string,
    id: string,
    sectionId: string,
  ): Promise<LessonAttemptView> {
    const locked = await this.mutate(
      ctx,
      userId,
      id,
      async (manager, locked) => {
        const target = findSection(locked.sections, sectionId);
        assertCanSubmit(locked);
        if (target.status === LessonAttemptSectionStatus.OPEN) return;
        const changes = {
          status: LessonAttemptSectionStatus.OPEN,
          responses: emptyAttemptResponses(),
          recordings: {},
        };
        await manager
          .getRepository(LessonAttemptSection)
          .update(target.id, changes);
        Object.assign(target, changes);
      },
    );
    return this.buildView(locked);
  }

  /** Ghi âm câu Speaking của section đang làm; ghi lại thì xoá file cũ. */
  async uploadRecording(
    ctx: TenantContext,
    userId: string,
    id: string,
    sectionId: string,
    number: number,
    file: UploadedFile | undefined,
  ): Promise<LessonDraftRecording> {
    if (!file) throw new BadRequestException(RECORDING_MISSING);
    const mimeType = (file.mimetype ?? '').split(';')[0].trim().toLowerCase();
    if (!RECORDING_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(RECORDING_TYPE);
    }
    if (file.size > RECORDING_MAX_BYTES) {
      throw new BadRequestException(RECORDING_TOO_LARGE);
    }

    // Kiểm trước khi tải lên để không đẩy file vô ích; kiểm lại trong transaction.
    const manager = this.dataSource.manager;
    const attempt = await this.findOwn(manager, ctx, userId, id);
    const [lesson, section, classOngoing] = await Promise.all([
      this.lessonOf(manager, attempt),
      this.attemptSections.findOneBy({ id: sectionId, attemptId: id }),
      isAttemptClassOngoing(manager, attempt.classItemId),
    ]);
    if (!section) throw new NotFoundException(SECTION_NOT_FOUND);
    assertOpenSection(
      { attempt, lesson, sections: [section], classOngoing },
      section,
    );
    const question = await manager
      .getRepository(LessonQuestion)
      .findOneBy({ sectionId: section.sectionId, number });
    if (!question || question.qtype !== 'speaking') {
      throw new BadRequestException(NOT_SPEAKING);
    }

    const key = lessonRecordingKey(
      ctx.tenantId,
      id,
      question.id,
      RECORDING_EXTENSIONS[mimeType],
    );
    await this.r2.put('private', key, file.buffer, mimeType);

    const uploadedAt = new Date().toISOString();
    let previousKey: string | null = null;
    try {
      await this.mutate(ctx, userId, id, async (manager, locked) => {
        const target = findSection(locked.sections, sectionId);
        assertOpenSection(locked, target);
        const recordings: DraftRecordings = { ...(target.recordings ?? {}) };
        previousKey = recordings[String(number)]?.key ?? null;
        recordings[String(number)] = { key, uploadedAt };
        await manager
          .getRepository(LessonAttemptSection)
          .update(target.id, { recordings });
      });
    } catch (error) {
      await this.deleteRecording(key);
      throw error;
    }
    if (previousKey) await this.deleteRecording(previousKey);
    return { number, uploadedAt };
  }

  /** Nghe lại ghi âm của lần đang làm. */
  async draftRecordingUrl(
    ctx: TenantContext,
    userId: string,
    id: string,
    sectionId: string,
    number: number,
  ): Promise<{ url: string }> {
    await this.findOwn(this.dataSource.manager, ctx, userId, id);
    const section = await this.attemptSections.findOneBy({
      id: sectionId,
      attemptId: id,
    });
    const key = section?.recordings?.[String(number)]?.key;
    if (!key) throw new NotFoundException(RECORDING_NOT_FOUND);
    return { url: await this.r2.presignedGetUrl(key) };
  }

  /** Nghe lại ghi âm đã nộp (lần nộp gần nhất). */
  async answerRecordingUrl(
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

  // --- Nội bộ ---------------------------------------------------------------

  private async findOwn(
    manager: EntityManager,
    ctx: TenantContext,
    userId: string,
    id: string,
  ): Promise<LessonAttempt> {
    const attempt = await manager
      .getRepository(LessonAttempt)
      .findOneBy({ id, tenantId: ctx.tenantId, userId });
    if (!attempt) throw new NotFoundException(LESSON_ATTEMPT_NOT_FOUND);
    return attempt;
  }

  private lessonOf(
    manager: EntityManager,
    attempt: LessonAttempt,
  ): Promise<Lesson | null> {
    // Bài bị xoá mềm vẫn hiện tên trong lượt học cũ.
    return manager
      .getRepository(Lesson)
      .findOne({ where: { id: attempt.lessonId }, withDeleted: true });
  }

  /** Transaction ghi: khoá lượt học rồi các section của nó, chạy `run`. */
  private mutate(
    ctx: TenantContext,
    userId: string,
    id: string,
    run: (manager: EntityManager, locked: LockedAttempt) => Promise<void>,
  ): Promise<LockedAttempt> {
    return this.dataSource.transaction(async (manager) => {
      const attempt = await manager.getRepository(LessonAttempt).findOne({
        where: { id, tenantId: ctx.tenantId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!attempt) throw new NotFoundException(LESSON_ATTEMPT_NOT_FOUND);
      const [lesson, sections, classOngoing] = await Promise.all([
        this.lessonOf(manager, attempt),
        manager.getRepository(LessonAttemptSection).find({
          where: { attemptId: id },
          lock: { mode: 'pessimistic_write' },
        }),
        isAttemptClassOngoing(manager, attempt.classItemId),
      ]);
      const locked = {
        attempt,
        lesson,
        sections: sections.sort(bySortOrder),
        classOngoing,
      };
      await run(manager, locked);
      return locked;
    });
  }

  /**
   * Tính lại số liệu lượt học từ các section (lần nộp gần nhất) và trạng thái
   * học xong. Cập nhật luôn object truyền vào.
   */
  private async recountAttempt(
    manager: EntityManager,
    { attempt, sections }: LockedAttempt,
    now: Date,
  ): Promise<void> {
    const lessonSections = await manager
      .getRepository(LessonSection)
      .findBy({ id: In(sections.map((section) => section.sectionId)) });
    const questionCount = new Map(
      lessonSections.map((section) => [section.id, section.questionCount]),
    );
    const changes = attemptTotals(sections, questionCount, attempt, now);
    await manager.getRepository(LessonAttempt).update(attempt.id, changes);
    Object.assign(attempt, changes);
  }

  private async buildView({
    attempt,
    lesson,
    sections,
    classOngoing,
  }: LockedAttempt): Promise<LessonAttemptView> {
    const manager = this.dataSource.manager;
    const sectionIds = sections.map((section) => section.sectionId);
    const [lessonSections, questions, answers] = await Promise.all([
      manager.getRepository(LessonSection).findBy({ id: In(sectionIds) }),
      manager
        .getRepository(LessonQuestion)
        .findBy({ sectionId: In(sectionIds) }),
      this.answers.findBy({ attemptId: attempt.id }),
    ]);
    const lessonSectionById = new Map(lessonSections.map((s) => [s.id, s]));

    return {
      id: attempt.id,
      lesson: { id: attempt.lessonId, title: lesson?.title ?? '' },
      lessonVersion: attempt.lessonVersion,
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      completedAt: attempt.completedAt?.toISOString() ?? null,
      canSubmit: canSubmitAttempt(attempt, lesson, classOngoing),
      sections: sections.map((section) =>
        toSectionView(
          section,
          lessonSectionById.get(section.sectionId)!,
          questions
            .filter((q) => q.sectionId === section.sectionId)
            .sort((a, b) => a.number - b.number),
          answers.filter((a) => a.attemptSectionId === section.id),
        ),
      ),
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
  sections: readonly LessonAttemptSection[],
  sectionId: string,
): LessonAttemptSection {
  const section = sections.find((item) => item.id === sectionId);
  if (!section) throw new NotFoundException(SECTION_NOT_FOUND);
  return section;
}

function assertCanSubmit({
  attempt,
  lesson,
  classOngoing,
}: LockedAttempt): void {
  if (!canSubmitAttempt(attempt, lesson, classOngoing)) {
    throw new ConflictException(
      attempt.classItemId !== null && !classOngoing
        ? CLASSROOM_NOT_ONGOING
        : READ_ONLY,
    );
  }
}

function assertOpenSection(
  locked: LockedAttempt,
  section: LessonAttemptSection,
): void {
  assertCanSubmit(locked);
  if (section.status !== LessonAttemptSectionStatus.OPEN) {
    throw new ConflictException(SECTION_SUBMITTED);
  }
}

/**
 * Số liệu lượt học = cộng lần nộp gần nhất của các section. Học xong khi mọi
 * section đã mở và mọi section có câu hỏi đã nộp ít nhất một lần (A7); đã học
 * xong thì giữ nguyên.
 */
export function attemptTotals(
  sections: readonly LessonAttemptSection[],
  questionCount: ReadonlyMap<string, number>,
  attempt: Pick<LessonAttempt, 'status' | 'completedAt' | 'gradedAt'>,
  now: Date,
): Partial<LessonAttempt> {
  const submitted = sections.filter((section) => section.submitCount > 0);
  const sum = (pick: (section: LessonAttemptSection) => number) =>
    submitted.reduce((total, section) => total + pick(section), 0);
  const manualCount = sum((section) => section.manualCount);
  const manualGradedCount = sum((section) => section.manualGradedCount);
  const lastSubmitted = submitted
    .map((section) => section.submittedAt!.getTime())
    .reduce((max, time) => Math.max(max, time), 0);
  const complete = sections.every(
    (section) =>
      section.viewedAt !== null &&
      ((questionCount.get(section.sectionId) ?? 0) === 0 ||
        section.submitCount > 0),
  );
  const fullyGraded = manualCount > 0 && manualGradedCount >= manualCount;
  return {
    autoCorrect: sum((section) => section.correct ?? 0),
    autoTotal: sum((section) => section.total ?? 0),
    manualCount,
    manualGradedCount,
    submittedAt: lastSubmitted > 0 ? new Date(lastSubmitted) : null,
    gradedAt: fullyGraded ? (attempt.gradedAt ?? now) : null,
    ...(complete && attempt.status !== LessonAttemptStatus.COMPLETED
      ? { status: LessonAttemptStatus.COMPLETED, completedAt: now }
      : {}),
  };
}

/** Dùng lại ở trang bài làm chi tiết của học viên (req-3 Step 10, F4). */
export function toSectionView(
  section: LessonAttemptSection,
  lessonSection: LessonSection,
  questions: readonly LessonQuestion[],
  answers: readonly LessonAttemptAnswer[],
): LessonAttemptSectionView {
  return {
    id: section.id,
    name: lessonSection.name,
    questionCount: lessonSection.questionCount,
    status: section.status,
    viewedAt: section.viewedAt?.toISOString() ?? null,
    submitCount: section.submitCount,
    content: shuffleOrdering(
      lessonSection.contentPublic as ExamElement[],
      section.orderSeed,
      questions.map(toGradable),
    ),
    responses: normalizeResponses(section.responses),
    recordings: Object.entries(section.recordings ?? {}).map(
      ([number, recording]) => ({
        number: Number(number),
        uploadedAt: recording.uploadedAt,
      }),
    ),
    // Đáp án và giải thích chỉ có sau khi nộp.
    result:
      section.submitCount > 0 && section.submittedAt
        ? toSectionResult(section, lessonSection, questions, answers)
        : null,
  };
}

function toSectionResult(
  section: LessonAttemptSection,
  lessonSection: LessonSection,
  questions: readonly LessonQuestion[],
  answers: readonly LessonAttemptAnswer[],
): LessonSectionResult {
  const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]));
  return {
    submittedAt: section.submittedAt!.toISOString(),
    correct: section.correct ?? 0,
    total: section.total ?? 0,
    manualCount: section.manualCount,
    manualGradedCount: section.manualGradedCount,
    responses: normalizeResponses(
      section.submittedResponses ?? emptyAttemptResponses(),
    ),
    questions: questions.map((question) => {
      const answer = answerByQuestion.get(question.id);
      const manual = question.grading === QuestionGrading.MANUAL;
      return {
        number: question.number,
        qtype: question.qtype,
        verdict: manual ? 'manual' : answer?.isCorrect ? 'correct' : 'wrong',
        answerKey: manual ? null : question.answerKey,
        maxScore: question.maxScore,
        score: manual
          ? answer?.gradedAt
            ? answer.score
            : null
          : (answer?.score ?? 0),
        comment: answer?.gradedAt ? answer.comment : null,
        gradedAt: answer?.gradedAt?.toISOString() ?? null,
        recordingAnswerId: answer?.recordingKey ? answer.id : null,
      };
    }),
    explanations: (lessonSection.explanations ?? []).map((item) => ({
      nodeId: item.nodeId,
      numbers: item.numbers,
      blocks: item.blocks,
    })),
  };
}
