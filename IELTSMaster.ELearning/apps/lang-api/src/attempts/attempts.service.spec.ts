import 'reflect-metadata';
import {
  bestWeightIndex,
  buildPlan,
  gradeExam,
  type ExamElement,
  type ExamValue,
} from '@lang/exam-core';
import {
  AttemptSectionStatus,
  NotificationType,
  AttemptStatus,
  ClassroomStatus,
  ContentVisibility,
  ExamStatus,
  TenantRole,
  TenantStatus,
  type AttemptResponses,
  type AttemptView,
} from '@lang/shared';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Exam } from '../exams/exam.entity';
import { ExamPart } from '../exams/exam-part.entity';
import { ExamQuestion } from '../exams/exam-question.entity';
import { ExamSection } from '../exams/exam-section.entity';
import { prepareSection } from '../exams/section-content';
import type { R2Service } from '../storage/r2.service';
import type { UploadedFile } from '../storage/media-file';
import type { TenantContext } from '../tenants/tenant-context';
import { fakeDate } from '../testing/fake-clock';
import { ClassItem } from '../classrooms/class-item.entity';
import { Classroom } from '../classrooms/classroom.entity';
import { fakeNotifications } from '../testing/fake-notifications';
import { InMemoryDataSource } from '../testing/in-memory-data-source';
import { InMemoryRepository } from '../testing/in-memory-repository';
import { isAttemptResponses, responseOf } from './attempt-grading';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
import { AttemptsService } from './attempts.service';
import { ExamAttemptAnswer } from './exam-attempt-answer.entity';
import { ExamAttemptSection } from './exam-attempt-section.entity';
import { ExamAttempt } from './exam-attempt.entity';

const TENANT = 'tenant-a';
const STUDENT = 'user-student';
const OTHER = 'user-other';
const EXAM = 'exam-1';

const ctx: TenantContext = {
  tenantId: TENANT,
  slug: 'a',
  name: 'A',
  status: TenantStatus.ACTIVE,
  membershipId: 'membership',
  roles: [TenantRole.STUDENT],
  permissions: [],
};

// --- Nội dung đề --------------------------------------------------------------

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
const orderingItem = (label: string, num: number) =>
  p(label, { listStyleType: 'ordering', num });

const BLANK_ANSWER = 'riverbank';
const PAIR_ANSWER = 'Not Given';
const EXPLANATION = 'Giải thích bí mật';

// Section 1 (30 phút): 1 MC, 2 pick-n, 1 blank, 1 TFNG, 1 ordering = 6 câu.
const listening: ExamValue = [
  p('Hướng dẫn phần nghe'),
  indicator('part-1', 'part'),
  p('Đoạn văn'),
  indicator('q-mc', 'question', { qtype: 'mc-single' }),
  p('Chọn một'),
  todo('A'),
  todo('B', true),
  todo('C'),
  indicator('q-pick', 'question', { qtype: 'pick-n', maxPicks: 2 }),
  todo('A', true),
  todo('B'),
  todo('C', true),
  indicator('q-blank', 'question', { qtype: 'fill-blank' }),
  {
    type: 'p',
    children: [
      t('Nhà ở '),
      { type: 'blank', children: [t(`${BLANK_ANSWER}|bank`)] },
    ],
  },
  indicator('q-tfng', 'question', { qtype: 'tfng' }),
  { type: 'pair', id: 'pair-1', answer: PAIR_ANSWER, children: [t('Ý 1')] },
  indicator('e-tfng', 'explanation'),
  p(EXPLANATION),
  indicator('q-order', 'question', { qtype: 'ordering' }),
  orderingItem('Thứ hai', 2),
  orderingItem('Thứ nhất', 1),
  orderingItem('Thứ ba', 3),
];

// Section 2 (15 phút): writing, speaking, MC = 3 câu, 2 chấm tay.
const writing: ExamValue = [
  p('Hướng dẫn phần viết'),
  indicator('part-2', 'part'),
  indicator('q-write', 'question', { qtype: 'writing', maxChars: 500 }),
  p('Viết đoạn văn'),
  indicator('q-speak', 'question', { qtype: 'speaking', seconds: 60 }),
  p('Nói về bạn'),
  indicator('q-mc2', 'question', { qtype: 'mc-single' }),
  todo('Có', true),
  todo('Không'),
];

/** Câu trả lời đúng hết, dựng từ đáp án đã tách. */
function correctResponses(
  questions: readonly ExamQuestion[],
): AttemptResponses {
  const responses: AttemptResponses = { value: {}, picks: {}, order: {} };
  for (const q of questions) {
    const key = q.answerKey as unknown as Record<string, never>;
    switch (q.qtype) {
      case 'mc-single':
      case 'mc-multi':
        responses.picks[q.number] = key.indexes;
        break;
      case 'pick-n':
        responses.picks[q.number - (key.pickIndex as number)] = key.indexes;
        break;
      case 'polytomous':
        responses.picks[q.number] = [bestWeightIndex(key.weights)];
        break;
      case 'ordering':
        responses.order[q.number] = key.order;
        break;
      case 'matching':
      case 'tfng':
      case 'ynng':
        responses.value[q.number] = key.answer;
        break;
      case 'fill-blank':
        responses.value[q.number] = (key.accepted as string[])[0];
        break;
    }
  }
  return responses;
}

// --- Dựng service ---------------------------------------------------------------

function setup({
  status = ExamStatus.PUBLISHED as ExamStatus,
  visibility = ContentVisibility.TENANT as ContentVisibility,
} = {}) {
  const timestamps = () => ({ createdAt: new Date(), updatedAt: new Date() });
  const exams = new InMemoryRepository<Exam>(timestamps);
  const sections = new InMemoryRepository<ExamSection>();
  const parts = new InMemoryRepository<ExamPart>();
  const questions = new InMemoryRepository<ExamQuestion>();
  const attempts = new InMemoryRepository<ExamAttempt>(timestamps);
  const attemptSections = new InMemoryRepository<ExamAttemptSection>();
  const answers = new InMemoryRepository<ExamAttemptAnswer>();
  // `insert` của repository giả không chạy default của cột.
  const insertAnswers = answers.insert.bind(answers);
  answers.insert = (rows) =>
    insertAnswers(
      (Array.isArray(rows) ? rows : [rows]).map((row) =>
        Object.assign({ createdAt: new Date(), updatedAt: new Date() }, row),
      ),
    );

  exams.rows.push({
    id: EXAM,
    tenantId: TENANT,
    blueprintId: 'blueprint',
    title: 'Đề thử',
    description: null,
    visibility,
    clonedFromId: null,
    status,
    currentVersion: 1,
    contentRevision: 1,
    publishedAt: new Date(),
    createdBy: 'teacher',
    updatedBy: 'teacher',
    deletedAt: null,
    ...timestamps(),
  });
  [
    { name: 'Listening', durationMinutes: 30, rawData: listening },
    { name: 'Writing', durationMinutes: 15, rawData: writing },
  ].forEach((draft, sortOrder) => {
    const prepared = prepareSection(
      { moduleId: null, ...draft },
      { examId: EXAM, version: 1, sortOrder, createdBy: 'teacher' },
    );
    sections.rows.push({ ...prepared.section, createdAt: new Date() });
    parts.rows.push(...prepared.parts);
    questions.rows.push(...prepared.questions);
  });

  const r2 = {
    put: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    presignedGetUrl: jest.fn().mockResolvedValue('https://r2/signed'),
  };
  const classItems = new InMemoryRepository<ClassItem>();
  const classrooms = new InMemoryRepository<Classroom>();
  // Thông báo "có bài mới cần chấm" đọc tenant và người nộp bài.
  const tenants = new InMemoryRepository<Tenant>();
  tenants.rows.push({ id: TENANT, slug: 'a', name: 'A' } as Tenant);
  const notifications = fakeNotifications();
  const dataSource = new InMemoryDataSource()
    .register(Exam, exams)
    .register(ExamSection, sections)
    .register(ExamPart, parts)
    .register(ExamQuestion, questions)
    .register(ExamAttempt, attempts)
    .register(ExamAttemptSection, attemptSections)
    .register(ExamAttemptAnswer, answers)
    .register(ClassItem, classItems)
    .register(Classroom, classrooms)
    .register(Tenant, tenants)
    .register(User, new InMemoryRepository<User>())
    .asDataSource();
  const service = new AttemptsService(
    dataSource,
    r2 as unknown as R2Service,
    attempts.asRepository(),
    attemptSections.asRepository(),
    answers.asRepository(),
    notifications.service,
  );
  const questionsOf = (sortOrder: number) => {
    const section = sections.rows.find((row) => row.sortOrder === sortOrder)!;
    return questions.rows
      .filter((row) => row.sectionId === section.id)
      .sort((a, b) => a.number - b.number);
  };
  return {
    service,
    notifications,
    dataSource,
    r2,
    exams,
    attempts,
    attemptSections,
    answers,
    classItems,
    classrooms,
    questionsOf,
  };
}

const sectionIds = (view: AttemptView) => view.sections.map((s) => s.id);

/** Mọi tên thuộc tính xuất hiện trong dữ liệu JSON. */
function propertyNames(value: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((item) => propertyNames(item, into));
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      into.add(key);
      propertyNames(child, into);
    }
  }
  return into;
}

afterEach(() => {
  jest.useRealTimers();
});

describe('AttemptsService', () => {
  it('bắt đầu lượt làm: section chưa bắt đầu chỉ trả phần hướng dẫn', async () => {
    const { service, attemptSections } = setup();
    const view = await service.create(ctx, STUDENT, EXAM);

    expect(view.status).toBe(AttemptStatus.IN_PROGRESS);
    expect(view.sections).toEqual([
      expect.objectContaining({
        name: 'Listening',
        durationMinutes: 30,
        questionCount: 6,
        status: AttemptSectionStatus.NOT_STARTED,
        deadlineAt: null,
      }),
      expect.objectContaining({ name: 'Writing', questionCount: 3 }),
    ]);
    expect(view.current).toEqual({
      sectionId: view.sections[0].id,
      status: AttemptSectionStatus.NOT_STARTED,
      intro: [p('Hướng dẫn phần nghe')],
    });
    expect(attemptSections.rows).toHaveLength(2);
  });

  it('lớp kết thúc: chốt lượt thi trong lớp, câu đã trả lời được chấm, section chưa làm tính 0', async () => {
    const { service, dataSource, attempts, attemptSections, questionsOf } =
      setup();
    const created = await service.create(ctx, STUDENT, EXAM);
    const [first] = sectionIds(created);
    await service.start(ctx, STUDENT, created.id, first);
    await service.saveResponses(
      ctx,
      STUDENT,
      created.id,
      first,
      correctResponses(questionsOf(0)),
    );
    // Giả lập lượt làm trong lớp (luồng bắt đầu từ mục lớp có ở Step 9).
    attempts.rows[0].classItemId = 'item-1';
    const free = await service.create(ctx, OTHER, EXAM);

    const closed = await service.finalizeForClassItems(dataSource.manager, [
      'item-1',
    ]);

    expect(closed).toBe(1);
    const attempt = attempts.rows.find((row) => row.id === created.id)!;
    // Section Writing có câu chấm tay → chờ chấm.
    expect(attempt.status).toBe(AttemptStatus.SUBMITTED);
    expect(attempt.autoCorrect).toBe(6);
    expect(
      attemptSections.rows
        .filter((row) => row.attemptId === created.id)
        .map((row) => [row.status, row.autoSubmitted, row.correct]),
    ).toEqual([
      [AttemptSectionStatus.SUBMITTED, true, 6],
      [AttemptSectionStatus.SUBMITTED, true, 0],
    ]);
    // Lượt tự do không bị ảnh hưởng.
    expect(attempts.rows.find((row) => row.id === free.id)!.status).toBe(
      AttemptStatus.IN_PROGRESS,
    );
  });

  it('lớp không còn đang học thì lượt trong lớp không ghi được nữa (T6.1)', async () => {
    const { service, attempts, classItems, classrooms, questionsOf } = setup();
    const created = await service.create(ctx, STUDENT, EXAM);
    const [first] = sectionIds(created);
    await service.start(ctx, STUDENT, created.id, first);
    // Gắn lượt vào mục của lớp đã kết thúc.
    attempts.rows[0].classItemId = 'item-1';
    classItems.rows.push({ id: 'item-1', classroomId: 'class-1' } as ClassItem);
    classrooms.rows.push({
      id: 'class-1',
      status: ClassroomStatus.FINISHED,
    } as Classroom);

    const responses = correctResponses(questionsOf(0));
    await expect(
      service.saveResponses(ctx, STUDENT, created.id, first, responses),
    ).rejects.toThrow(/không còn nhận bài/);
    await expect(
      service.submitSection(ctx, STUDENT, created.id, first, responses),
    ).rejects.toThrow(/không còn nhận bài/);
    await expect(service.finish(ctx, STUDENT, created.id)).rejects.toThrow(
      /không còn nhận bài/,
    );
    // Xem lại vẫn được.
    await expect(service.get(ctx, STUDENT, created.id)).resolves.toBeDefined();

    await classrooms.update(
      { id: 'class-1' },
      { status: ClassroomStatus.ONGOING },
    );
    await expect(
      service.submitSection(ctx, STUDENT, created.id, first, responses),
    ).resolves.toBeDefined();
  });

  it('mỗi đề chỉ một lượt làm dở; đề lưu trữ 409, đề nháp/private 404', async () => {
    const { service } = setup();
    await service.create(ctx, STUDENT, EXAM);
    await expect(service.create(ctx, STUDENT, EXAM)).rejects.toBeInstanceOf(
      ConflictException,
    );
    // Người khác vẫn bắt đầu được.
    await expect(service.create(ctx, OTHER, EXAM)).resolves.toBeDefined();

    await expect(
      setup({ status: ExamStatus.ARCHIVED }).service.create(ctx, STUDENT, EXAM),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      setup({ status: ExamStatus.DRAFT }).service.create(ctx, STUDENT, EXAM),
    ).rejects.toBeInstanceOf(NotFoundException);
    // Đề `private` chỉ làm qua lớp.
    await expect(
      setup({ visibility: ContentVisibility.PRIVATE }).service.create(
        ctx,
        STUDENT,
        EXAM,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('không xem/bắt đầu được lượt làm của người khác', async () => {
    const { service } = setup();
    const view = await service.create(ctx, STUDENT, EXAM);
    await expect(service.get(ctx, OTHER, view.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.start(ctx, OTHER, view.id, view.sections[0].id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('không bắt đầu được section khi section trước chưa nộp', async () => {
    const { service } = setup();
    const view = await service.create(ctx, STUDENT, EXAM);
    const [first, second] = sectionIds(view);

    await expect(
      service.start(ctx, STUDENT, view.id, second),
    ).rejects.toBeInstanceOf(ConflictException);
    await service.start(ctx, STUDENT, view.id, first);
    await expect(
      service.start(ctx, STUDENT, view.id, second),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('nội dung đang làm không lộ đáp án', async () => {
    const { service } = setup();
    const created = await service.create(ctx, STUDENT, EXAM);
    fakeDate('2026-09-16T10:00:00Z');
    const view = await service.start(
      ctx,
      STUDENT,
      created.id,
      created.sections[0].id,
    );

    expect(view.sections[0]).toMatchObject({
      status: AttemptSectionStatus.IN_PROGRESS,
      startedAt: '2026-09-16T10:00:00.000Z',
      deadlineAt: '2026-09-16T10:30:00.000Z',
    });
    expect(view.current?.status).toBe(AttemptSectionStatus.IN_PROGRESS);
    const names = propertyNames(view);
    for (const secret of ['checked', 'answer', 'num', 'answerKey']) {
      expect(names).not.toContain(secret);
    }
    const json = JSON.stringify(view);
    expect(json).not.toContain(BLANK_ANSWER);
    expect(json).not.toContain(PAIR_ANSWER);
    expect(json).not.toContain(EXPLANATION);
    // Dòng ordering có `key` (chỉ số gốc) và không theo thứ tự đúng.
    const content = (view.current as { content: ExamElement[] }).content;
    const keys = content
      .filter((node) => node.listStyleType === 'ordering')
      .map((node) => node.key);
    expect([...keys].sort()).toEqual([0, 1, 2]);
    expect(keys).not.toEqual([1, 0, 2]);
  });

  it('chấm ở server khớp chấm của exam-core và ghi từng câu trả lời', async () => {
    const { service, questionsOf, answers, attempts } = setup();
    const created = await service.create(ctx, STUDENT, EXAM);
    const [first, second] = sectionIds(created);
    await service.start(ctx, STUDENT, created.id, first);

    const questions = questionsOf(0);
    const responses = correctResponses(questions);
    // Blank đúng theo đáp án thứ hai, khác hoa thường.
    responses.value[4] = ' BANK ';
    const view = await service.submitSection(
      ctx,
      STUDENT,
      created.id,
      first,
      JSON.parse(JSON.stringify(responses)) as AttemptResponses,
    );

    const expected = gradeExam(buildPlan(listening), responses);
    expect(expected).toMatchObject({ correct: 6, total: 6 });
    expect(view.sections[0]).toMatchObject({
      status: AttemptSectionStatus.SUBMITTED,
      autoSubmitted: false,
    });
    expect(view.current).toMatchObject({
      sectionId: second,
      status: AttemptSectionStatus.NOT_STARTED,
    });
    expect(attempts.rows[0]).toMatchObject({
      status: AttemptStatus.IN_PROGRESS,
      autoCorrect: expected.correct,
      autoTotal: expected.total,
      manualCount: 0,
    });
    expect(answers.rows).toHaveLength(questions.length);
    expect(
      answers.rows.every((row) => row.isCorrect === true && row.score === 1),
    ).toBe(true);
    // pick-n: cả hai câu lưu chung lựa chọn.
    const pick = questions.filter((q) => q.qtype === 'pick-n');
    expect(
      pick.map(
        (q) => answers.rows.find((row) => row.questionId === q.id)?.response,
      ),
    ).toEqual([
      [0, 2],
      [0, 2],
    ]);

    // Section cuối có câu chấm tay → nộp xong là `submitted`, chờ chấm.
    await service.start(ctx, STUDENT, created.id, second);
    const done = await service.submitSection(ctx, STUDENT, created.id, second, {
      value: { 1: 'Bài viết' },
      picks: { 3: [1] },
      order: {},
    });
    expect(done.current).toBeNull();
    expect(attempts.rows[0]).toMatchObject({
      status: AttemptStatus.SUBMITTED,
      autoCorrect: 6,
      autoTotal: 7,
      manualCount: 2,
      gradedAt: null,
    });
    const writingAnswer = answers.rows.find(
      (row) => row.response === 'Bài viết',
    );
    expect(writingAnswer).toMatchObject({ isCorrect: null, score: null });

    // Nộp lại section đã nộp (client tới sau cron) không đổi gì.
    await expect(
      service.submitSection(ctx, STUDENT, created.id, second, undefined),
    ).resolves.toMatchObject({ status: AttemptStatus.SUBMITTED });
    expect(attempts.rows[0].manualCount).toBe(2);
  });

  it('quá hạn: từ chối lưu câu trả lời, lần đọc sau tự nộp bằng câu trả lời đã lưu', async () => {
    const { service, attemptSections, questionsOf } = setup();
    const created = await service.create(ctx, STUDENT, EXAM);
    const [first] = sectionIds(created);
    fakeDate('2026-09-16T10:00:00Z');
    await service.start(ctx, STUDENT, created.id, first);

    const saved = correctResponses(questionsOf(0));
    fakeDate('2026-09-16T10:29:00Z');
    await service.saveResponses(ctx, STUDENT, created.id, first, saved);
    expect((await service.get(ctx, STUDENT, created.id)).current).toMatchObject(
      { responses: saved },
    );

    // Trong 10 giây trễ vẫn nhận.
    fakeDate('2026-09-16T10:30:09Z');
    await service.saveResponses(ctx, STUDENT, created.id, first, saved);

    fakeDate('2026-09-16T10:30:11Z');
    await expect(
      service.saveResponses(ctx, STUDENT, created.id, first, {
        value: {},
        picks: {},
        order: {},
      }),
    ).rejects.toThrow('Đã hết giờ');
    expect(attemptSections.rows[0].status).toBe(
      AttemptSectionStatus.IN_PROGRESS,
    );

    const view = await service.get(ctx, STUDENT, created.id);
    expect(view.sections[0]).toMatchObject({
      status: AttemptSectionStatus.SUBMITTED,
      autoSubmitted: true,
    });
    expect(attemptSections.rows[0]).toMatchObject({ correct: 6, total: 6 });
    expect(view.current?.status).toBe(AttemptSectionStatus.NOT_STARTED);
  });

  it('cron chốt section quá hạn của mọi lượt làm', async () => {
    const { service, attemptSections } = setup();
    const a = await service.create(ctx, STUDENT, EXAM);
    const b = await service.create(ctx, OTHER, EXAM);
    fakeDate('2026-09-16T10:00:00Z');
    await service.start(ctx, STUDENT, a.id, a.sections[0].id);
    fakeDate('2026-09-16T10:20:00Z');
    await service.start(ctx, OTHER, b.id, b.sections[0].id);

    fakeDate('2026-09-16T10:31:00Z');
    expect(await service.finalizeExpired()).toBe(1);
    const statusOf = (id: string) =>
      attemptSections.rows.find((row) => row.id === id)?.status;
    expect(statusOf(a.sections[0].id)).toBe(AttemptSectionStatus.SUBMITTED);
    expect(statusOf(b.sections[0].id)).toBe(AttemptSectionStatus.IN_PROGRESS);
    expect(await service.finalizeExpired()).toBe(0);
  });

  it('nộp toàn bài chốt các section còn lại; kết quả không có đáp án', async () => {
    const { service, attempts, answers, notifications } = setup();
    const created = await service.create(ctx, STUDENT, EXAM);
    await service.start(ctx, STUDENT, created.id, created.sections[0].id);
    await expect(
      service.result(ctx, STUDENT, created.id),
    ).rejects.toBeInstanceOf(ConflictException);

    const view = await service.finish(ctx, STUDENT, created.id);
    expect(view.current).toBeNull();
    expect(view.sections.map((s) => s.status)).toEqual([
      AttemptSectionStatus.SUBMITTED,
      AttemptSectionStatus.SUBMITTED,
    ]);
    expect(attempts.rows[0]).toMatchObject({
      status: AttemptStatus.SUBMITTED,
      autoCorrect: 0,
      autoTotal: 7,
      manualCount: 2,
    });
    expect(answers.rows).toHaveLength(9);
    // Bài tự do có câu chấm tay → báo cho người soạn đề (Step 12).
    const pending = notifications.ofType(NotificationType.GRADING_PENDING);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      userIds: ['teacher'],
      link: `/t/a/dashboard/grading/${created.id}`,
      dedupeKey: `grade_pending:${created.id}`,
    });

    const result = await service.result(ctx, STUDENT, created.id);
    expect(result.sections).toEqual([
      expect.objectContaining({ name: 'Listening', correct: 0, total: 6 }),
      expect.objectContaining({
        name: 'Writing',
        correct: 0,
        total: 1,
        manual: [
          expect.objectContaining({ number: 1, qtype: 'writing', score: null }),
          expect.objectContaining({
            number: 2,
            qtype: 'speaking',
            score: null,
          }),
        ],
      }),
    ]);
    const names = propertyNames(result);
    for (const secret of ['answerKey', 'isCorrect', 'response', 'verdicts']) {
      expect(names).not.toContain(secret);
    }
    await expect(
      service.start(ctx, STUDENT, created.id, created.sections[1].id),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('ghi âm: chỉ nhận audio cho câu Speaking, ghi lại thì xoá file cũ', async () => {
    const { service, r2, answers } = setup();
    const attempt = await service.create(ctx, STUDENT, EXAM);
    const [listeningId, writingId] = sectionIds(attempt);
    const file = (mimetype: string, size = 1000) =>
      ({ mimetype, size, buffer: Buffer.from('x') }) as UploadedFile;
    const upload = (number: number, mimetype: string, userId = STUDENT) =>
      service.uploadRecording(
        ctx,
        userId,
        attempt.id,
        writingId,
        number,
        file(mimetype),
      );

    await service.start(ctx, STUDENT, attempt.id, listeningId);
    await service.submitSection(
      ctx,
      STUDENT,
      attempt.id,
      listeningId,
      undefined,
    );
    // Section chưa bắt đầu: từ chối trước khi đẩy file.
    await expect(upload(2, 'audio/webm')).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(upload(2, 'audio/webm', OTHER)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(r2.put).not.toHaveBeenCalled();

    await service.start(ctx, STUDENT, attempt.id, writingId);
    await expect(upload(2, 'video/mp4')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(upload(1, 'audio/webm')).rejects.toThrow('Speaking');
    expect(r2.put).not.toHaveBeenCalled();

    const recorded = await upload(2, 'audio/webm;codecs=opus');
    const firstKey = r2.put.mock.calls[0][1] as string;
    expect(firstKey).toMatch(
      new RegExp(`^tenants/${TENANT}/attempts/${attempt.id}/.+\\.webm$`),
    );
    expect(r2.put.mock.calls[0][0]).toBe('private');

    const again = await upload(2, 'audio/mp4');
    const secondKey = r2.put.mock.calls[1][1] as string;
    expect(again.answerId).toBe(recorded.answerId);
    expect(secondKey).toMatch(/\.m4a$/);
    expect(r2.delete).toHaveBeenCalledWith('private', firstKey);

    const view = await service.get(ctx, STUDENT, attempt.id);
    expect(view.current).toMatchObject({
      recordings: [{ answerId: recorded.answerId, number: 2 }],
    });

    // Nộp section không làm mất ghi âm đã có.
    await service.submitSection(ctx, STUDENT, attempt.id, writingId, undefined);
    expect(
      answers.rows.find((row) => row.id === recorded.answerId)?.recordingKey,
    ).toBe(secondKey);
    await expect(upload(2, 'audio/webm')).rejects.toBeInstanceOf(
      ConflictException,
    );

    await expect(
      service.recordingUrl(ctx, OTHER, attempt.id, recorded.answerId),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.recordingUrl(ctx, STUDENT, attempt.id, recorded.answerId),
    ).resolves.toEqual({ url: 'https://r2/signed' });
  });
});

describe('câu trả lời gửi lên', () => {
  it('kiểm dạng AttemptResponses', () => {
    expect(
      isAttemptResponses({ value: { 1: 'a' }, picks: {}, order: {} }),
    ).toBe(true);
    expect(isAttemptResponses({ picks: { 3: [0, 2] } })).toBe(true);
    expect(isAttemptResponses({ value: { 0: 'a' } })).toBe(false);
    expect(isAttemptResponses({ value: { x: 'a' } })).toBe(false);
    expect(isAttemptResponses({ picks: { 1: [-1] } })).toBe(false);
    expect(isAttemptResponses({ picks: { 1: 'a' } })).toBe(false);
    expect(isAttemptResponses({ other: {} })).toBe(false);
    expect(isAttemptResponses([])).toBe(false);
    expect(isAttemptResponses({ value: { 1: 'x'.repeat(20_001) } })).toBe(
      false,
    );
  });

  it('tách phần trả lời của từng câu', () => {
    const responses: AttemptResponses = {
      value: { 1: '  ', 2: 'abc' },
      picks: { 5: [1, 2] },
      order: {},
    };
    const q = (number: number, qtype: string, answerKey: unknown = null) =>
      ({ number, qtype, answerKey }) as ExamQuestion;
    expect(responseOf(q(1, 'fill-blank'), responses)).toBeNull();
    expect(responseOf(q(2, 'writing'), responses)).toBe('abc');
    expect(responseOf(q(6, 'pick-n', { pickIndex: 1 }), responses)).toEqual([
      1, 2,
    ]);
    expect(responseOf(q(7, 'ordering'), responses)).toBeNull();
  });
});
