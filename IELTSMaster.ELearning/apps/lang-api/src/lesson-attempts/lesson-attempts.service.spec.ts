import 'reflect-metadata';
import type { ExamElement, ExamValue } from '@lang/exam-core';
import {
  ClassroomStatus,
  ContentVisibility,
  LessonAttemptSectionStatus,
  LessonAttemptStatus,
  LessonSectionStatus,
  LessonStatus,
  TenantRole,
  TenantStatus,
  type AttemptResponses,
  type LessonAttemptView,
} from '@lang/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ClassItem } from '../classrooms/class-item.entity';
import { ClassroomTeacher } from '../classrooms/classroom-teacher.entity';
import { Classroom } from '../classrooms/classroom.entity';
import { GradingDelegation } from '../grading/grading-delegation.entity';
import { LessonGradingService } from '../grading/lesson-grading.service';
import { LessonPart } from '../lessons/lesson-part.entity';
import { Membership } from '../memberships/membership.entity';
import { StudentGuardian } from '../memberships/student-guardian.entity';
import { LessonQuestion } from '../lessons/lesson-question.entity';
import { prepareLessonSection } from '../lessons/lesson-section-content';
import { LessonSection } from '../lessons/lesson-section.entity';
import { Lesson } from '../lessons/lesson.entity';
import type { UploadedFile } from '../storage/media-file';
import type { R2Service } from '../storage/r2.service';
import type { TenantContext } from '../tenants/tenant-context';
import { Tenant } from '../tenants/tenant.entity';
import { fakeNotifications } from '../testing/fake-notifications';
import { InMemoryDataSource } from '../testing/in-memory-data-source';
import { InMemoryRepository } from '../testing/in-memory-repository';
import { User } from '../users/user.entity';
import { LessonAttemptAnswer } from './lesson-attempt-answer.entity';
import { LessonAttemptSection } from './lesson-attempt-section.entity';
import { LessonAttempt } from './lesson-attempt.entity';
import { LessonAttemptsService } from './lesson-attempts.service';

const TENANT = 'tenant-a';
const STUDENT = 'user-student';
const OTHER = 'user-other';
const TEACHER = 'user-teacher';
const LESSON = 'lesson-1';

const ctx: TenantContext = {
  tenantId: TENANT,
  slug: 'a',
  name: 'A',
  status: TenantStatus.ACTIVE,
  membershipId: 'membership',
  roles: [TenantRole.STUDENT],
  permissions: [],
};
const teacherCtx: TenantContext = { ...ctx, roles: [TenantRole.TEACHER] };

// --- Nội dung bài học ---------------------------------------------------------

const t = (text: string) => ({ text });
const p = (text: string, props: Record<string, unknown> = {}): ExamElement => ({
  type: 'p',
  ...props,
  children: [t(text)],
});
const indicator = (id: string, kind: string, props = {}): ExamElement => ({
  type: 'indicator',
  id,
  kind,
  ...props,
  children: [t('')],
});
const todo = (label: string, checked = false) =>
  p(label, { listStyleType: 'todo', indent: 1, checked });

const BLANK_ANSWER = 'taberu';
const EXPLANATION = 'Giải thích bí mật';

// Section 0: lý thuyết, không câu hỏi.
const vocabulary: ExamValue = [
  p('Từ vựng bài 1'),
  { type: 'callout', variant: 'note', children: [t('Lưu ý')] },
];
// Section 1: MC (có giải thích) + blank = 2 câu tự động.
const exercises: ExamValue = [
  indicator('part-1', 'part'),
  indicator('q-mc', 'question', { qtype: 'mc-single' }),
  p('Chọn một'),
  todo('A'),
  todo('B', true),
  indicator('e-mc', 'explanation'),
  p(EXPLANATION),
  indicator('q-blank', 'question', { qtype: 'fill-blank' }),
  {
    type: 'p',
    children: [t('Ăn: '), { type: 'blank', children: [t(BLANK_ANSWER)] }],
  },
];
// Section 2: writing + speaking = 2 câu chấm tay.
const speaking: ExamValue = [
  indicator('part-2', 'part'),
  indicator('q-write', 'question', { qtype: 'writing', maxChars: 200 }),
  p('Viết giới thiệu'),
  indicator('q-speak', 'question', { qtype: 'speaking', seconds: 30 }),
  p('Nói giới thiệu'),
];

const correct: AttemptResponses = {
  value: { 2: BLANK_ANSWER },
  picks: { 1: [1] },
  order: {},
};
const wrong: AttemptResponses = {
  value: { 2: 'nomu' },
  picks: { 1: [0] },
  order: {},
};

function audio(): UploadedFile {
  return {
    buffer: Buffer.from('audio'),
    mimetype: 'audio/webm',
    size: 5,
    originalname: 'a.webm',
  } as UploadedFile;
}

// --- Dựng service ---------------------------------------------------------------

function setup({
  status = LessonStatus.PUBLISHED as LessonStatus,
  visibility = ContentVisibility.TENANT as ContentVisibility,
} = {}) {
  const timestamps = () => ({ createdAt: new Date(), updatedAt: new Date() });
  const lessons = new InMemoryRepository<Lesson>(timestamps);
  const sections = new InMemoryRepository<LessonSection>();
  const parts = new InMemoryRepository<LessonPart>();
  const questions = new InMemoryRepository<LessonQuestion>();
  const attempts = new InMemoryRepository<LessonAttempt>(timestamps);
  const attemptSections = new InMemoryRepository<LessonAttemptSection>();
  const answers = new InMemoryRepository<LessonAttemptAnswer>();
  const users = new InMemoryRepository<User>();
  // `insert` của repository giả không chạy default của cột.
  const insertAnswers = answers.insert.bind(answers);
  answers.insert = (rows) =>
    insertAnswers(
      (Array.isArray(rows) ? rows : [rows]).map((row) =>
        Object.assign({ createdAt: new Date(), updatedAt: new Date() }, row),
      ),
    );
  users.rows.push(
    { id: STUDENT, fullName: 'Học Viên', email: 'hv@x.vn' } as User,
    { id: TEACHER, fullName: 'Giáo Viên', email: 'gv@x.vn' } as User,
  );

  lessons.rows.push({
    id: LESSON,
    tenantId: TENANT,
    blueprintId: 'blueprint',
    title: 'Minna bài 1',
    description: null,
    visibility,
    clonedFromId: null,
    status,
    currentVersion: 1,
    contentRevision: 1,
    publishedAt: new Date(),
    createdBy: TEACHER,
    updatedBy: TEACHER,
    deletedAt: null,
    ...timestamps(),
  });
  const addVersion = (version: number) =>
    [
      { name: 'Từ vựng', rawData: vocabulary },
      { name: 'Bài tập', rawData: exercises },
      { name: 'Luyện nói', rawData: speaking },
    ].forEach((draft, sortOrder) => {
      const prepared = prepareLessonSection(
        { moduleId: null, ...draft },
        { lessonId: LESSON, version, sortOrder, createdBy: TEACHER },
      );
      sections.rows.push({ ...prepared.section, createdAt: new Date() });
      parts.rows.push(...prepared.parts);
      questions.rows.push(...prepared.questions);
    });
  addVersion(1);

  const r2 = {
    put: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    presignedGetUrl: jest.fn().mockResolvedValue('https://r2/signed'),
  };
  const classItems = new InMemoryRepository<ClassItem>();
  const classrooms = new InMemoryRepository<Classroom>();
  // Thông báo (Step 12) đọc tenant để dựng đường dẫn.
  const tenants = new InMemoryRepository<Tenant>();
  tenants.rows.push({ id: TENANT, slug: 'a', name: 'A' } as Tenant);
  const dataSource = new InMemoryDataSource()
    .register(Lesson, lessons)
    .register(LessonSection, sections)
    .register(LessonPart, parts)
    .register(LessonQuestion, questions)
    .register(LessonAttempt, attempts)
    .register(LessonAttemptSection, attemptSections)
    .register(LessonAttemptAnswer, answers)
    .register(User, users)
    .register(Tenant, tenants)
    .register(ClassItem, classItems)
    .register(Classroom, classrooms)
    .register(ClassroomTeacher, new InMemoryRepository<ClassroomTeacher>())
    .register(GradingDelegation, new InMemoryRepository<GradingDelegation>())
    .register(Membership, new InMemoryRepository<Membership>())
    .register(StudentGuardian, new InMemoryRepository<StudentGuardian>())
    .asDataSource();
  const notifications = fakeNotifications();
  const service = new LessonAttemptsService(
    dataSource,
    r2 as unknown as R2Service,
    attempts.asRepository(),
    attemptSections.asRepository(),
    answers.asRepository(),
    notifications.service,
  );
  const grading = new LessonGradingService(
    dataSource,
    r2 as unknown as R2Service,
    attempts.asRepository(),
    answers.asRepository(),
    notifications.service,
  );
  /** Bài học có version mới: section cũ ngừng dùng. */
  const publishNewVersion = () => {
    for (const row of sections.rows)
      row.status = LessonSectionStatus.DEACTIVATED;
    lessons.rows[0].currentVersion = 2;
    addVersion(2);
  };
  return {
    service,
    grading,
    r2,
    lessons,
    attempts,
    attemptSections,
    answers,
    classItems,
    classrooms,
    publishNewVersion,
  };
}

const ids = (view: LessonAttemptView) => view.sections.map((s) => s.id);

describe('LessonAttemptsService', () => {
  it('mở bài: mọi section mở cùng lúc, không lộ đáp án/giải thích; mở lại dùng lượt cũ', async () => {
    const { service, attempts } = setup();
    const view = await service.start(ctx, STUDENT, LESSON);

    expect(view).toMatchObject({
      lesson: { id: LESSON, title: 'Minna bài 1' },
      lessonVersion: 1,
      status: LessonAttemptStatus.IN_PROGRESS,
      canSubmit: true,
    });
    expect(view.sections.map((s) => [s.name, s.questionCount])).toEqual([
      ['Từ vựng', 0],
      ['Bài tập', 2],
      ['Luyện nói', 2],
    ]);
    expect(
      view.sections.every(
        (s) => s.status === LessonAttemptSectionStatus.OPEN && !s.result,
      ),
    ).toBe(true);
    const json = JSON.stringify(view);
    expect(json).not.toContain(EXPLANATION);
    expect(json).not.toContain(BLANK_ANSWER);
    expect(json).not.toContain('"checked":true');

    const again = await service.start(ctx, STUDENT, LESSON);
    expect(again.id).toBe(view.id);
    await service.start(ctx, OTHER, LESSON);
    expect(attempts.rows).toHaveLength(2);
    await expect(service.get(ctx, OTHER, view.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('bài nháp/private → 404, bài lưu trữ → 409', async () => {
    await expect(
      setup({ status: LessonStatus.DRAFT }).service.start(ctx, STUDENT, LESSON),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      setup({ visibility: ContentVisibility.PRIVATE }).service.start(
        ctx,
        STUDENT,
        LESSON,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      setup({ status: LessonStatus.ARCHIVED }).service.start(
        ctx,
        STUDENT,
        LESSON,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('nộp section: chấm từ bản autosave, trả đáp án + đúng/sai + giải thích', async () => {
    const { service, answers } = setup();
    const view = await service.start(ctx, STUDENT, LESSON);
    const [, exercise] = ids(view);

    await service.saveResponses(ctx, STUDENT, view.id, exercise, {
      value: { 2: 'nomu' },
      picks: { 1: [1] },
      order: {},
    });
    const submitted = await service.submit(
      ctx,
      STUDENT,
      view.id,
      exercise,
      undefined,
    );
    const section = submitted.sections[1];
    expect(section.status).toBe(LessonAttemptSectionStatus.SUBMITTED);
    expect(section.submitCount).toBe(1);
    expect(section.viewedAt).not.toBeNull();
    expect(section.result).toMatchObject({
      correct: 1,
      total: 2,
      manualCount: 0,
      responses: { value: { 2: 'nomu' }, picks: { 1: [1] } },
    });
    expect(
      section.result!.questions.map((q) => [q.number, q.verdict, q.answerKey]),
    ).toEqual([
      [1, 'correct', { indexes: [1] }],
      [2, 'wrong', { accepted: [BLANK_ANSWER] }],
    ]);
    expect(section.result!.explanations).toEqual([
      expect.objectContaining({ nodeId: 'e-mc', numbers: [1] }),
    ]);
    expect(JSON.stringify(section.result!.explanations)).toContain(EXPLANATION);
    // Section khác chưa nộp vẫn không có kết quả.
    expect(submitted.sections[2].result).toBeNull();
    expect(answers.rows).toHaveLength(2);

    // Đã nộp: không autosave/nộp lại được khi chưa bấm Làm lại.
    await expect(
      service.saveResponses(ctx, STUDENT, view.id, exercise, correct),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.submit(ctx, STUDENT, view.id, exercise, correct),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('làm lại: xoá bản đang làm, giữ kết quả cũ tới khi nộp lần mới', async () => {
    const { service, answers, attempts } = setup();
    const view = await service.start(ctx, STUDENT, LESSON);
    const [, exercise] = ids(view);
    await service.submit(ctx, STUDENT, view.id, exercise, wrong);

    const retried = await service.retry(ctx, STUDENT, view.id, exercise);
    const section = retried.sections[1];
    expect(section.status).toBe(LessonAttemptSectionStatus.OPEN);
    expect(section.responses).toEqual({ value: {}, picks: {}, order: {} });
    expect(section.result).toMatchObject({ correct: 0, total: 2 });

    const resubmitted = await service.submit(
      ctx,
      STUDENT,
      view.id,
      exercise,
      correct,
    );
    expect(resubmitted.sections[1]).toMatchObject({
      submitCount: 2,
      result: { correct: 2, total: 2 },
    });
    // Chỉ giữ câu trả lời của lần nộp gần nhất.
    expect(answers.rows).toHaveLength(2);
    expect(answers.rows.every((row) => row.isCorrect)).toBe(true);
    expect(attempts.rows[0]).toMatchObject({ autoCorrect: 2, autoTotal: 2 });
  });

  it('section không có câu hỏi không nộp được', async () => {
    const { service } = setup();
    const view = await service.start(ctx, STUDENT, LESSON);
    await expect(
      service.submit(ctx, STUDENT, view.id, view.sections[0].id, correct),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('học xong: mở hết section và nộp đủ section có câu hỏi; làm lại không bỏ', async () => {
    const { service } = setup();
    const view = await service.start(ctx, STUDENT, LESSON);
    const [vocab, exercise, talk] = ids(view);

    // Nộp tự đánh dấu đã mở.
    await service.submit(ctx, STUDENT, view.id, exercise, correct);
    await service.submit(ctx, STUDENT, view.id, talk, undefined);
    let current = await service.get(ctx, STUDENT, view.id);
    expect(current.status).toBe(LessonAttemptStatus.IN_PROGRESS);

    const viewed = await service.view(ctx, STUDENT, view.id, vocab);
    expect(viewed.status).toBe(LessonAttemptStatus.COMPLETED);
    expect(viewed.completedAt).not.toBeNull();

    await service.retry(ctx, STUDENT, view.id, exercise);
    current = await service.get(ctx, STUDENT, view.id);
    expect(current.status).toBe(LessonAttemptStatus.COMPLETED);
  });

  it('bài có version mới: lượt cũ chỉ xem lại, mở bài tạo lượt trên version mới', async () => {
    const { service, publishNewVersion } = setup();
    const old = await service.start(ctx, STUDENT, LESSON);
    await service.submit(ctx, STUDENT, old.id, old.sections[1].id, correct);
    publishNewVersion();

    const readOnly = await service.get(ctx, STUDENT, old.id);
    expect(readOnly.canSubmit).toBe(false);
    expect(readOnly.sections[1].result).not.toBeNull();
    await expect(
      service.retry(ctx, STUDENT, old.id, old.sections[1].id),
    ).rejects.toBeInstanceOf(ConflictException);
    // Mở tab ở lượt chỉ xem lại không ghi gì.
    const viewed = await service.view(ctx, STUDENT, old.id, old.sections[0].id);
    expect(viewed.viewedAt).toBeNull();

    const fresh = await service.start(ctx, STUDENT, LESSON);
    expect(fresh.id).not.toBe(old.id);
    expect(fresh).toMatchObject({ lessonVersion: 2, canSubmit: true });
  });

  it('bài chuyển private: lượt đã có chỉ xem lại', async () => {
    const { service, lessons } = setup();
    const view = await service.start(ctx, STUDENT, LESSON);
    lessons.rows[0].visibility = ContentVisibility.PRIVATE;
    expect((await service.get(ctx, STUDENT, view.id)).canSubmit).toBe(false);
    await expect(
      service.saveResponses(
        ctx,
        STUDENT,
        view.id,
        view.sections[1].id,
        correct,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('ghi âm: lưu bản đang làm, nộp thì chuyển sang câu trả lời', async () => {
    const { service, r2, answers } = setup();
    const view = await service.start(ctx, STUDENT, LESSON);
    const talk = view.sections[2].id;

    await expect(
      service.uploadRecording(ctx, STUDENT, view.id, talk, 1, audio()),
    ).rejects.toBeInstanceOf(BadRequestException); // câu 1 là Writing
    await service.uploadRecording(ctx, STUDENT, view.id, talk, 2, audio());
    await service.uploadRecording(ctx, STUDENT, view.id, talk, 2, audio());
    const [firstKey, secondKey] = r2.put.mock.calls.map((call) => call[1]);
    expect(firstKey).toMatch(
      new RegExp(`^tenants/${TENANT}/lesson-attempts/${view.id}/`),
    );
    // Ghi lại thì xoá file cũ.
    expect(r2.delete).toHaveBeenCalledWith('private', firstKey);
    const draft = await service.get(ctx, STUDENT, view.id);
    expect(draft.sections[2].recordings).toEqual([
      expect.objectContaining({ number: 2 }),
    ]);
    await expect(
      service.draftRecordingUrl(ctx, STUDENT, view.id, talk, 2),
    ).resolves.toEqual({ url: 'https://r2/signed' });

    const submitted = await service.submit(ctx, STUDENT, view.id, talk, {
      value: { 1: 'Watashi wa…' },
      picks: {},
      order: {},
    });
    const result = submitted.sections[2].result!;
    expect(result.questions.map((q) => q.verdict)).toEqual([
      'manual',
      'manual',
    ]);
    expect(result.questions[1].recordingAnswerId).not.toBeNull();
    expect(submitted.sections[2].recordings).toEqual([]);
    expect(answers.rows.find((row) => row.recordingKey)?.recordingKey).toBe(
      secondKey,
    );
  });

  it('chấm tay bài học: đếm lại theo lần nộp gần nhất; nộp lại bỏ bản chấm cũ', async () => {
    const { service, grading, r2, attempts } = setup();
    const view = await service.start(ctx, STUDENT, LESSON);
    const talk = view.sections[2].id;
    await service.uploadRecording(ctx, STUDENT, view.id, talk, 2, audio());
    const recordingKey = r2.put.mock.calls[0][1] as string;
    await service.submit(ctx, STUDENT, view.id, talk, {
      value: { 1: 'Bài viết' },
      picks: {},
      order: {},
    });

    const detail = await grading.detail(teacherCtx, TEACHER, view.id);
    expect(detail).toMatchObject({
      lesson: { id: LESSON, title: 'Minna bài 1' },
      student: { userId: STUDENT },
      status: 'submitted',
      manualCount: 2,
      manualGradedCount: 0,
    });
    const [writeQ, speakQ] = detail.sections[0].questions;
    expect(writeQ).toMatchObject({ number: 1, text: 'Bài viết' });
    expect(speakQ).toMatchObject({ number: 2, hasRecording: true });
    // Học viên không chấm bài của mình.
    await expect(
      grading.grade(ctx, STUDENT, writeQ.answerId, { score: 5 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(grading.detail(ctx, STUDENT, view.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    await grading.grade(teacherCtx, TEACHER, writeQ.answerId, { score: 7 });
    // Chấm lại không cộng dồn.
    await grading.grade(teacherCtx, TEACHER, writeQ.answerId, {
      score: 8,
      comment: 'Tốt',
    });
    const graded = await grading.grade(teacherCtx, TEACHER, speakQ.answerId, {
      score: 6,
    });
    expect(graded.attempt).toMatchObject({
      status: 'graded',
      manualCount: 2,
      manualGradedCount: 2,
    });
    expect(attempts.rows[0].gradedAt).not.toBeNull();
    const learner = await service.get(ctx, STUDENT, view.id);
    expect(learner.sections[2].result!.questions[0]).toMatchObject({
      score: 8,
      comment: 'Tốt',
    });

    // Nộp lại: điểm cũ bỏ, ghi âm cũ xoá, câu trả lời cũ không chấm được nữa.
    await service.retry(ctx, STUDENT, view.id, talk);
    await service.submit(ctx, STUDENT, view.id, talk, undefined);
    expect(r2.delete).toHaveBeenCalledWith('private', recordingKey);
    expect(attempts.rows[0]).toMatchObject({
      manualCount: 2,
      manualGradedCount: 0,
      gradedAt: null,
    });
    await expect(
      grading.grade(teacherCtx, TEACHER, writeQ.answerId, { score: 5 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lượt học trong lớp: lớp kết thúc thì không nộp được nữa (T6.3)', async () => {
    const { service, attempts, classItems, classrooms } = setup();
    const view = await service.start(ctx, STUDENT, LESSON);
    const [, , talk] = view.sections.map((section) => section.id);
    // Gắn lượt vào mục của lớp đã kết thúc.
    attempts.rows[0].classItemId = 'item-1';
    classItems.rows.push({ id: 'item-1', classroomId: 'class-1' } as ClassItem);
    classrooms.rows.push({
      id: 'class-1',
      status: ClassroomStatus.FINISHED,
    } as Classroom);

    const closed = await service.get(ctx, STUDENT, view.id);
    expect(closed.canSubmit).toBe(false);
    await expect(
      service.submit(ctx, STUDENT, view.id, talk, undefined),
    ).rejects.toThrow(/không còn nhận bài/);

    // Lớp mở lại thì học tiếp được, kể cả bài chỉ hiển thị qua lớp.
    await classrooms.update(
      { id: 'class-1' },
      { status: ClassroomStatus.ONGOING },
    );
    const open = await service.get(ctx, STUDENT, view.id);
    expect(open.canSubmit).toBe(true);
  });
});
