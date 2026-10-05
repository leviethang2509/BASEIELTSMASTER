import 'reflect-metadata';
import {
  AttemptStatus,
  LessonAttemptStatus,
  MembershipStatus,
  QuestionGrading,
  TenantRole,
  TenantStatus,
  type LearnerClassDetail,
  type LearnerClassItem,
} from '@lang/shared';
import { NotFoundException } from '@nestjs/common';
import { ExamAttemptAnswer } from '../attempts/exam-attempt-answer.entity';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { ClassroomStudent } from '../classrooms/classroom-student.entity';
import type { LearnerClassesService } from '../classrooms/learner-classes.service';
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
import type { TenantContext } from '../tenants/tenant-context';
import { InMemoryDataSource } from '../testing/in-memory-data-source';
import { InMemoryRepository } from '../testing/in-memory-repository';
import { User } from '../users/user.entity';
import { GuardianService } from './guardian.service';

const TENANT = 'tenant-1';
const PARENT = 'm-parent';
const CHILD = 'm-child';
const OTHER_CHILD = 'm-other';

const ctx: TenantContext = {
  tenantId: TENANT,
  slug: 'trung-tam',
  name: 'Trung tâm',
  status: TenantStatus.ACTIVE,
  membershipId: PARENT,
  roles: [TenantRole.PARENT],
  permissions: [],
};

/** Phụ huynh liên kết với 1 con; một học viên khác **không** liên kết. */
function setup() {
  const guardians = new InMemoryRepository<StudentGuardian>();
  const memberships = new InMemoryRepository<Membership>();
  const users = new InMemoryRepository<User>();
  const enrollments = new InMemoryRepository<ClassroomStudent>();
  const exams = new InMemoryRepository<Exam>();
  const lessons = new InMemoryRepository<Lesson>();
  const examAttempts = new InMemoryRepository<ExamAttempt>();
  const lessonAttempts = new InMemoryRepository<LessonAttempt>();
  const examAnswers = new InMemoryRepository<ExamAttemptAnswer>();
  const lessonAnswers = new InMemoryRepository<LessonAttemptAnswer>();
  const examQuestions = new InMemoryRepository<ExamQuestion>();
  const lessonQuestions = new InMemoryRepository<LessonQuestion>();
  const examSections = new InMemoryRepository<ExamSection>();
  const lessonSections = new InMemoryRepository<LessonSection>();

  const addMember = (id: string, userId: string, fullName: string) => {
    memberships.rows.push({
      id,
      tenantId: TENANT,
      userId,
      status: MembershipStatus.ACTIVE,
    } as Membership);
    users.rows.push({
      id: userId,
      fullName,
      email: `${userId}@example.com`,
    } as User);
  };
  addMember(PARENT, 'u-parent', 'Phụ huynh');
  addMember(CHILD, 'u-child', 'Bé Na');
  addMember(OTHER_CHILD, 'u-other', 'Học viên khác');
  guardians.rows.push({
    id: 'link-1',
    tenantId: TENANT,
    studentMembershipId: CHILD,
    parentMembershipId: PARENT,
    relationship: 'Mẹ',
  } as StudentGuardian);
  enrollments.rows.push({
    id: 'e-1',
    classroomId: 'class-1',
    membershipId: CHILD,
    removedAt: null,
  } as ClassroomStudent);

  const dataSource = new InMemoryDataSource()
    .register(StudentGuardian, guardians)
    .register(Membership, memberships)
    .register(User, users)
    .register(ClassroomStudent, enrollments)
    .register(Exam, exams)
    .register(Lesson, lessons)
    .register(ExamAttempt, examAttempts)
    .register(LessonAttempt, lessonAttempts)
    .register(ExamAttemptAnswer, examAnswers)
    .register(LessonAttemptAnswer, lessonAnswers)
    .register(ExamQuestion, examQuestions)
    .register(LessonQuestion, lessonQuestions)
    .register(ExamSection, examSections)
    .register(LessonSection, lessonSections)
    .asDataSource();

  // `LearnerClassesService` đã có unit test riêng: ở đây chỉ cần biết
  // `GuardianService` gọi nó với đúng con.
  const calls: { method: string; membershipId: string; userId?: string }[] = [];
  const classes = {
    listFor: (
      _ctx: TenantContext,
      viewer: { membershipId: string; userId: string },
    ) => {
      calls.push({ method: 'listFor', ...viewer });
      return Promise.resolve([] as LearnerClassItem[]);
    },
    detailFor: (
      _ctx: TenantContext,
      viewer: { membershipId: string; userId: string },
    ) => {
      calls.push({ method: 'detailFor', ...viewer });
      return Promise.resolve({
        ungrouped: [],
        groups: [],
      } as unknown as LearnerClassDetail);
    },
    scheduleFor: (_ctx: TenantContext, membershipId: string) => {
      calls.push({ method: 'scheduleFor', membershipId });
      return Promise.resolve({ sessions: [] } as never);
    },
  } as unknown as LearnerClassesService;

  return {
    service: new GuardianService(dataSource, classes),
    calls,
    exams,
    lessons,
    examAttempts,
    lessonAttempts,
    examAnswers,
    examQuestions,
    examSections,
  };
}

describe('GuardianService', () => {
  it('chỉ trả con đã liên kết, kèm quan hệ và số lớp', async () => {
    const { service } = setup();
    const children = await service.list(ctx);
    expect(children).toEqual([
      {
        membershipId: CHILD,
        fullName: 'Bé Na',
        email: 'u-child@example.com',
        relationship: 'Mẹ',
        inactive: false,
        classCount: 1,
      },
    ]);
  });

  it('học viên không liên kết: 404 ở mọi route', async () => {
    const { service } = setup();
    await expect(service.overview(ctx, OTHER_CHILD)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.classDetail(ctx, OTHER_CHILD, 'class-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.schedule(ctx, OTHER_CHILD, {
        from: '2026-09-01',
        to: '2026-09-30',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lớp, trang lớp và lịch đều đọc theo membership của con', async () => {
    const { service, calls } = setup();
    await service.overview(ctx, CHILD);
    await service.classDetail(ctx, CHILD, 'class-1');
    await service.schedule(ctx, CHILD, {
      from: '2026-09-01',
      to: '2026-09-30',
    });
    expect(calls).toEqual([
      { method: 'listFor', membershipId: CHILD, userId: 'u-child' },
      { method: 'detailFor', membershipId: CHILD, userId: 'u-child' },
      { method: 'scheduleFor', membershipId: CHILD },
    ]);
  });

  it('bài làm tự do: chỉ lượt ngoài lớp, điểm % khi đã chấm xong', async () => {
    const { service, exams, lessons, examAttempts, lessonAttempts } = setup();
    exams.rows.push({ id: 'exam-1', title: 'JLPT N5' } as Exam);
    lessons.rows.push({ id: 'lesson-1', title: 'Minna bài 1' } as Lesson);
    examAttempts.rows.push(
      {
        id: 'a-free',
        tenantId: TENANT,
        userId: 'u-child',
        examId: 'exam-1',
        classItemId: null,
        status: AttemptStatus.GRADED,
        startedAt: new Date('2026-09-10T02:00:00Z'),
        submittedAt: new Date('2026-09-10T03:00:00Z'),
        autoCorrect: 8,
        autoTotal: 10,
        manualCount: 0,
        manualGradedCount: 0,
      } as ExamAttempt,
      {
        id: 'a-trong-lop',
        tenantId: TENANT,
        userId: 'u-child',
        examId: 'exam-1',
        classItemId: 'item-1',
        status: AttemptStatus.GRADED,
        startedAt: new Date('2026-09-11T02:00:00Z'),
        autoCorrect: 1,
        autoTotal: 1,
        manualCount: 0,
        manualGradedCount: 0,
      } as ExamAttempt,
    );
    lessonAttempts.rows.push({
      id: 'l-free',
      tenantId: TENANT,
      userId: 'u-child',
      lessonId: 'lesson-1',
      classItemId: null,
      status: LessonAttemptStatus.COMPLETED,
      startedAt: new Date('2026-09-09T02:00:00Z'),
      submittedAt: new Date('2026-09-09T03:00:00Z'),
      completedAt: new Date('2026-09-09T03:00:00Z'),
      autoCorrect: 3,
      autoTotal: 4,
      manualCount: 0,
      manualGradedCount: 0,
    } as LessonAttempt);

    const overview = await service.overview(ctx, CHILD);
    expect(overview.examAttempts.map((row) => row.id)).toEqual(['a-free']);
    expect(overview.examAttempts[0]).toMatchObject({
      title: 'JLPT N5',
      percent: 80,
    });
    expect(overview.lessonAttempts.map((row) => row.id)).toEqual(['l-free']);
    expect(overview.lessonAttempts[0].title).toBe('Minna bài 1');
  });

  it('nhận xét chấm tay: chỉ câu đã chấm, theo thứ tự phần rồi số câu', async () => {
    const {
      service,
      exams,
      examAttempts,
      examAnswers,
      examQuestions,
      examSections,
    } = setup();
    exams.rows.push({ id: 'exam-1', title: 'JLPT N5' } as Exam);
    examAttempts.rows.push({
      id: 'a-free',
      tenantId: TENANT,
      userId: 'u-child',
      examId: 'exam-1',
      classItemId: null,
      status: AttemptStatus.GRADED,
      startedAt: new Date('2026-09-10T02:00:00Z'),
      autoCorrect: 0,
      autoTotal: 0,
      manualCount: 2,
      manualGradedCount: 2,
    } as ExamAttempt);
    examSections.rows.push(
      { id: 's-1', name: 'Writing', sortOrder: 2 } as ExamSection,
      { id: 's-2', name: 'Speaking', sortOrder: 1 } as ExamSection,
    );
    examQuestions.rows.push(
      {
        id: 'q-1',
        sectionId: 's-1',
        number: 3,
        maxScore: 10,
        grading: QuestionGrading.MANUAL,
      } as ExamQuestion,
      {
        id: 'q-2',
        sectionId: 's-2',
        number: 1,
        maxScore: 10,
        grading: QuestionGrading.MANUAL,
      } as ExamQuestion,
      {
        id: 'q-auto',
        sectionId: 's-1',
        number: 1,
        maxScore: 1,
        grading: QuestionGrading.AUTO,
      } as ExamQuestion,
    );
    examAnswers.rows.push(
      {
        id: 'ans-1',
        attemptId: 'a-free',
        questionId: 'q-1',
        score: 7.5,
        comment: 'Ý tốt, còn sai ngữ pháp',
        gradedAt: new Date('2026-09-12T02:00:00Z'),
      } as ExamAttemptAnswer,
      {
        id: 'ans-2',
        attemptId: 'a-free',
        questionId: 'q-2',
        score: 9,
        comment: null,
        gradedAt: new Date('2026-09-12T02:00:00Z'),
      } as ExamAttemptAnswer,
      // Câu tự chấm không có `graded_at` nên không lọt vào nhận xét.
      {
        id: 'ans-auto',
        attemptId: 'a-free',
        questionId: 'q-auto',
        score: 1,
        comment: null,
        gradedAt: null,
      } as ExamAttemptAnswer,
    );

    const { manualAnswers } = await service.overview(ctx, CHILD);
    expect(manualAnswers['a-free']).toEqual([
      {
        sectionName: 'Speaking',
        number: 1,
        score: 9,
        maxScore: 10,
        comment: null,
        gradedAt: '2026-09-12T02:00:00.000Z',
      },
      {
        sectionName: 'Writing',
        number: 3,
        score: 7.5,
        maxScore: 10,
        comment: 'Ý tốt, còn sai ngữ pháp',
        gradedAt: '2026-09-12T02:00:00.000Z',
      },
    ]);
  });
});
