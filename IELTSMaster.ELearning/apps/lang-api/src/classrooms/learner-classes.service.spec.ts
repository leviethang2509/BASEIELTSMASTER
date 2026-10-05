import 'reflect-metadata';
import {
  AttemptStatus,
  AttendanceMark,
  ClassAttemptState,
  ClassItemLock,
  ClassLogAction,
  ClassSessionKind,
  ClassSessionStatus,
  ClassroomStatus,
  CurriculumItemLabel,
  CurriculumItemType,
  ExamStatus,
  LessonAttemptStatus,
  MembershipStatus,
  TenantRole,
  TenantStatus,
} from '@lang/shared';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AttemptsService } from '../attempts/attempts.service';
import { ExamAttemptAnswer } from '../attempts/exam-attempt-answer.entity';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { Exam } from '../exams/exam.entity';
import { LessonAttempt } from '../lesson-attempts/lesson-attempt.entity';
import type { LessonAttemptsService } from '../lesson-attempts/lesson-attempts.service';
import { Lesson } from '../lessons/lesson.entity';
import { MembershipRole } from '../memberships/membership-role.entity';
import { Membership } from '../memberships/membership.entity';
import { TenantHoliday } from '../tenant-settings/tenant-holiday.entity';
import type { TenantContext } from '../tenants/tenant-context';
import { Tenant } from '../tenants/tenant.entity';
import { InMemoryDataSource } from '../testing/in-memory-data-source';
import { InMemoryRepository } from '../testing/in-memory-repository';
import { Course } from '../training/course.entity';
import { User } from '../users/user.entity';
import { ClassAttemptsService } from './class-attempts.service';
import { ClassChangeLog } from './class-change-log.entity';
import { ClassGroup } from './class-group.entity';
import { ClassItem } from './class-item.entity';
import { ClassSessionLink } from './class-session-link.entity';
import { ClassSessionTeacher } from './class-session-teacher.entity';
import { ClassSession } from './class-session.entity';
import { ClassroomStudent } from './classroom-student.entity';
import { ClassroomTeacher } from './classroom-teacher.entity';
import { Classroom } from './classroom.entity';
import { LearnerClassesService } from './learner-classes.service';
import { ScheduleFeedService } from './schedule-feed.service';

const TENANT = 'tenant-a';
const CLASS = 'class-1';
const STUDENT_USER = 'user-m-student';
const NOW = new Date('2026-10-20T10:00:00.000Z');

const context = (roles: TenantRole[], membershipId: string): TenantContext => ({
  tenantId: TENANT,
  slug: 'a',
  name: 'A',
  status: TenantStatus.ACTIVE,
  membershipId,
  roles,
  permissions: [],
});
const studentCtx = context([TenantRole.STUDENT], 'm-student');
const otherStudentCtx = context([TenantRole.STUDENT], 'm-student-2');
const ownerCtx = context([TenantRole.TENANT_OWNER], 'm-owner');
const teacherCtx = context([TenantRole.TEACHER], 'm-teacher');
const outsiderCtx = context([TenantRole.TEACHER], 'm-teacher-2');

const iso = (value: string) => new Date(value).toISOString();

function setup() {
  const timestamps = () => ({ createdAt: new Date(), updatedAt: new Date() });
  const classrooms = new InMemoryRepository<Classroom>(timestamps);
  const teachers = new InMemoryRepository<ClassroomTeacher>(
    () => ({}),
    ['classroomId', 'membershipId'],
  );
  const students = new InMemoryRepository<ClassroomStudent>();
  const groups = new InMemoryRepository<ClassGroup>();
  const items = new InMemoryRepository<ClassItem>();
  const logs = new InMemoryRepository<ClassChangeLog>();
  const courses = new InMemoryRepository<Course>(timestamps);
  const lessons = new InMemoryRepository<Lesson>(() => ({ deletedAt: null }));
  const exams = new InMemoryRepository<Exam>(() => ({ deletedAt: null }));
  const memberships = new InMemoryRepository<Membership>(() => ({
    deletedAt: null,
    status: MembershipStatus.ACTIVE,
  }));
  const roles = new InMemoryRepository<MembershipRole>(
    () => ({}),
    ['membershipId', 'role'],
  );
  const users = new InMemoryRepository<User>(timestamps);
  const examAttempts = new InMemoryRepository<ExamAttempt>(timestamps);
  const answers = new InMemoryRepository<ExamAttemptAnswer>(timestamps);
  const lessonAttempts = new InMemoryRepository<LessonAttempt>(timestamps);
  const sessions = new InMemoryRepository<ClassSession>(timestamps);
  const sessionTeachers = new InMemoryRepository<ClassSessionTeacher>(
    () => ({}),
    ['sessionId', 'membershipId'],
  );
  const sessionLinks = new InMemoryRepository<ClassSessionLink>();
  const holidays = new InMemoryRepository<TenantHoliday>(timestamps);
  const tenants = new InMemoryRepository<Tenant>(timestamps);
  tenants.rows.push({
    id: TENANT,
    lateWeight: 0.5,
    warningThreshold: 70,
  } as Tenant);

  const dataSource = new InMemoryDataSource()
    .register(Classroom, classrooms)
    .register(ClassroomTeacher, teachers)
    .register(ClassroomStudent, students)
    .register(ClassGroup, groups)
    .register(ClassItem, items)
    .register(ClassChangeLog, logs)
    .register(Course, courses)
    .register(Lesson, lessons)
    .register(Exam, exams)
    .register(Membership, memberships)
    .register(MembershipRole, roles)
    .register(User, users)
    .register(ExamAttempt, examAttempts)
    .register(ExamAttemptAnswer, answers)
    .register(LessonAttempt, lessonAttempts)
    .register(ClassSession, sessions)
    .register(ClassSessionTeacher, sessionTeachers)
    .register(ClassSessionLink, sessionLinks)
    .register(TenantHoliday, holidays)
    .register(Tenant, tenants)
    .asDataSource();

  // Service tạo lượt thật nằm ngoài phạm vi test này: chỉ ghi dòng lượt.
  const attemptsService = {
    createForClassItem: jest.fn(
      async (
        _manager: unknown,
        _ctx: TenantContext,
        userId: string,
        examId: string,
        classItemId: string,
      ) => {
        const id = randomUUID();
        await examAttempts.save({
          id,
          tenantId: TENANT,
          examId,
          examVersion: 1,
          userId,
          membershipId: 'm-student',
          classItemId,
          voidedAt: null,
          voidedBy: null,
          status: AttemptStatus.IN_PROGRESS,
          startedAt: NOW,
          submittedAt: null,
          gradedAt: null,
          autoCorrect: 0,
          autoTotal: 0,
          manualCount: 0,
          manualGradedCount: 0,
        } as ExamAttempt);
        return id;
      },
    ),
    finalizeAttempt: jest.fn(async (_manager: unknown, attemptId: string) => {
      await examAttempts.update(attemptId, {
        status: AttemptStatus.GRADED,
        submittedAt: NOW,
        gradedAt: NOW,
      } as Partial<ExamAttempt>);
    }),
  };
  const lessonAttemptsService = {
    startForClassItem: jest.fn(
      async (
        _manager: unknown,
        _ctx: TenantContext,
        userId: string,
        lessonId: string,
        classItemId: string,
      ) => {
        const existing = await lessonAttempts.findOneBy({
          lessonId,
          classItemId,
          userId,
          lessonVersion: 1,
        });
        if (existing) return existing.id;
        const id = randomUUID();
        await lessonAttempts.save({
          id,
          tenantId: TENANT,
          lessonId,
          lessonVersion: 1,
          userId,
          membershipId: 'm-student',
          classItemId,
          status: LessonAttemptStatus.IN_PROGRESS,
          startedAt: NOW,
          completedAt: null,
          submittedAt: null,
          gradedAt: null,
          autoCorrect: 0,
          autoTotal: 0,
          manualCount: 0,
          manualGradedCount: 0,
        } as LessonAttempt);
        return id;
      },
    ),
  };

  const feeds = new ScheduleFeedService(dataSource);
  const service = new LearnerClassesService(
    dataSource,
    attemptsService as unknown as AttemptsService,
    lessonAttemptsService as unknown as LessonAttemptsService,
    feeds,
  );
  const classAttempts = new ClassAttemptsService(
    dataSource,
    attemptsService as unknown as AttemptsService,
  );

  const addMember = (id: string, fullName: string, role: TenantRole) => {
    users.rows.push({
      id: `user-${id}`,
      fullName,
      email: `${id}@example.com`,
    } as User);
    memberships.rows.push({
      id,
      tenantId: TENANT,
      userId: `user-${id}`,
      status: MembershipStatus.ACTIVE,
      deletedAt: null,
    } as Membership);
    roles.rows.push({ membershipId: id, role, tenantId: TENANT });
  };
  addMember('m-owner', 'Chủ', TenantRole.TENANT_OWNER);
  addMember('m-teacher', 'Giáo viên A', TenantRole.TEACHER);
  addMember('m-teacher-2', 'Giáo viên B', TenantRole.TEACHER);
  addMember('m-student', 'Học viên 1', TenantRole.STUDENT);
  addMember('m-student-2', 'Học viên 2', TenantRole.STUDENT);

  courses.rows.push({
    id: 'course-n5',
    tenantId: TENANT,
    code: 'N5',
    name: 'Tiếng Nhật N5',
    plannedSessions: 10,
    ...timestamps(),
  } as Course);
  lessons.rows.push({
    id: 'lesson-1',
    tenantId: TENANT,
    title: 'Minna bài 1',
    status: ExamStatus.PUBLISHED,
    currentVersion: 1,
    deletedAt: null,
  } as Lesson);
  exams.rows.push(
    {
      id: 'exam-quiz',
      tenantId: TENANT,
      title: 'Kiểm tra chương 1',
      status: ExamStatus.PUBLISHED,
      currentVersion: 1,
      deletedAt: null,
    } as Exam,
    {
      id: 'exam-retake',
      tenantId: TENANT,
      title: 'Kiểm tra chương 1 (lần 2)',
      status: ExamStatus.PUBLISHED,
      currentVersion: 1,
      deletedAt: null,
    } as Exam,
  );
  classrooms.rows.push({
    id: CLASS,
    tenantId: TENANT,
    courseId: 'course-n5',
    code: 'N5-01',
    name: 'N5 tối 2-4',
    description: 'Lớp thử',
    startDate: '2026-10-05',
    endDate: null,
    plannedSessions: 10,
    maxStudents: null,
    location: 'Phòng 202',
    status: ClassroomStatus.ONGOING,
    applyTenantHolidays: true,
    sourceCurriculumId: null,
    curriculumRevision: 1,
    ...timestamps(),
  } as Classroom);
  teachers.rows.push({
    classroomId: CLASS,
    membershipId: 'm-teacher',
  } as ClassroomTeacher);
  students.rows.push(
    {
      id: 'cs-1',
      classroomId: CLASS,
      membershipId: 'm-student',
      joinedAt: new Date('2026-10-01T00:00:00.000Z'),
      removedAt: null,
    } as ClassroomStudent,
    {
      id: 'cs-2',
      classroomId: CLASS,
      membershipId: 'm-student-2',
      joinedAt: new Date('2026-10-01T00:00:00.000Z'),
      removedAt: null,
    } as ClassroomStudent,
  );
  groups.rows.push({
    id: 'g-1',
    classroomId: CLASS,
    title: 'Chương 1',
    sortOrder: 0,
    opensAt: null,
  } as ClassGroup);

  const addItem = (over: Partial<ClassItem>): ClassItem => {
    const row = {
      id: randomUUID(),
      classroomId: CLASS,
      groupId: null,
      sortOrder: items.rows.length,
      itemType: CurriculumItemType.LESSON,
      lessonId: null,
      examId: null,
      title: null,
      label: CurriculumItemLabel.LESSON,
      note: null,
      opensAt: null,
      deadlineAt: null,
      acceptLate: true,
      passThreshold: 50,
      retakeOfItemId: null,
      removedAt: null,
      ...over,
    } as ClassItem;
    items.rows.push(row);
    return row;
  };
  const lessonItem = addItem({
    lessonId: 'lesson-1',
    itemType: CurriculumItemType.LESSON,
  });
  const quizItem = addItem({
    groupId: 'g-1',
    itemType: CurriculumItemType.EXAM,
    examId: 'exam-quiz',
    label: CurriculumItemLabel.QUIZ,
    passThreshold: 70,
  });
  const retakeItem = addItem({
    groupId: 'g-1',
    sortOrder: 1,
    itemType: CurriculumItemType.EXAM,
    examId: 'exam-retake',
    label: CurriculumItemLabel.QUIZ,
    passThreshold: 70,
    retakeOfItemId: quizItem.id,
  });

  /** Lượt thi đã nộp và chấm xong cho một mục. */
  const gradedAttempt = async (
    item: ClassItem,
    over: Partial<ExamAttempt> = {},
  ) => {
    const id = randomUUID();
    await examAttempts.save({
      id,
      tenantId: TENANT,
      examId: item.examId!,
      examVersion: 1,
      userId: STUDENT_USER,
      membershipId: 'm-student',
      classItemId: item.id,
      voidedAt: null,
      voidedBy: null,
      status: AttemptStatus.GRADED,
      startedAt: new Date('2026-10-10T10:00:00.000Z'),
      submittedAt: new Date('2026-10-10T11:00:00.000Z'),
      gradedAt: new Date('2026-10-10T12:00:00.000Z'),
      autoCorrect: 8,
      autoTotal: 10,
      manualCount: 0,
      manualGradedCount: 0,
      ...over,
    } as ExamAttempt);
    return id;
  };

  return {
    service,
    classAttempts,
    dataSource,
    classrooms,
    tenants,
    students,
    items,
    logs,
    sessions,
    sessionLinks,
    examAttempts,
    answers,
    lessonAttempts,
    lessonItem,
    quizItem,
    retakeItem,
    gradedAttempt,
    attemptsService,
    lessonAttemptsService,
  };
}

beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  jest.setSystemTime(NOW);
});
afterAll(() => jest.useRealTimers());

describe('Lớp của tôi', () => {
  it('chỉ lớp mà mình còn là học viên', async () => {
    const { service, students } = setup();
    const mine = await service.list(studentCtx, STUDENT_USER);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({
      code: 'N5-01',
      itemCount: 3,
      doneCount: 0,
      studentCount: 2,
      location: 'Phòng 202',
    });
    expect(mine[0].teachers.map((t) => t.fullName)).toEqual(['Giáo viên A']);

    await students.update({ id: 'cs-1' }, { removedAt: NOW });
    expect(await service.list(studentCtx, STUDENT_USER)).toEqual([]);
  });

  it('đếm mục đã xong và buổi kế tiếp', async () => {
    const { service, sessions, quizItem, gradedAttempt } = setup();
    await gradedAttempt(quizItem);
    sessions.rows.push(
      {
        id: 's-past',
        classroomId: CLASS,
        kind: ClassSessionKind.REGULAR,
        seq: 1,
        startsAt: new Date('2026-10-05T11:00:00.000Z'),
        endsAt: new Date('2026-10-05T12:30:00.000Z'),
        status: ClassSessionStatus.SCHEDULED,
        location: null,
      } as ClassSession,
      {
        id: 's-next',
        classroomId: CLASS,
        kind: ClassSessionKind.REGULAR,
        seq: 2,
        startsAt: new Date('2026-10-21T11:00:00.000Z'),
        endsAt: new Date('2026-10-21T12:30:00.000Z'),
        status: ClassSessionStatus.SCHEDULED,
        location: 'Phòng 303',
      } as ClassSession,
    );
    const [mine] = await service.list(studentCtx, STUDENT_USER);
    expect(mine.doneCount).toBe(1);
    expect(mine.nextSession).toMatchObject({
      seq: 2,
      location: 'Phòng 303',
    });
  });

  it('người ngoài lớp không xem được trang lớp', async () => {
    const { service } = setup();
    await expect(
      service.detail(outsiderCtx, 'user-m-teacher-2', CLASS),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('Trang lớp của học viên', () => {
  it('mục mở thì vào được, nhóm thi lần 1 bắt buộc', async () => {
    const { service, lessonItem, quizItem, retakeItem } = setup();
    const detail = await service.detail(studentCtx, STUDENT_USER, CLASS);
    expect(detail.isOpen).toBe(true);
    expect(detail.ungrouped.map((item) => item.id)).toEqual([lessonItem.id]);
    expect(detail.ungrouped[0]).toMatchObject({
      title: 'Minna bài 1',
      lock: null,
      required: true,
      attemptIndex: null,
      lessonCompletedAt: null,
    });
    const [quiz, retake] = detail.groups[0].items;
    expect(quiz).toMatchObject({
      id: quizItem.id,
      attemptIndex: 1,
      required: true,
      lock: null,
    });
    expect(retake).toMatchObject({
      id: retakeItem.id,
      attemptIndex: 2,
      required: true,
    });
    expect(detail.examGroups).toEqual([
      {
        rootItemId: quizItem.id,
        title: 'Kiểm tra chương 1',
        itemIds: [quizItem.id, retakeItem.id],
        bestPercent: null,
        passed: false,
        hasPending: false,
      },
    ]);
  });

  it('điểm % gồm điểm chấm tay, đậu theo ngưỡng của mục', async () => {
    const { service, quizItem, gradedAttempt, answers } = setup();
    const attemptId = await gradedAttempt(quizItem, {
      autoCorrect: 6,
      autoTotal: 10,
      manualCount: 1,
      manualGradedCount: 1,
    });
    answers.rows.push({
      id: 'ans-1',
      attemptId,
      score: 7,
      gradedAt: new Date('2026-10-10T12:00:00.000Z'),
    } as ExamAttemptAnswer);
    const detail = await service.detail(studentCtx, STUDENT_USER, CLASS);
    const quiz = detail.groups[0].items[0];
    // (6 + 7) / (10 + 10) = 65% < ngưỡng 70 → trượt.
    expect(quiz.attempt).toMatchObject({
      state: ClassAttemptState.GRADED,
      percent: 65,
      passed: false,
    });
    expect(quiz.lock).toBe(ClassItemLock.DONE);
    expect(detail.examGroups[0]).toMatchObject({
      bestPercent: 65,
      passed: false,
    });
  });

  it('đậu lần 1 → lần thi lại không bắt buộc, điểm nhóm là cao nhất', async () => {
    const { service, quizItem, retakeItem, gradedAttempt } = setup();
    await gradedAttempt(quizItem, { autoCorrect: 9, autoTotal: 10 });
    await gradedAttempt(retakeItem, { autoCorrect: 6, autoTotal: 10 });
    const detail = await service.detail(studentCtx, STUDENT_USER, CLASS);
    const [quiz, retake] = detail.groups[0].items;
    expect(quiz).toMatchObject({ required: true, attempt: { percent: 90 } });
    expect(retake).toMatchObject({ required: false, attempt: { percent: 60 } });
    expect(detail.examGroups[0]).toMatchObject({
      bestPercent: 90,
      passed: true,
      hasPending: false,
    });
  });

  it('lượt còn câu chưa chấm hiện "chờ chấm", không tính điểm', async () => {
    const { service, quizItem, gradedAttempt } = setup();
    await gradedAttempt(quizItem, {
      status: AttemptStatus.SUBMITTED,
      gradedAt: null,
      manualCount: 1,
      manualGradedCount: 0,
    });
    const detail = await service.detail(studentCtx, STUDENT_USER, CLASS);
    expect(detail.groups[0].items[0].attempt).toMatchObject({
      state: ClassAttemptState.PENDING_GRADING,
      percent: null,
      passed: null,
    });
    expect(detail.examGroups[0]).toMatchObject({
      bestPercent: null,
      hasPending: true,
    });
  });

  it('lấy mốc mở muộn hơn giữa chương và mục', async () => {
    const { service, dataSource, items, quizItem } = setup();
    await dataSource.manager
      .getRepository(ClassGroup)
      .update({ id: 'g-1' }, { opensAt: new Date('2026-10-19T11:00:00.000Z') });
    await items.update(
      { id: quizItem.id },
      { opensAt: new Date('2026-10-21T11:00:00.000Z') },
    );
    const detail = await service.detail(studentCtx, STUDENT_USER, CLASS);
    const quiz = detail.groups[0].items[0];
    expect(quiz.opensAt).toBe(iso('2026-10-21T11:00:00.000Z'));
    expect(quiz.lock).toBe(ClassItemLock.NOT_OPEN);
  });

  it('hiện buổi có map nội dung và buổi sắp tới', async () => {
    const { service, sessions, sessionLinks, lessonItem } = setup();
    sessions.rows.push({
      id: 's-1',
      classroomId: CLASS,
      kind: ClassSessionKind.REGULAR,
      seq: 1,
      startsAt: new Date('2026-10-21T11:00:00.000Z'),
      endsAt: new Date('2026-10-21T12:30:00.000Z'),
      status: ClassSessionStatus.SCHEDULED,
      location: null,
    } as ClassSession);
    sessionLinks.rows.push({
      id: 'sl-1',
      sessionId: 's-1',
      classItemId: lessonItem.id,
      classGroupId: null,
    } as ClassSessionLink);
    const detail = await service.detail(studentCtx, STUDENT_USER, CLASS);
    expect(detail.ungrouped[0].sessions).toEqual([
      {
        id: 's-1',
        kind: ClassSessionKind.REGULAR,
        seq: 1,
        startsAt: iso('2026-10-21T11:00:00.000Z'),
        endsAt: iso('2026-10-21T12:30:00.000Z'),
        status: ClassSessionStatus.SCHEDULED,
        location: 'Phòng 202',
      },
    ]);
    expect(detail.upcomingSessions.map((s) => s.id)).toEqual(['s-1']);
  });

  it('mục đã ẩn không hiện với học viên', async () => {
    const { service, items, lessonItem } = setup();
    await items.update({ id: lessonItem.id }, { removedAt: NOW });
    const detail = await service.detail(studentCtx, STUDENT_USER, CLASS);
    expect(detail.ungrouped).toEqual([]);
    expect(detail.itemCount).toBe(2);
  });
});

describe('Bắt đầu mục của lớp', () => {
  it('mục đề thi tạo lượt mới, làm lần hai thì 409', async () => {
    const { service, quizItem, attemptsService } = setup();
    const started = await service.startItem(
      studentCtx,
      STUDENT_USER,
      CLASS,
      quizItem.id,
    );
    expect(started.itemType).toBe(CurriculumItemType.EXAM);
    expect(attemptsService.createForClassItem).toHaveBeenCalledTimes(1);
    await expect(
      service.startItem(studentCtx, STUDENT_USER, CLASS, quizItem.id),
    ).rejects.toThrow(ConflictException);
  });

  it('mục bài học mở lại cùng lượt', async () => {
    const { service, lessonItem } = setup();
    const first = await service.startItem(
      studentCtx,
      STUDENT_USER,
      CLASS,
      lessonItem.id,
    );
    const second = await service.startItem(
      studentCtx,
      STUDENT_USER,
      CLASS,
      lessonItem.id,
    );
    expect(second.attemptId).toBe(first.attemptId);
    expect(second.itemType).toBe(CurriculumItemType.LESSON);
  });

  it.each([ClassroomStatus.UPCOMING, ClassroomStatus.FINISHED])(
    'lớp %s không vào mục được',
    async (status) => {
      const { service, classrooms, lessonItem } = setup();
      await classrooms.update({ id: CLASS }, { status });
      await expect(
        service.startItem(studentCtx, STUDENT_USER, CLASS, lessonItem.id),
      ).rejects.toThrow(ConflictException);
    },
  );

  it('chưa tới ngày mở thì không vào được', async () => {
    const { service, items, lessonItem } = setup();
    await items.update(
      { id: lessonItem.id },
      { opensAt: new Date('2026-10-25T11:00:00.000Z') },
    );
    await expect(
      service.startItem(studentCtx, STUDENT_USER, CLASS, lessonItem.id),
    ).rejects.toThrow(/chưa tới ngày mở/);
  });

  it('quá deadline mà không nhận bài quá hạn thì không bắt đầu được', async () => {
    const { service, items, quizItem } = setup();
    await items.update(
      { id: quizItem.id },
      { acceptLate: false, deadlineAt: new Date('2026-10-19T11:00:00.000Z') },
    );
    await expect(
      service.startItem(studentCtx, STUDENT_USER, CLASS, quizItem.id),
    ).rejects.toThrow(/quá hạn/);
  });

  it('quá deadline nhưng vẫn nhận bài quá hạn thì bắt đầu được', async () => {
    const { service, items, quizItem } = setup();
    await items.update(
      { id: quizItem.id },
      { deadlineAt: new Date('2026-10-19T11:00:00.000Z') },
    );
    await expect(
      service.startItem(studentCtx, STUDENT_USER, CLASS, quizItem.id),
    ).resolves.toMatchObject({ itemType: CurriculumItemType.EXAM });
  });

  it('đề thi đã xoá thì không bắt đầu được', async () => {
    const { service, dataSource, quizItem } = setup();
    await dataSource.manager
      .getRepository(Exam)
      .update({ id: 'exam-quiz' }, { deletedAt: NOW });
    await expect(
      service.startItem(studentCtx, STUDENT_USER, CLASS, quizItem.id),
    ).rejects.toThrow(/không còn/);
  });

  it('mục đã ẩn hoặc lớp khác → 404', async () => {
    const { service, items, lessonItem } = setup();
    await items.update({ id: lessonItem.id }, { removedAt: NOW });
    await expect(
      service.startItem(studentCtx, STUDENT_USER, CLASS, lessonItem.id),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.startItem(otherStudentCtx, 'user-m-student-2', CLASS, 'khong-co'),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('Cho làm lại (voided)', () => {
  it('giáo viên của lớp cho làm lại, học viên bắt đầu lượt mới', async () => {
    const { service, classAttempts, quizItem, gradedAttempt, logs } = setup();
    const attemptId = await gradedAttempt(quizItem);
    await expect(
      service.startItem(studentCtx, STUDENT_USER, CLASS, quizItem.id),
    ).rejects.toThrow(ConflictException);

    const result = await classAttempts.voidAttempt(
      teacherCtx,
      'user-m-teacher',
      CLASS,
      quizItem.id,
      attemptId,
    );
    expect(result.attemptId).toBe(attemptId);
    expect(logs.rows.at(-1)).toMatchObject({
      action: ClassLogAction.ATTEMPT_VOIDED,
      detail: { itemTitle: 'Kiểm tra chương 1', studentName: 'Học viên 1' },
    });
    await expect(
      service.startItem(studentCtx, STUDENT_USER, CLASS, quizItem.id),
    ).resolves.toMatchObject({ itemType: CurriculumItemType.EXAM });
  });

  it('lượt đang làm dở bị chốt trước khi đánh dấu', async () => {
    const { classAttempts, quizItem, gradedAttempt, attemptsService } = setup();
    const attemptId = await gradedAttempt(quizItem, {
      status: AttemptStatus.IN_PROGRESS,
      submittedAt: null,
      gradedAt: null,
    });
    await classAttempts.voidAttempt(
      ownerCtx,
      'user-m-owner',
      CLASS,
      quizItem.id,
      attemptId,
    );
    expect(attemptsService.finalizeAttempt).toHaveBeenCalledWith(
      expect.anything(),
      attemptId,
      expect.any(Date),
    );
  });

  it('cho làm lại hai lần → 409; giáo viên ngoài lớp → 403', async () => {
    const { classAttempts, quizItem, gradedAttempt } = setup();
    const attemptId = await gradedAttempt(quizItem);
    await classAttempts.voidAttempt(
      teacherCtx,
      'user-m-teacher',
      CLASS,
      quizItem.id,
      attemptId,
    );
    await expect(
      classAttempts.voidAttempt(
        teacherCtx,
        'user-m-teacher',
        CLASS,
        quizItem.id,
        attemptId,
      ),
    ).rejects.toThrow(ConflictException);
    await expect(
      classAttempts.voidAttempt(
        outsiderCtx,
        'user-m-teacher-2',
        CLASS,
        quizItem.id,
        attemptId,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lớp đã kết thúc thì không cho làm lại', async () => {
    const { classAttempts, classrooms, quizItem, gradedAttempt } = setup();
    const attemptId = await gradedAttempt(quizItem);
    await classrooms.update(
      { id: CLASS },
      { status: ClassroomStatus.FINISHED },
    );
    await expect(
      classAttempts.voidAttempt(
        ownerCtx,
        'user-m-owner',
        CLASS,
        quizItem.id,
        attemptId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('danh sách lượt của mục kèm điểm và cờ đã cho làm lại', async () => {
    const { classAttempts, quizItem, gradedAttempt } = setup();
    const attemptId = await gradedAttempt(quizItem, {
      autoCorrect: 8,
      autoTotal: 10,
    });
    await classAttempts.voidAttempt(
      teacherCtx,
      'user-m-teacher',
      CLASS,
      quizItem.id,
      attemptId,
    );
    const rows = await classAttempts.listForItem(
      teacherCtx,
      CLASS,
      quizItem.id,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: attemptId,
      percent: 80,
      passed: true,
      student: { membershipId: 'm-student', fullName: 'Học viên 1' },
    });
    expect(rows[0].voidedAt).not.toBeNull();
  });

  it('mục bài học không có lượt thi để cho làm lại', async () => {
    const { classAttempts, lessonItem } = setup();
    await expect(
      classAttempts.listForItem(teacherCtx, CLASS, lessonItem.id),
    ).rejects.toThrow(/đề thi/);
  });
});

describe('Lịch học của tôi', () => {
  it('chỉ buổi của lớp mình đang học', async () => {
    const { service, sessions, classrooms } = setup();
    classrooms.rows.push({
      id: 'class-2',
      tenantId: TENANT,
      courseId: 'course-n5',
      code: 'N5-02',
      name: 'Lớp khác',
      startDate: '2026-10-05',
      endDate: null,
      plannedSessions: 10,
      maxStudents: null,
      location: null,
      status: ClassroomStatus.ONGOING,
      applyTenantHolidays: true,
      curriculumRevision: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Classroom);
    sessions.rows.push(
      {
        id: 's-mine',
        classroomId: CLASS,
        kind: ClassSessionKind.REGULAR,
        seq: 1,
        startsAt: new Date('2026-10-21T11:00:00.000Z'),
        endsAt: new Date('2026-10-21T12:30:00.000Z'),
        status: ClassSessionStatus.SCHEDULED,
        customTeachers: false,
        movedWarning: false,
        location: null,
      } as ClassSession,
      {
        id: 's-other',
        classroomId: 'class-2',
        kind: ClassSessionKind.REGULAR,
        seq: 1,
        startsAt: new Date('2026-10-22T11:00:00.000Z'),
        endsAt: new Date('2026-10-22T12:30:00.000Z'),
        status: ClassSessionStatus.SCHEDULED,
        customTeachers: false,
        movedWarning: false,
        location: null,
      } as ClassSession,
    );
    const feed = await service.schedule(studentCtx, {
      from: '2026-10-01',
      to: '2026-10-31',
    } as never);
    expect(feed.sessions.map((s) => s.id)).toEqual(['s-mine']);
  });
});

describe('Kết quả cuối khoá của học viên (Step 11)', () => {
  /** Mục kiểm tra có deadline đã qua; lượt của học viên vào thi trước hạn. */
  async function finishedClass(closed = true) {
    const harness = setup();
    harness.quizItem.deadlineAt = new Date('2026-10-15T17:00:00.000Z');
    await harness.gradedAttempt(harness.quizItem, {
      autoCorrect: 9,
      autoTotal: 10,
    });
    harness.students.rows[0]!.finalComment = 'Cần luyện nói thêm';
    harness.students.rows[0]!.finalCommentBy = 'user-m-teacher';
    harness.students.rows[0]!.finalCommentAt = new Date(
      '2026-10-19T10:00:00.000Z',
    );
    if (closed) {
      harness.classrooms.rows[0]!.status = ClassroomStatus.FINISHED;
    }
    return harness;
  }

  it('lớp đang học: không có tổng kết (R11.3)', async () => {
    const { service } = await finishedClass(false);
    const detail = await service.detail(studentCtx, STUDENT_USER, CLASS);
    expect(detail.summary).toBeNull();
    // Trạng thái từng mục vẫn thấy.
    expect(detail.groups[0].items[0].attempt).toMatchObject({ percent: 90 });
  });

  it('lớp đã kết thúc: tỉ lệ chuyên cần, trung bình chương và nhận xét', async () => {
    const { service } = await finishedClass();
    const detail = await service.detail(studentCtx, STUDENT_USER, CLASS);
    expect(detail.summary).toMatchObject({
      warningThreshold: 70,
      belowThreshold: false,
      attendance: { onTime: 1, late: 0, missed: 0, counted: 1, percent: 100 },
      finalComment: {
        text: 'Cần luyện nói thêm',
        author: { id: 'user-m-teacher', fullName: 'Giáo viên A' },
      },
    });
    expect(detail.summary!.attendanceItems).toEqual([
      {
        itemId: expect.any(String),
        title: 'Kiểm tra chương 1',
        deadlineAt: iso('2026-10-15T17:00:00.000Z'),
        mark: AttendanceMark.ON_TIME,
        startedAt: iso('2026-10-10T10:00:00.000Z'),
      },
    ]);
    expect(detail.summary!.groupAverages).toEqual([
      { groupId: 'g-1', title: 'Chương 1', percent: 90 },
    ]);
  });

  it('học viên khác trong lớp không thấy nhận xét của người khác', async () => {
    const { service } = await finishedClass();
    const detail = await service.detail(
      otherStudentCtx,
      'user-m-student-2',
      CLASS,
    );
    expect(detail.summary!.finalComment).toBeNull();
    expect(detail.summary!.attendance.percent).toBe(0);
  });
});
