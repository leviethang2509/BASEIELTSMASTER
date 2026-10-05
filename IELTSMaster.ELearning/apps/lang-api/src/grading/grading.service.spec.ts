import 'reflect-metadata';
import type { ExamElement, ExamValue } from '@lang/exam-core';
import {
  AttemptStatus,
  NotificationType,
  ContentVisibility,
  ExamStatus,
  TenantRole,
  TenantStatus,
} from '@lang/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AttemptsService } from '../attempts/attempts.service';
import { ExamAttemptAnswer } from '../attempts/exam-attempt-answer.entity';
import { ExamAttemptSection } from '../attempts/exam-attempt-section.entity';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { ClassroomTeacher } from '../classrooms/classroom-teacher.entity';
import { Exam } from '../exams/exam.entity';
import { ExamPart } from '../exams/exam-part.entity';
import { ExamQuestion } from '../exams/exam-question.entity';
import { ExamSection } from '../exams/exam-section.entity';
import { prepareSection } from '../exams/section-content';
import { Membership } from '../memberships/membership.entity';
import { StudentGuardian } from '../memberships/student-guardian.entity';
import type { R2Service } from '../storage/r2.service';
import type { UploadedFile } from '../storage/media-file';
import type { TenantContext } from '../tenants/tenant-context';
import { Tenant } from '../tenants/tenant.entity';
import { fakeNotifications } from '../testing/fake-notifications';
import { InMemoryDataSource } from '../testing/in-memory-data-source';
import { InMemoryRepository } from '../testing/in-memory-repository';
import { User } from '../users/user.entity';
import { GradeAnswerDto } from './dto/grading.dto';
import { sectionPrompts } from './grading-content';
import { GradingDelegation } from './grading-delegation.entity';
import { GradingService } from './grading.service';

const TENANT = 'tenant-a';
const STUDENT = 'user-student';
const TEACHER = 'user-teacher';
const EXAM = 'exam-1';

const ctx = (tenantId = TENANT): TenantContext => ({
  tenantId,
  slug: 'a',
  name: 'A',
  status: TenantStatus.ACTIVE,
  membershipId: 'membership',
  roles: [TenantRole.TEACHER],
  permissions: [],
});

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

// Section 1: MC tự động. Section 2: hướng dẫn subpart + writing + speaking.
const reading: ExamValue = [
  indicator('part-r', 'part'),
  p('Đoạn đọc'),
  indicator('q-mc', 'question', { qtype: 'mc-single' }),
  todo('Đúng', true),
  todo('Sai'),
];
const productive: ExamValue = [
  p('Hướng dẫn phần viết'),
  indicator('part-w', 'part'),
  p('Biểu đồ dân số'),
  indicator('sub-w', 'subpart'),
  p('Trả lời các câu sau'),
  indicator('q-write', 'question', { qtype: 'writing', maxChars: 500 }),
  p('Mô tả biểu đồ'),
  // Giải thích không cắt hướng dẫn subpart của câu sau.
  indicator('e-write', 'explanation'),
  p('Gợi ý: nêu xu hướng chính'),
  indicator('q-speak', 'question', { qtype: 'speaking', seconds: 60 }),
  p('Nói về gia đình'),
];

function setup() {
  const timestamps = () => ({ createdAt: new Date(), updatedAt: new Date() });
  const exams = new InMemoryRepository<Exam>(timestamps);
  const sections = new InMemoryRepository<ExamSection>();
  const parts = new InMemoryRepository<ExamPart>();
  const questions = new InMemoryRepository<ExamQuestion>();
  const attempts = new InMemoryRepository<ExamAttempt>(timestamps);
  const attemptSections = new InMemoryRepository<ExamAttemptSection>();
  const answers = new InMemoryRepository<ExamAttemptAnswer>();
  const users = new InMemoryRepository<User>();
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
    visibility: ContentVisibility.TENANT,
    clonedFromId: null,
    status: ExamStatus.PUBLISHED,
    currentVersion: 1,
    contentRevision: 1,
    publishedAt: new Date(),
    createdBy: TEACHER,
    updatedBy: TEACHER,
    deletedAt: null,
    ...timestamps(),
  });
  [
    { name: 'Reading', durationMinutes: 30, rawData: reading },
    { name: 'Writing', durationMinutes: 30, rawData: productive },
  ].forEach((draft, sortOrder) => {
    const prepared = prepareSection(
      { moduleId: null, ...draft },
      { examId: EXAM, version: 1, sortOrder, createdBy: TEACHER },
    );
    sections.rows.push({ ...prepared.section, createdAt: new Date() });
    parts.rows.push(...prepared.parts);
    questions.rows.push(...prepared.questions);
  });
  users.rows.push(
    { id: STUDENT, fullName: 'Học Viên', email: 'hv@x.vn' } as User,
    { id: TEACHER, fullName: 'Giáo Viên', email: 'gv@x.vn' } as User,
  );

  const r2 = {
    put: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    presignedGetUrl: jest.fn().mockResolvedValue('https://r2/signed'),
  };
  // Thông báo (Step 12) đọc tenant để dựng đường dẫn.
  const tenants = new InMemoryRepository<Tenant>();
  tenants.rows.push({ id: TENANT, slug: 'a', name: 'A' } as Tenant);
  const dataSource = new InMemoryDataSource()
    .register(Exam, exams)
    .register(ExamSection, sections)
    .register(ExamPart, parts)
    .register(ExamQuestion, questions)
    .register(ExamAttempt, attempts)
    .register(ExamAttemptSection, attemptSections)
    .register(ExamAttemptAnswer, answers)
    .register(User, users)
    .register(Tenant, tenants)
    .register(ClassroomTeacher, new InMemoryRepository<ClassroomTeacher>())
    .register(GradingDelegation, new InMemoryRepository<GradingDelegation>())
    .register(Membership, new InMemoryRepository<Membership>())
    .register(StudentGuardian, new InMemoryRepository<StudentGuardian>())
    .asDataSource();
  const notifications = fakeNotifications();
  const attemptsService = new AttemptsService(
    dataSource,
    r2 as unknown as R2Service,
    attempts.asRepository(),
    attemptSections.asRepository(),
    answers.asRepository(),
    notifications.service,
  );
  const service = new GradingService(
    dataSource,
    r2 as unknown as R2Service,
    attempts.asRepository(),
    answers.asRepository(),
    notifications.service,
  );

  /** Học viên làm hết bài: viết một đoạn, ghi âm câu Speaking. */
  async function submittedAttempt(userId = STUDENT, withAnswers = true) {
    const view = await attemptsService.create(ctx(), userId, EXAM);
    const [first, second] = view.sections.map((s) => s.id);
    await attemptsService.start(ctx(), userId, view.id, first);
    await attemptsService.submitSection(ctx(), userId, view.id, first, {
      value: {},
      picks: { 1: [0] },
      order: {},
    });
    await attemptsService.start(ctx(), userId, view.id, second);
    if (withAnswers) {
      await attemptsService.uploadRecording(ctx(), userId, view.id, second, 2, {
        mimetype: 'audio/webm',
        size: 100,
        buffer: Buffer.from('x'),
      } as UploadedFile);
    }
    await attemptsService.submitSection(ctx(), userId, view.id, second, {
      value: withAnswers ? { 1: 'Dân số tăng đều' } : {},
      picks: {},
      order: {},
    });
    return view.id;
  }

  return {
    service,
    r2,
    attempts,
    answers,
    submittedAttempt,
    notifications,
  };
}

describe('GradingService', () => {
  it('chi tiết bài: đề bài của câu chấm tay, bài viết, ghi âm; không có câu tự động', async () => {
    const { service, submittedAttempt } = setup();
    const id = await submittedAttempt();

    const detail = await service.detail(ctx(), TEACHER, id);
    expect(detail).toMatchObject({
      status: AttemptStatus.SUBMITTED,
      student: { userId: STUDENT, fullName: 'Học Viên', email: 'hv@x.vn' },
      exam: { id: EXAM, title: 'Đề thử' },
      autoCorrect: 1,
      autoTotal: 1,
      manualCount: 2,
      manualGradedCount: 0,
      nextAttemptId: null,
    });
    expect(detail.sections).toHaveLength(1);
    const [section] = detail.sections;
    expect(section).toMatchObject({ name: 'Writing', correct: 0, total: 0 });
    expect(section.parts).toEqual([[p('Biểu đồ dân số')]]);
    expect(section.questions).toEqual([
      expect.objectContaining({
        number: 1,
        qtype: 'writing',
        maxScore: 10,
        maxChars: 500,
        seconds: null,
        partIndex: 0,
        prompt: [p('Trả lời các câu sau'), p('Mô tả biểu đồ')],
        explanations: [[p('Gợi ý: nêu xu hướng chính')]],
        text: 'Dân số tăng đều',
        hasRecording: false,
        score: null,
        grader: null,
      }),
      expect.objectContaining({
        number: 2,
        qtype: 'speaking',
        seconds: 60,
        prompt: [p('Trả lời các câu sau'), p('Nói về gia đình')],
        explanations: [],
        text: null,
        hasRecording: true,
      }),
    ]);
  });

  it('không chấm/xem được bài của chính mình, bài đang làm, tenant khác', async () => {
    const { service, submittedAttempt, answers } = setup();
    const own = await submittedAttempt(TEACHER);
    const answerId = answers.rows.find(
      (row) => row.attemptId === own && row.response === 'Dân số tăng đều',
    )!.id;

    await expect(service.detail(ctx(), TEACHER, own)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      service.grade(ctx(), TEACHER, answerId, { score: 5 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.recordingUrl(ctx(), TEACHER, own, answerId),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.detail(ctx('tenant-b'), STUDENT, own),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.grade(ctx('tenant-b'), STUDENT, answerId, { score: 5 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lượt làm chưa nộp xong thì chưa chấm được', async () => {
    const { service, attempts, answers, submittedAttempt } = setup();
    const id = await submittedAttempt();
    // Giả lập bài đang làm dở nhưng đã có dòng câu trả lời.
    attempts.rows[0].status = AttemptStatus.IN_PROGRESS;
    const answer = answers.rows.find(
      (row) => row.response === 'Dân số tăng đều',
    )!;
    await expect(service.detail(ctx(), TEACHER, id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(
      service.grade(ctx(), TEACHER, answer.id, { score: 5 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('chấm từng câu, đủ câu thì lượt làm → graded; chấm lại không đổi trạng thái', async () => {
    const { service, attempts, answers, submittedAttempt, notifications } =
      setup();
    const id = await submittedAttempt();
    const detail = await service.detail(ctx(), TEACHER, id);
    const [writing, speaking] = detail.sections[0].questions;

    const first = await service.grade(ctx(), TEACHER, writing.answerId, {
      score: 6.5,
      comment: '  Bố cục tốt  ',
    });
    expect(first).toMatchObject({
      answer: {
        answerId: writing.answerId,
        score: 6.5,
        comment: 'Bố cục tốt',
        grader: { id: TEACHER, fullName: 'Giáo Viên' },
      },
      attempt: {
        status: AttemptStatus.SUBMITTED,
        manualGradedCount: 1,
        manualCount: 2,
        gradedAt: null,
      },
    });

    const second = await service.grade(ctx(), TEACHER, speaking.answerId, {
      score: 0,
    });
    expect(second.attempt).toMatchObject({
      status: AttemptStatus.GRADED,
      manualGradedCount: 2,
    });
    expect(second.attempt.gradedAt).not.toBeNull();
    expect(second.answer).toMatchObject({ score: 0, comment: null });
    const gradedAt = attempts.rows[0].gradedAt;

    // Chấm lại: vẫn đủ câu, không cộng dồn, giữ thời điểm chấm xong.
    const again = await service.grade(ctx(), TEACHER, writing.answerId, {
      score: 8,
      comment: '',
    });
    expect(again.attempt).toMatchObject({
      status: AttemptStatus.GRADED,
      manualGradedCount: 2,
    });
    expect(attempts.rows[0].gradedAt).toBe(gradedAt);

    // Thông báo "đã chấm xong" gửi cho học viên đúng một lần (Step 12).
    const graded = notifications.ofType(NotificationType.ATTEMPT_GRADED);
    expect(graded).toHaveLength(1);
    expect(graded[0]).toMatchObject({
      userIds: [STUDENT],
      link: `/t/a/attempts/${id}/result`,
      dedupeKey: `graded:${id}`,
      params: { title: 'Đề thử' },
    });
    expect(
      answers.rows.find((row) => row.id === writing.answerId),
    ).toMatchObject({ score: 8, comment: null, gradedBy: TEACHER });

    const regraded = await service.detail(ctx(), TEACHER, id);
    expect(regraded.sections[0].questions[0]).toMatchObject({
      score: 8,
      grader: { fullName: 'Giáo Viên' },
    });
  });

  it('chỉ chấm câu chấm tay, điểm 0–10 bước 0,5', async () => {
    const { service, answers, submittedAttempt } = setup();
    await submittedAttempt();
    const auto = answers.rows.find((row) => row.isCorrect !== null)!;
    const manual = answers.rows.find(
      (row) => row.response === 'Dân số tăng đều',
    )!;

    await expect(
      service.grade(ctx(), TEACHER, auto.id, { score: 1 }),
    ).rejects.toThrow('chấm tự động');
    for (const score of [-1, 10.5, 7.3]) {
      await expect(
        service.grade(ctx(), TEACHER, manual.id, { score }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(
      service.grade(ctx(), TEACHER, 'missing', { score: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(answers.rows.find((row) => row.id === manual.id)?.gradedAt).toBe(
      null,
    );
  });

  it('câu bỏ trống vẫn chờ chấm; bài kế tiếp chờ chấm', async () => {
    const { service, submittedAttempt } = setup();
    const first = await submittedAttempt(STUDENT, false);
    const other = await submittedAttempt('user-other', true);

    const detail = await service.detail(ctx(), TEACHER, first);
    expect(detail.sections[0].questions).toEqual([
      expect.objectContaining({ text: null, hasRecording: false, score: null }),
      expect.objectContaining({ text: null, hasRecording: false, score: null }),
    ]);
    expect(detail.nextAttemptId).toBe(other);
  });

  it('link ghi âm cho người chấm', async () => {
    const { service, r2, submittedAttempt } = setup();
    const id = await submittedAttempt();
    const detail = await service.detail(ctx(), TEACHER, id);
    const [writing, speaking] = detail.sections[0].questions;

    await expect(
      service.recordingUrl(ctx(), TEACHER, id, speaking.answerId),
    ).resolves.toEqual({ url: 'https://r2/signed' });
    expect(r2.presignedGetUrl).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^tenants/${TENANT}/attempts/${id}/`)),
    );
    await expect(
      service.recordingUrl(ctx(), TEACHER, id, writing.answerId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('sectionPrompts', () => {
  it('hướng dẫn subpart áp dụng cho các câu sau nó tới subpart kế', () => {
    const prompts = sectionPrompts([
      indicator('part', 'part'),
      p('Passage'),
      indicator('sub-1', 'subpart'),
      p('Hướng dẫn 1'),
      indicator('w1', 'question', { qtype: 'writing' }),
      p('Câu 1'),
      indicator('w2', 'question', { qtype: 'writing' }),
      p('Câu 2'),
      indicator('sub-2', 'subpart'),
      p('Hướng dẫn 2'),
      indicator('s1', 'question', { qtype: 'speaking' }),
    ]);
    expect(prompts.parts).toEqual([[p('Passage')]]);
    expect(prompts.questions.get('w2')).toEqual({
      partIndex: 0,
      prompt: [p('Hướng dẫn 1'), p('Câu 2')],
    });
    expect(prompts.questions.get('s1')?.prompt).toEqual([p('Hướng dẫn 2')]);
  });
});

describe('GradeAnswerDto', () => {
  const errorsOf = async (body: object) =>
    (await validate(plainToInstance(GradeAnswerDto, body))).map(
      (error) => error.property,
    );

  it('kiểm điểm và nhận xét', async () => {
    expect(await errorsOf({ score: 7.5, comment: 'Tốt' })).toEqual([]);
    expect(await errorsOf({ score: 0 })).toEqual([]);
    expect(await errorsOf({ score: '7' })).toEqual(['score']);
    expect(await errorsOf({ score: 10.5 })).toEqual(['score']);
    expect(await errorsOf({ comment: 'x' })).toEqual(['score']);
    expect(await errorsOf({ score: 1, comment: 'x'.repeat(5001) })).toEqual([
      'comment',
    ]);
  });
});
