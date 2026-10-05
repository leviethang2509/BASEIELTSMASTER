import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AttemptStatus,
  AttendanceMark,
  ClassLogAction,
  ClassSessionKind,
  ClassSessionStatus,
  ClassroomStatus,
  CourseStatus,
  CurriculumItemLabel,
  NotificationType,
  CurriculumItemType,
  ExamStatus,
  LessonAttemptStatus,
  MembershipStatus,
  TenantRole,
  TenantStatus,
  trainingDateOf,
  trainingDateTimeToIso,
  type ClassCurriculum,
  type ClassItemInput,
  type ClassItemView,
  type ClassScheduleView,
  type ScheduleSlot,
} from '@lang/shared';
import { plainToInstance } from 'class-transformer';
import ExcelJS from 'exceljs';
import { validate } from 'class-validator';
import { randomUUID } from 'node:crypto';
import type { AttemptsService } from '../attempts/attempts.service';
import { ExamAttemptAnswer } from '../attempts/exam-attempt-answer.entity';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { validationMessages } from '../common/validation';
import { Exam } from '../exams/exam.entity';
import { LessonAttempt } from '../lesson-attempts/lesson-attempt.entity';
import { Lesson } from '../lessons/lesson.entity';
import { MembershipRole } from '../memberships/membership-role.entity';
import { StudentGuardian } from '../memberships/student-guardian.entity';
import { Membership } from '../memberships/membership.entity';
import { TenantHoliday } from '../tenant-settings/tenant-holiday.entity';
import { TenantSettingsService } from '../tenant-settings/tenant-settings.service';
import type { TenantContext } from '../tenants/tenant-context';
import { Tenant } from '../tenants/tenant.entity';
import { fakeNotifications } from '../testing/fake-notifications';
import { InMemoryDataSource } from '../testing/in-memory-data-source';
import { InMemoryRepository } from '../testing/in-memory-repository';
import { assertLessonNotInUse } from '../training/content-usage';
import { CourseCurriculum } from '../training/course-curriculum.entity';
import { Course } from '../training/course.entity';
import { CoursesService } from '../training/courses.service';
import { CurriculaService } from '../training/curricula.service';
import { CurriculumGroup } from '../training/curriculum-group.entity';
import { CurriculumItem } from '../training/curriculum-item.entity';
import { Curriculum } from '../training/curriculum.entity';
import { User } from '../users/user.entity';
import { ClassChangeLog } from './class-change-log.entity';
import { ClassCurriculumService } from './class-curriculum.service';
import { ClassGroup } from './class-group.entity';
import { ClassItem } from './class-item.entity';
import { ClassMembersService } from './class-members.service';
import { ClassProgressService } from './class-progress.service';
import { ClassStudentAttemptsService } from './class-student-attempts.service';
import { ClassroomStudent } from './classroom-student.entity';
import { ClassroomTeacher } from './classroom-teacher.entity';
import { Classroom } from './classroom.entity';
import { ClassroomsService } from './classrooms.service';
import { ClassScheduleSlot } from './class-schedule-slot.entity';
import { ClassScheduleService } from './class-schedule.service';
import { ClassSessionLink } from './class-session-link.entity';
import { ClassSessionTeacher } from './class-session-teacher.entity';
import { ClassSession } from './class-session.entity';
import { ClassSessionsService } from './class-sessions.service';
import {
  ClassGroupInputDto,
  SaveClassCurriculumDto,
} from './dto/class-curriculum.dto';
import type { SaveClassScheduleDto } from './dto/class-schedule.dto';
import { CreateClassroomDto } from './dto/classroom.dto';
import { UpdateTenantSettingsDto } from '../tenant-settings/dto/tenant-settings.dto';
import { fakeDate } from '../testing/fake-clock';

const TENANT = 'tenant-a';
const OWNER = 'user-owner';

const context = (
  roles: TenantRole[],
  membershipId: string,
  tenantId = TENANT,
): TenantContext => ({
  tenantId,
  slug: 'a',
  name: 'A',
  status: TenantStatus.ACTIVE,
  membershipId,
  roles,
  permissions: [],
});
const ownerCtx = context([TenantRole.TENANT_OWNER], 'm-owner');
const teacherCtx = context([TenantRole.TEACHER], 'm-teacher');
const otherTeacherCtx = context([TenantRole.TEACHER], 'm-teacher-2');

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
  const links = new InMemoryRepository<CourseCurriculum>(
    () => ({}),
    ['courseId', 'curriculumId'],
  );
  const curricula = new InMemoryRepository<Curriculum>(timestamps);
  const curriculumGroups = new InMemoryRepository<CurriculumGroup>();
  const curriculumItems = new InMemoryRepository<CurriculumItem>();
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
  const guardians = new InMemoryRepository<StudentGuardian>();
  const users = new InMemoryRepository<User>(timestamps);
  const examAttempts = new InMemoryRepository<ExamAttempt>();
  const examAnswers = new InMemoryRepository<ExamAttemptAnswer>();
  const lessonAttempts = new InMemoryRepository<LessonAttempt>();
  const slots = new InMemoryRepository<ClassScheduleSlot>();
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
    .register(CourseCurriculum, links)
    .register(Curriculum, curricula)
    .register(CurriculumGroup, curriculumGroups)
    .register(CurriculumItem, curriculumItems)
    .register(Lesson, lessons)
    .register(Exam, exams)
    .register(Membership, memberships)
    .register(MembershipRole, roles)
    .register(StudentGuardian, guardians)
    .register(User, users)
    .register(ExamAttempt, examAttempts)
    .register(ExamAttemptAnswer, examAnswers)
    .register(LessonAttempt, lessonAttempts)
    .register(ClassScheduleSlot, slots)
    .register(ClassSession, sessions)
    .register(ClassSessionTeacher, sessionTeachers)
    .register(ClassSessionLink, sessionLinks)
    .register(TenantHoliday, holidays)
    .register(Tenant, tenants)
    .asDataSource();

  const attemptsService = {
    finalizeForClassItems: jest.fn().mockResolvedValue(2),
  };
  const notifications = fakeNotifications();
  const classroomsService = new ClassroomsService(
    dataSource,
    attemptsService as unknown as AttemptsService,
    classrooms.asRepository(),
    teachers.asRepository(),
    students.asRepository(),
    courses.asRepository(),
    memberships.asRepository(),
    users.asRepository(),
    logs.asRepository(),
    notifications.service,
  );
  const membersService = new ClassMembersService(
    dataSource,
    notifications.service,
  );
  const studentAttemptsService = new ClassStudentAttemptsService(
    dataSource,
    {} as never,
  );
  const progressService = new ClassProgressService(
    dataSource,
    notifications.service,
  );
  const curriculumService = new ClassCurriculumService(
    dataSource,
    notifications.service,
  );
  const scheduleService = new ClassScheduleService(
    dataSource,
    notifications.service,
  );
  const sessionsService = new ClassSessionsService(
    dataSource,
    notifications.service,
  );
  const settingsService = new TenantSettingsService(
    dataSource,
    notifications.service,
  );
  const coursesService = new CoursesService(
    dataSource,
    {} as CurriculaService,
    courses.asRepository(),
    links.asRepository(),
    curricula.asRepository(),
    {} as never,
  );

  /** Thành viên có user và các role. */
  const addMember = (
    id: string,
    fullName: string,
    memberRoles: TenantRole[],
    status: MembershipStatus = MembershipStatus.ACTIVE,
  ) => {
    const userId = `user-${id}`;
    users.rows.push({
      id: userId,
      fullName,
      email: `${id}@example.com`,
    } as User);
    memberships.rows.push({
      id,
      tenantId: TENANT,
      userId,
      status,
      deletedAt: null,
    } as Membership);
    for (const role of memberRoles) {
      roles.rows.push({ membershipId: id, role, tenantId: TENANT });
    }
  };
  addMember('m-owner', 'Chủ', [TenantRole.TENANT_OWNER]);
  addMember('m-teacher', 'Giáo viên A', [TenantRole.TEACHER]);
  addMember('m-teacher-2', 'Giáo viên B', [TenantRole.TEACHER]);
  for (const n of [1, 2, 3]) {
    addMember(`m-student-${n}`, `Học viên ${n}`, [TenantRole.STUDENT]);
  }
  addMember('m-parent', 'Phụ huynh', [TenantRole.PARENT]);
  addMember(
    'm-inactive',
    'Học viên ngừng',
    [TenantRole.STUDENT],
    MembershipStatus.INACTIVE,
  );

  const content = (
    repository: InMemoryRepository<Lesson> | InMemoryRepository<Exam>,
    id: string,
    title: string,
    status: ExamStatus = ExamStatus.PUBLISHED,
  ) => {
    (repository.rows as { id: string }[]).push({
      id,
      tenantId: TENANT,
      title,
      status,
      deletedAt: null,
    } as never);
    return id;
  };
  const lesson1 = content(lessons, 'lesson-1', 'Minna bài 1');
  const lesson2 = content(lessons, 'lesson-2', 'Minna bài 2');
  // Bài chưa nằm trong giáo trình nào, dùng khi thêm mục mới.
  const lesson3 = content(lessons, 'lesson-3', 'Minna bài 3');
  const lesson4 = content(lessons, 'lesson-4', 'Minna bài 4');
  const quiz = content(exams, 'exam-quiz', 'Kiểm tra chương 1');
  const final = content(exams, 'exam-final', 'Thi cuối khoá');
  content(exams, 'exam-draft', 'Nháp', ExamStatus.DRAFT);

  courses.rows.push(
    {
      id: 'course-n5',
      tenantId: TENANT,
      code: 'N5',
      name: 'Tiếng Nhật N5',
      status: CourseStatus.ACTIVE,
      plannedSessions: 24,
      ...timestamps(),
    } as Course,
    {
      id: 'course-old',
      tenantId: TENANT,
      code: 'OLD',
      name: 'Khoá cũ',
      status: CourseStatus.ARCHIVED,
      plannedSessions: null,
      ...timestamps(),
    } as Course,
  );
  // Giáo trình N5: 1 mục chưa xếp chương + chương "Chương 1" (bài 2, kiểm tra).
  curricula.rows.push(
    {
      id: 'cur-n5',
      tenantId: TENANT,
      name: 'Giáo trình N5',
      ...timestamps(),
    } as Curriculum,
    {
      id: 'cur-other',
      tenantId: TENANT,
      name: 'Khác',
      ...timestamps(),
    } as Curriculum,
  );
  links.rows.push({
    courseId: 'course-n5',
    curriculumId: 'cur-n5',
  } as CourseCurriculum);
  curriculumGroups.rows.push({
    id: 'cg-1',
    curriculumId: 'cur-n5',
    title: 'Chương 1',
    sortOrder: 0,
  });
  curriculumItems.rows.push(
    {
      id: 'ci-0',
      curriculumId: 'cur-n5',
      groupId: null,
      sortOrder: 0,
      itemType: CurriculumItemType.LESSON,
      lessonId: lesson1,
      examId: null,
      title: null,
      label: CurriculumItemLabel.LESSON,
      note: 'Buổi đầu',
    },
    {
      id: 'ci-2',
      curriculumId: 'cur-n5',
      groupId: 'cg-1',
      sortOrder: 1,
      itemType: CurriculumItemType.EXAM,
      lessonId: null,
      examId: quiz,
      title: null,
      label: CurriculumItemLabel.QUIZ,
      note: null,
    },
    {
      id: 'ci-1',
      curriculumId: 'cur-n5',
      groupId: 'cg-1',
      sortOrder: 0,
      itemType: CurriculumItemType.LESSON,
      lessonId: lesson2,
      examId: null,
      title: 'Bài 2',
      label: CurriculumItemLabel.HOMEWORK,
      note: null,
    },
  );

  /** Lớp N5 chép giáo trình, có Giáo viên A. */
  const createClass = async (extra: Partial<CreateClassroomDto> = {}) => {
    const detail = await classroomsService.create(ownerCtx, OWNER, {
      courseId: 'course-n5',
      code: 'N5-01',
      name: 'N5 tối 2-4',
      startDate: '2026-10-05',
      sourceCurriculumId: 'cur-n5',
      ...extra,
    } as CreateClassroomDto);
    await membersService.addTeachers(ownerCtx, OWNER, detail.id, ['m-teacher']);
    return detail;
  };

  return {
    notifications,
    classroomsService,
    membersService,
    studentAttemptsService,
    progressService,
    examAnswers,
    curriculumService,
    scheduleService,
    sessionsService,
    settingsService,
    sessions,
    sessionLinks,
    coursesService,
    attemptsService,
    dataSource,
    classrooms,
    memberships,
    guardians,
    students,
    items,
    logs,
    examAttempts,
    lessonAttempts,
    lessons,
    ids: { lesson1, lesson2, lesson3, lesson4, quiz, final },
    createClass,
  };
}

/** Payload lưu từ giáo trình đang có (giữ nguyên), cho phép sửa trước khi gửi. */
function toInput(view: ClassItemView): ClassItemInput {
  return {
    id: view.id,
    itemType: view.itemType,
    contentId: view.content.id,
    title: view.title,
    label: view.label,
    note: view.note,
    opensAt: view.opensAt,
    deadlineAt: view.deadlineAt,
    acceptLate: view.acceptLate,
    passThreshold: view.passThreshold,
    retakeOfItemId: view.retakeOfItemId,
  };
}

function payload(
  curriculum: ClassCurriculum,
  change: (draft: {
    ungrouped: ClassItemInput[];
    groups: {
      id?: string;
      title: string;
      opensAt?: string | null;
      items: ClassItemInput[];
    }[];
  }) => void = () => undefined,
): SaveClassCurriculumDto {
  const draft = {
    ungrouped: curriculum.ungrouped.map(toInput),
    groups: curriculum.groups.map((group) => ({
      id: group.id,
      title: group.title,
      opensAt: group.opensAt,
      items: group.items.map(toInput),
    })),
  };
  change(draft);
  return {
    baseRevision: curriculum.revision,
    ...draft,
  } as SaveClassCurriculumDto;
}

const lessonItem = (contentId: string): ClassItemInput => ({
  itemType: CurriculumItemType.LESSON,
  contentId,
  label: CurriculumItemLabel.LESSON,
});

const examItem = (
  contentId: string,
  extra: Partial<ClassItemInput> = {},
): ClassItemInput => ({
  itemType: CurriculumItemType.EXAM,
  contentId,
  label: CurriculumItemLabel.QUIZ,
  ...extra,
});

describe('ClassroomsService', () => {
  it('tạo lớp từ khoá học đang dùng: chép đúng giáo trình tham khảo, số buổi mặc định của khoá', async () => {
    const { classroomsService, curriculumService, logs, createClass } = setup();
    const detail = await createClass();

    expect(detail).toEqual(
      expect.objectContaining({
        code: 'N5-01',
        status: ClassroomStatus.UPCOMING,
        plannedSessions: 24,
        endDate: null,
        sourceCurriculum: { id: 'cur-n5', name: 'Giáo trình N5' },
        course: expect.objectContaining({ code: 'N5' }),
        canManage: true,
        hasActivity: false,
      }),
    );
    const curriculum = await curriculumService.get(ownerCtx, detail.id);
    expect(curriculum.revision).toBe(1);
    expect(
      curriculum.ungrouped.map((item) => [item.content.title, item.note]),
    ).toEqual([['Minna bài 1', 'Buổi đầu']]);
    expect(curriculum.groups).toEqual([
      expect.objectContaining({
        title: 'Chương 1',
        items: [
          expect.objectContaining({
            title: 'Bài 2',
            label: CurriculumItemLabel.HOMEWORK,
          }),
          expect.objectContaining({
            content: expect.objectContaining({ title: 'Kiểm tra chương 1' }),
            passThreshold: 50,
            acceptLate: true,
          }),
        ],
      }),
    ]);
    expect(logs.rows.map((row) => row.action)).toEqual([
      ClassLogAction.CREATED,
      ClassLogAction.TEACHERS_ADDED,
    ]);
    const listed = await classroomsService.getDetail(teacherCtx, detail.id);
    expect(listed.teachers).toEqual([
      { id: 'user-m-teacher', fullName: 'Giáo viên A' },
    ]);
    expect(listed.canManage).toBe(false);
  });

  it('khoá học lưu trữ, giáo trình không gắn khoá học, thiếu số buổi → 400; mã trùng → 409', async () => {
    const { classroomsService, createClass } = setup();
    const base = { code: 'X1', name: 'X', startDate: '2026-10-05' };
    await expect(
      classroomsService.create(ownerCtx, OWNER, {
        ...base,
        courseId: 'course-old',
        plannedSessions: 10,
      } as CreateClassroomDto),
    ).rejects.toThrow('Khoá học đã lưu trữ');
    await expect(
      classroomsService.create(ownerCtx, OWNER, {
        ...base,
        courseId: 'course-n5',
        sourceCurriculumId: 'cur-other',
      } as CreateClassroomDto),
    ).rejects.toBeInstanceOf(BadRequestException);

    await createClass();
    await expect(createClass({ name: 'Trùng mã' })).rejects.toBeInstanceOf(
      ConflictException,
    );

    const errors = await validate(
      plainToInstance(CreateClassroomDto, {
        ...base,
        courseId: randomUUID(),
        code: 'n5 01',
        startDate: '2026-02-30',
      }),
    );
    expect(validationMessages(errors)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Mã lớp chỉ gồm'),
        'Ngày bắt đầu không hợp lệ (YYYY-MM-DD)',
      ]),
    );
    // Mã tự in hoa.
    const lower = plainToInstance(CreateClassroomDto, {
      ...base,
      courseId: randomUUID(),
      code: 'n5-02',
    });
    expect(lower.code).toBe('N5-02');
  });

  it('Teacher ngoài lớp 403; giáo viên của lớp sửa giáo trình lớp; baseRevision cũ 409', async () => {
    const { classroomsService, curriculumService, createClass } = setup();
    const { id } = await createClass();

    await expect(
      classroomsService.getDetail(otherTeacherCtx, id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      curriculumService.get(otherTeacherCtx, id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const current = await curriculumService.get(teacherCtx, id);
    expect(current.canEdit).toBe(true);
    await expect(
      curriculumService.save(
        otherTeacherCtx,
        'user-m-teacher-2',
        id,
        payload(current),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const saved = await curriculumService.save(
      teacherCtx,
      'user-m-teacher',
      id,
      payload(current, (draft) => {
        draft.groups[0].items[1].deadlineAt = '2026-10-20T11:00:00.000Z';
        draft.groups[0].items[1].passThreshold = 70;
        draft.groups.push({
          title: 'Chương 2',
          items: [examItem('exam-final', { label: CurriculumItemLabel.FINAL })],
        });
      }),
    );
    expect(saved.revision).toBe(2);
    expect(saved.groups[0].items[1]).toEqual(
      expect.objectContaining({
        deadlineAt: '2026-10-20T11:00:00.000Z',
        passThreshold: 70,
      }),
    );
    expect(saved.groups[1].items[0].content.title).toBe('Thi cuối khoá');

    // Giữ bản cũ (revision 1) → 409.
    await expect(
      curriculumService.save(ownerCtx, OWNER, id, payload(current)),
    ).rejects.toBeInstanceOf(ConflictException);
    // Owner sửa được lớp không phụ trách.
    await expect(
      curriculumService.save(ownerCtx, OWNER, id, payload(saved)),
    ).resolves.toEqual(expect.objectContaining({ revision: 3 }));
  });

  it('mục mới phải publish, ngày mở trước deadline, nhãn đúng loại', async () => {
    const { curriculumService, createClass } = setup();
    const { id } = await createClass();
    const current = await curriculumService.get(ownerCtx, id);
    const save = (change: Parameters<typeof payload>[1]) =>
      curriculumService.save(ownerCtx, OWNER, id, payload(current, change));

    await expect(
      save((d) => d.ungrouped.push(examItem('exam-draft'))),
    ).rejects.toThrow('đã publish');
    await expect(
      save((d) =>
        d.ungrouped.push(
          examItem('exam-final', {
            opensAt: '2026-10-20T00:00:00.000Z',
            deadlineAt: '2026-10-19T00:00:00.000Z',
          }),
        ),
      ),
    ).rejects.toThrow('Deadline phải sau ngày mở');
    await expect(
      save((d) =>
        d.ungrouped.push(
          examItem('exam-final', { label: CurriculumItemLabel.LESSON }),
        ),
      ),
    ).rejects.toThrow('Nhãn không hợp');
    // Không đổi bài/đề của mục cũ.
    await expect(
      save((d) => (d.ungrouped[0].contentId = 'lesson-2')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('thi lại phải sau mục gốc (đề thi, không phải lần thi lại); trùng đề chỉ khi thi lại', async () => {
    const { curriculumService, createClass, ids } = setup();
    const { id } = await createClass();
    const current = await curriculumService.get(ownerCtx, id);
    const quizItemId = current.groups[0].items[1].id;
    const lessonItemId = current.ungrouped[0].id;
    const save = (change: Parameters<typeof payload>[1]) =>
      curriculumService.save(ownerCtx, OWNER, id, payload(current, change));

    // Cùng đề không gắn "Thi lại cho" → 400; cùng bài học → 400.
    await expect(
      save((d) => d.groups[0].items.push(examItem(ids.quiz))),
    ).rejects.toThrow('lần thi lại');
    await expect(
      save((d) =>
        d.groups[0].items.push({
          itemType: CurriculumItemType.LESSON,
          contentId: ids.lesson1,
          label: CurriculumItemLabel.LESSON,
        }),
      ),
    ).rejects.toThrow('Một bài học chỉ được thêm một lần');
    // Thi lại đứng trước mục gốc → 400.
    await expect(
      save((d) =>
        d.ungrouped.unshift(examItem(ids.quiz, { retakeOfItemId: quizItemId })),
      ),
    ).rejects.toThrow('đứng sau mục gốc');
    // Gắn vào mục bài học / lần thi lại khác → 400; mục bài học làm thi lại → 400.
    await expect(
      save((d) =>
        d.groups[0].items.push(
          examItem(ids.final, { retakeOfItemId: lessonItemId }),
        ),
      ),
    ).rejects.toThrow('mục đề thi gốc');
    const retakeId = randomUUID();
    await expect(
      save((d) =>
        d.groups[0].items.push(
          examItem(ids.final, { id: retakeId, retakeOfItemId: quizItemId }),
          examItem(ids.final, { retakeOfItemId: retakeId }),
        ),
      ),
    ).rejects.toThrow('mục đề thi gốc');
    await expect(
      save((d) =>
        d.groups[0].items.push({
          itemType: CurriculumItemType.LESSON,
          contentId: ids.lesson1,
          label: CurriculumItemLabel.LESSON,
          retakeOfItemId: quizItemId,
        }),
      ),
    ).rejects.toThrow('Chỉ mục đề thi');
    // Gắn vào mục không còn trong giáo trình → 400.
    await expect(
      save((d) =>
        d.groups[0].items.push(
          examItem(ids.final, { retakeOfItemId: randomUUID() }),
        ),
      ),
    ).rejects.toThrow('không còn trong giáo trình');

    // Hợp lệ: 2 lần thi lại cùng đề gốc + 1 lần thi lại đề khác, sang chương khác.
    const saved = await save((d) => {
      d.groups[0].items.push(
        examItem(ids.quiz, { retakeOfItemId: quizItemId }),
      );
      d.groups.push({
        title: 'Thi lại',
        items: [
          examItem(ids.quiz, { retakeOfItemId: quizItemId }),
          examItem(ids.final, { retakeOfItemId: quizItemId }),
        ],
      });
    });
    expect(
      [...saved.groups[0].items, ...saved.groups[1].items]
        .filter((item) => item.retakeOfItemId)
        .map((item) => [item.content.title, item.retakeOfItemId]),
    ).toEqual([
      ['Kiểm tra chương 1', quizItemId],
      ['Kiểm tra chương 1', quizItemId],
      ['Thi cuối khoá', quizItemId],
    ]);
  });

  it('xoá mục: có bài làm → ẩn, chưa có → xoá hẳn; gửi lại mục ẩn → khôi phục; nhật ký ghi thay đổi', async () => {
    const { curriculumService, createClass, items, examAttempts, logs } =
      setup();
    const { id } = await createClass();
    const current = await curriculumService.get(ownerCtx, id);
    const [lessonItem] = current.ungrouped;
    const [homework, quizItem] = current.groups[0].items;
    examAttempts.rows.push({
      id: 'a1',
      classItemId: quizItem.id,
      userId: 'user-m-student-1',
    } as ExamAttempt);
    examAttempts.rows.push({
      id: 'a2',
      classItemId: quizItem.id,
      userId: 'user-m-student-1',
    } as ExamAttempt);

    const saved = await curriculumService.save(
      ownerCtx,
      OWNER,
      id,
      payload(current, (draft) => {
        draft.groups = [];
        draft.ungrouped = [
          { ...toInput(homework), note: 'Làm ở nhà' },
          toInput(lessonItem),
        ];
      }),
    );
    expect(saved.groups).toEqual([]);
    expect(saved.ungrouped.map((item) => item.id)).toEqual([
      homework.id,
      lessonItem.id,
    ]);
    expect(saved.removed).toEqual([
      expect.objectContaining({
        id: quizItem.id,
        learnerCount: 1,
        removedAt: expect.any(String),
      }),
    ]);
    expect(items.rows).toHaveLength(3);
    const log = logs.rows.find(
      (row) => row.action === ClassLogAction.CURRICULUM_SAVED,
    )!;
    expect(log.detail).toEqual({
      hidden: ['Kiểm tra chương 1'],
      changed: [{ title: 'Bài 2', fields: ['note', 'group'] }],
      groupsRemoved: ['Chương 1'],
      reordered: true,
    });

    // Khôi phục mục ẩn; xoá mục bài học chưa có bài làm → xoá hẳn.
    const restored = await curriculumService.save(
      ownerCtx,
      OWNER,
      id,
      payload(saved, (draft) => {
        draft.ungrouped = [draft.ungrouped[0], toInput(saved.removed[0])];
      }),
    );
    expect(restored.ungrouped.map((item) => item.content.title)).toEqual([
      'Minna bài 2',
      'Kiểm tra chương 1',
    ]);
    expect(restored.removed).toEqual([]);
    expect(items.rows.map((row) => row.id).sort()).toEqual(
      [homework.id, quizItem.id].sort(),
    );
    expect(logs.rows.at(-1)!.detail).toEqual(
      expect.objectContaining({
        restored: ['Kiểm tra chương 1'],
        removed: ['Minna bài 1'],
      }),
    );
  });

  it('sĩ số: đủ thì chặn thêm, xoá mềm rồi thêm lại khôi phục; chỉ thành viên đúng role, đang hoạt động', async () => {
    const { membersService, classroomsService, students, createClass } =
      setup();
    const { id } = await createClass({ maxStudents: 2 });

    await expect(
      membersService.addStudents(ownerCtx, OWNER, id, [
        'm-student-1',
        'm-student-2',
        'm-student-3',
      ]),
    ).rejects.toThrow('Lớp chỉ còn 2 chỗ');
    const members = await membersService.addStudents(ownerCtx, OWNER, id, [
      'm-student-1',
      'm-student-2',
    ]);
    expect(members.students.map((row) => row.fullName)).toEqual([
      'Học viên 1',
      'Học viên 2',
    ]);
    await expect(
      membersService.addStudents(ownerCtx, OWNER, id, ['m-student-3']),
    ).rejects.toThrow('Lớp đã đủ sĩ số (2/2)');
    // Thêm lại người đã có: không tính thêm chỗ.
    await expect(
      membersService.addStudents(ownerCtx, OWNER, id, ['m-student-1']),
    ).resolves.toBeDefined();

    await membersService.removeStudent(ownerCtx, OWNER, id, 'm-student-1');
    const row = students.rows.find((r) => r.membershipId === 'm-student-1')!;
    expect(row.removedAt).toBeInstanceOf(Date);
    const afterAdd = await membersService.addStudents(ownerCtx, OWNER, id, [
      'm-student-3',
    ]);
    expect(
      afterAdd.students.map((r) => [r.fullName, r.removedAt === null]),
    ).toEqual([
      ['Học viên 2', true],
      ['Học viên 3', true],
      ['Học viên 1', false],
    ]);
    await expect(
      membersService.addStudents(ownerCtx, OWNER, id, ['m-student-1']),
    ).rejects.toThrow('đủ sĩ số');
    await classroomsService.update(ownerCtx, OWNER, id, { maxStudents: 3 });
    await membersService.addStudents(ownerCtx, OWNER, id, ['m-student-1']);
    expect(students.rows).toHaveLength(3);
    expect(row.id).toBe(
      students.rows.find((r) => r.membershipId === 'm-student-1')!.id,
    );

    await expect(
      membersService.addStudents(ownerCtx, OWNER, id, ['m-parent']),
    ).rejects.toThrow('không có vai trò Học viên');
    await expect(
      membersService.addStudents(ownerCtx, OWNER, id, ['m-inactive']),
    ).rejects.toThrow('đang bị ngừng');
    await expect(
      membersService.addTeachers(ownerCtx, OWNER, id, ['m-student-2']),
    ).rejects.toThrow('không có vai trò Giáo viên');
    await expect(
      membersService.addStudents(ownerCtx, OWNER, id, [randomUUID()]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('học viên đang học lớp khác cùng khoá học hiện cảnh báo', async () => {
    const { membersService, createClass } = setup();
    const first = await createClass();
    const second = await createClass({ code: 'N5-02' });
    await membersService.addStudents(ownerCtx, OWNER, first.id, [
      'm-student-1',
    ]);
    const members = await membersService.addStudents(
      ownerCtx,
      OWNER,
      second.id,
      ['m-student-1', 'm-student-2'],
    );
    expect(
      members.students.map((row) => [
        row.fullName,
        row.otherClasses.map((c) => c.code),
      ]),
    ).toEqual([
      ['Học viên 1', ['N5-01']],
      ['Học viên 2', []],
    ]);
  });

  it('đổi trạng thái: kết thúc chốt lượt thi, khoá giáo trình và thành viên; mở lại được; huỷ là cuối', async () => {
    const {
      classroomsService,
      membersService,
      curriculumService,
      attemptsService,
      logs,
      createClass,
      dataSource,
    } = setup();
    const { id } = await createClass();
    const curriculum = await curriculumService.get(ownerCtx, id);

    await expect(
      classroomsService.changeStatus(
        ownerCtx,
        OWNER,
        id,
        ClassroomStatus.FINISHED,
      ),
    ).rejects.toThrow('Không chuyển được lớp từ "Sắp mở" sang "Đã kết thúc"');
    await classroomsService.changeStatus(
      ownerCtx,
      OWNER,
      id,
      ClassroomStatus.ONGOING,
    );
    const finished = await classroomsService.changeStatus(
      ownerCtx,
      OWNER,
      id,
      ClassroomStatus.FINISHED,
    );
    expect(finished.status).toBe(ClassroomStatus.FINISHED);
    expect(finished.canEditCurriculum).toBe(false);
    expect(attemptsService.finalizeForClassItems).toHaveBeenCalledWith(
      dataSource.manager,
      expect.arrayContaining([
        curriculum.ungrouped[0].id,
        curriculum.groups[0].items[1].id,
      ]),
    );
    expect(logs.rows.at(-1)!.detail).toEqual({
      from: 'ongoing',
      to: 'finished',
      finalizedAttempts: 2,
    });

    await expect(
      curriculumService.save(
        teacherCtx,
        'user-m-teacher',
        id,
        payload(curriculum),
      ),
    ).rejects.toThrow('đã kết thúc hoặc đã huỷ');
    await expect(
      membersService.addStudents(ownerCtx, OWNER, id, ['m-student-1']),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      membersService.removeTeacher(ownerCtx, OWNER, id, 'm-teacher'),
    ).rejects.toBeInstanceOf(ConflictException);
    // Thông tin lớp vẫn sửa được.
    await expect(
      classroomsService.update(ownerCtx, OWNER, id, { location: 'Phòng 2' }),
    ).resolves.toEqual(expect.objectContaining({ location: 'Phòng 2' }));

    // Mở lại → sửa giáo trình được; huỷ → không chuyển đi đâu được nữa.
    await classroomsService.changeStatus(
      ownerCtx,
      OWNER,
      id,
      ClassroomStatus.ONGOING,
    );
    await expect(
      curriculumService.save(
        teacherCtx,
        'user-m-teacher',
        id,
        payload(curriculum),
      ),
    ).resolves.toBeDefined();
    await classroomsService.changeStatus(
      ownerCtx,
      OWNER,
      id,
      ClassroomStatus.CANCELLED,
    );
    expect(attemptsService.finalizeForClassItems).toHaveBeenCalledTimes(2);
    for (const status of [
      ClassroomStatus.UPCOMING,
      ClassroomStatus.ONGOING,
      ClassroomStatus.FINISHED,
    ]) {
      await expect(
        classroomsService.changeStatus(ownerCtx, OWNER, id, status),
      ).rejects.toBeInstanceOf(ConflictException);
    }
  });

  it('xoá lớp chỉ khi chưa có bài làm; khoá học có lớp và bài học trong lớp không xoá được', async () => {
    const {
      classroomsService,
      coursesService,
      curriculumService,
      lessonAttempts,
      classrooms,
      dataSource,
      createClass,
      ids,
    } = setup();
    const first = await createClass();
    const second = await createClass({ code: 'N5-02' });
    const curriculum = await curriculumService.get(ownerCtx, first.id);
    lessonAttempts.rows.push({
      id: 'la-1',
      classItemId: curriculum.ungrouped[0].id,
      userId: 'user-m-student-1',
    } as LessonAttempt);

    const detail = await classroomsService.getDetail(ownerCtx, first.id);
    expect(detail.hasActivity).toBe(true);
    await expect(classroomsService.remove(ownerCtx, first.id)).rejects.toThrow(
      'Lớp đã có bài làm',
    );
    await classroomsService.remove(ownerCtx, second.id);
    expect(classrooms.rows.map((row) => row.id)).toEqual([first.id]);

    await expect(coursesService.remove(ownerCtx, 'course-n5')).rejects.toThrow(
      'Khoá học đã có lớp học',
    );
    await expect(
      assertLessonNotInUse(dataSource.manager, ids.lesson1),
    ).rejects.toThrow('giáo trình');
  });

  it('DTO giáo trình lớp: ngưỡng đậu 0–100, ngày giờ ISO', async () => {
    const errors = await validate(
      plainToInstance(ClassGroupInputDto, {
        title: 'Chương',
        opensAt: '20/10/2026',
        items: [
          examItem(randomUUID(), { passThreshold: 120, deadlineAt: 'x' }),
        ],
      }),
    );
    expect(validationMessages(errors)).toEqual(
      expect.arrayContaining([
        'Ngày mở của chương không hợp lệ',
        'Ngưỡng đậu từ 0 đến 100',
        'Deadline không hợp lệ',
      ]),
    );
  });
});

// ---------------------------------------------------------------------------
// Thời khoá biểu, ngày nghỉ, buổi học (Step 8). Ví dụ bối cảnh T4: T2 + T4,
// 10 buổi, bắt đầu T2 05/01/2026.

const MON_WED: ScheduleSlot[] = [
  { weekday: 1, startTime: '18:00', endTime: '19:30' },
  { weekday: 3, startTime: '18:00', endTime: '19:30' },
];
const scheduleDto = (extra: Partial<SaveClassScheduleDto> = {}) =>
  ({
    startDate: '2026-01-05',
    plannedSessions: 10,
    applyTenantHolidays: true,
    slots: MON_WED,
    ...extra,
  }) as SaveClassScheduleDto;
const regularDates = (view: ClassScheduleView) =>
  view.sessions
    .filter((row) => row.seq !== null)
    .map((row) => trainingDateOf(row.startsAt));
const at = (date: string, time: string) => trainingDateTimeToIso(date, time);

describe('Bài làm chi tiết của học viên (F4)', () => {
  /** Lớp N5 + học viên 1; trả về mục bài học và mục kiểm tra của giáo trình. */
  async function classWithStudent() {
    const harness = setup();
    const {
      classroomsService,
      membersService,
      curriculumService,
      createClass,
    } = harness;
    const { id } = await createClass();
    await membersService.addStudents(ownerCtx, OWNER, id, ['m-student-1']);
    await classroomsService.changeStatus(
      ownerCtx,
      OWNER,
      id,
      ClassroomStatus.ONGOING,
    );
    const curriculum = await curriculumService.get(ownerCtx, id);
    return {
      ...harness,
      id,
      lessonItem: curriculum.ungrouped[0],
      quizItem: curriculum.groups[0].items[1],
    };
  }

  it('liệt kê mục kèm lượt của học viên; lượt đã cho làm lại không tính điểm nhóm', async () => {
    const {
      studentAttemptsService,
      examAttempts,
      examAnswers,
      id,
      quizItem,
      lessonItem,
      lessonAttempts,
    } = await classWithStudent();
    examAttempts.rows.push(
      {
        id: 'a-voided',
        tenantId: TENANT,
        classItemId: quizItem.id,
        userId: 'user-m-student-1',
        status: AttemptStatus.GRADED,
        startedAt: new Date('2026-10-06T01:00:00Z'),
        submittedAt: new Date('2026-10-06T02:00:00Z'),
        autoCorrect: 0,
        autoTotal: 2,
        manualCount: 0,
        manualGradedCount: 0,
        voidedAt: new Date('2026-10-06T03:00:00Z'),
      } as ExamAttempt,
      {
        id: 'a-current',
        tenantId: TENANT,
        classItemId: quizItem.id,
        userId: 'user-m-student-1',
        status: AttemptStatus.GRADED,
        startedAt: new Date('2026-10-07T01:00:00Z'),
        submittedAt: new Date('2026-10-07T02:00:00Z'),
        autoCorrect: 2,
        autoTotal: 2,
        manualCount: 0,
        manualGradedCount: 0,
        voidedAt: null,
      } as ExamAttempt,
    );
    lessonAttempts.rows.push({
      id: 'la-1',
      tenantId: TENANT,
      classItemId: lessonItem.id,
      userId: 'user-m-student-1',
      lessonVersion: 1,
      status: LessonAttemptStatus.COMPLETED,
      startedAt: new Date('2026-10-06T01:00:00Z'),
      submittedAt: new Date('2026-10-06T01:30:00Z'),
      completedAt: new Date('2026-10-06T01:30:00Z'),
      autoCorrect: 1,
      autoTotal: 1,
      manualCount: 0,
      manualGradedCount: 0,
    } as LessonAttempt);
    expect(examAnswers.rows).toEqual([]);

    const view = await studentAttemptsService.listForStudent(
      teacherCtx,
      id,
      'm-student-1',
    );
    expect(view.student.fullName).toBe('Học viên 1');
    expect(view.removed).toBe(false);
    const quiz = view.items.find((item) => item.id === quizItem.id)!;
    // Lượt mới nhất trước; lượt đã "Cho làm lại" vẫn hiện kèm mốc voidedAt.
    expect(
      quiz.attempts.map((row) => [row.id, row.percent, row.voidedAt]),
    ).toEqual([
      ['a-current', 100, null],
      ['a-voided', 0, expect.any(String)],
    ]);
    expect(quiz.attempts[0].passed).toBe(true);
    const lesson = view.items.find((item) => item.id === lessonItem.id)!;
    expect(lesson.lessonAttempt).toEqual(
      expect.objectContaining({ attemptId: 'la-1', canReview: true }),
    );
  });

  it('giáo viên ngoài lớp 403; học viên không thuộc lớp 404', async () => {
    const { studentAttemptsService, id } = await classWithStudent();
    await expect(
      studentAttemptsService.listForStudent(otherTeacherCtx, id, 'm-student-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      studentAttemptsService.listForStudent(ownerCtx, id, 'm-student-2'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('học viên đã rời lớp vẫn xem được bài làm cũ', async () => {
    const { studentAttemptsService, membersService, id } =
      await classWithStudent();
    await membersService.removeStudent(ownerCtx, OWNER, id, 'm-student-1');
    const view = await studentAttemptsService.listForStudent(
      ownerCtx,
      id,
      'm-student-1',
    );
    expect(view.removed).toBe(true);
  });

  it('xem lại bài làm: lượt của lớp khác hoặc của học viên khác → 404', async () => {
    const { studentAttemptsService, examAttempts, id, quizItem } =
      await classWithStudent();
    examAttempts.rows.push({
      id: 'a-other',
      tenantId: TENANT,
      classItemId: quizItem.id,
      userId: 'user-m-student-2',
      status: AttemptStatus.SUBMITTED,
      startedAt: new Date(),
      submittedAt: new Date(),
      autoCorrect: 0,
      autoTotal: 0,
      manualCount: 0,
      manualGradedCount: 0,
      voidedAt: null,
    } as ExamAttempt);
    await expect(
      studentAttemptsService.examReview(ownerCtx, id, 'm-student-1', 'a-other'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('Thời khoá biểu & buổi học', () => {
  beforeEach(() => fakeDate('2026-01-01T09:00:00+07:00'));
  afterEach(() => jest.useRealTimers());

  async function scheduledClass(
    context: ReturnType<typeof setup>,
    extra: Partial<CreateClassroomDto> = {},
  ) {
    const { id } = await context.createClass({
      startDate: '2026-01-05',
      plannedSessions: 10,
      ...extra,
    });
    const view = await context.scheduleService.save(
      ownerCtx,
      OWNER,
      id,
      scheduleDto(),
    );
    return { id, view };
  }

  it('lưu lịch lặp sinh buổi theo ô, ngày kết thúc tự tính; xem trước không ghi', async () => {
    const context = setup();
    const { id } = await context.createClass({
      startDate: '2026-01-05',
      plannedSessions: 10,
    });
    const preview = await context.scheduleService.preview(
      ownerCtx,
      id,
      scheduleDto(),
    );
    expect(preview).toEqual(
      expect.objectContaining({ created: 10, endDate: '2026-02-04' }),
    );
    expect(context.sessions.rows).toHaveLength(0);

    const view = await context.scheduleService.save(
      ownerCtx,
      OWNER,
      id,
      scheduleDto(),
    );
    expect(regularDates(view)).toEqual([
      '2026-01-05',
      '2026-01-07',
      '2026-01-12',
      '2026-01-14',
      '2026-01-19',
      '2026-01-21',
      '2026-01-26',
      '2026-01-28',
      '2026-02-02',
      '2026-02-04',
    ]);
    expect(view.endDate).toBe('2026-02-04');
    expect(view.sessions[0]).toEqual(
      expect.objectContaining({
        seq: 1,
        startsAt: at('2026-01-05', '18:00'),
        teachers: [expect.objectContaining({ fullName: 'Giáo viên A' })],
      }),
    );
    expect(
      (await context.classroomsService.getDetail(ownerCtx, id)).endDate,
    ).toBe('2026-02-04');
    expect(context.logs.rows.at(-1)).toEqual(
      expect.objectContaining({
        action: ClassLogAction.SCHEDULE_SAVED,
        detail: expect.objectContaining({
          createdSessions: 10,
          endDate: '2026-02-04',
        }),
      }),
    );

    // Giáo viên của lớp xem được; ô chồng giờ → 400.
    expect((await context.scheduleService.get(teacherCtx, id)).canManage).toBe(
      false,
    );
    await expect(
      context.scheduleService.save(
        ownerCtx,
        OWNER,
        id,
        scheduleDto({
          slots: [
            ...MON_WED,
            { weekday: 1, startTime: '19:00', endTime: '20:00' },
          ],
        }),
      ),
    ).rejects.toThrow('chồng giờ');
  });

  it('ngày nghỉ T4 07/01: buổi 2…10 dời, kết thúc 09/02; xoá ngày nghỉ → về như cũ; lớp tắt ngày nghỉ không đổi', async () => {
    const context = setup();
    const { id, view } = await scheduledClass(context);
    const other = await scheduledClass(context, { code: 'N5-02' });
    await context.scheduleService.save(
      ownerCtx,
      OWNER,
      other.id,
      scheduleDto({ applyTenantHolidays: false }),
    );
    const before = view.sessions.map((row) => row.id);

    const impact = await context.settingsService.impact(ownerCtx, {
      startDate: '2026-01-07',
      endDate: '2026-01-07',
    });
    expect(impact.classes).toEqual([
      expect.objectContaining({
        classroom: expect.objectContaining({ id }),
        moved: 9,
        previousEndDate: '2026-02-04',
        endDate: '2026-02-09',
      }),
    ]);

    const settings = await context.settingsService.createHoliday(
      ownerCtx,
      OWNER,
      { name: 'Nghỉ bù', startDate: '2026-01-07', endDate: '2026-01-07' },
    );
    const moved = await context.scheduleService.get(ownerCtx, id);
    expect(regularDates(moved)).toEqual([
      '2026-01-05',
      '2026-01-12',
      '2026-01-14',
      '2026-01-19',
      '2026-01-21',
      '2026-01-26',
      '2026-01-28',
      '2026-02-02',
      '2026-02-04',
      '2026-02-09',
    ]);
    expect(moved.endDate).toBe('2026-02-09');
    // Buổi giữ id (nội dung map, giáo viên đi theo buổi).
    expect(moved.sessions.map((row) => row.id)).toEqual(before);
    expect(moved.holidays).toEqual([
      expect.objectContaining({ name: 'Nghỉ bù' }),
    ]);
    expect(context.logs.rows.at(-1)).toEqual(
      expect.objectContaining({
        classroomId: id,
        action: ClassLogAction.SCHEDULE_RECOMPUTED,
        detail: expect.objectContaining({
          holiday: 'Nghỉ bù',
          holidayAction: 'created',
          moved: 9,
          endDate: '2026-02-09',
        }),
      }),
    );
    expect(
      regularDates(await context.scheduleService.get(ownerCtx, other.id))[1],
    ).toBe('2026-01-07');

    await context.settingsService.removeHoliday(
      ownerCtx,
      OWNER,
      settings.holidays[0].id,
    );
    const back = await context.scheduleService.get(ownerCtx, id);
    expect(regularDates(back)).toEqual(regularDates(view));
    expect(back.endDate).toBe('2026-02-04');
  });

  it('buổi đã diễn ra giữ nguyên; không giảm số buổi dưới số đã học; giảm thì xoá buổi cuối kèm map', async () => {
    const context = setup();
    const { id } = await scheduledClass(context);
    const curriculum = await context.curriculumService.get(ownerCtx, id);
    const last = (await context.scheduleService.get(ownerCtx, id)).sessions[9];
    await context.sessionsService.saveLinks(ownerCtx, OWNER, id, last.id, {
      groupIds: [],
      itemIds: [curriculum.ungrouped[0].id],
    });

    fakeDate('2026-01-13T09:00:00+07:00');
    await expect(
      context.scheduleService.save(
        ownerCtx,
        OWNER,
        id,
        scheduleDto({ plannedSessions: 2 }),
      ),
    ).rejects.toThrow('Lớp đã học 3 buổi');
    const preview = await context.scheduleService.preview(
      ownerCtx,
      id,
      scheduleDto({ plannedSessions: 8 }),
    );
    expect(preview.removed).toEqual([
      expect.objectContaining({ seq: 9, linkCount: 0 }),
      expect.objectContaining({ seq: 10, linkCount: 1 }),
    ]);
    await context.settingsService.createHoliday(ownerCtx, OWNER, {
      name: 'Nghỉ',
      startDate: '2026-01-07',
      endDate: '2026-01-14',
    });
    const view = await context.scheduleService.get(ownerCtx, id);
    expect(view.heldCount).toBe(3);
    // Buổi 1–3 đã qua giữ ngày cũ (kể cả 07/01 nằm trong ngày nghỉ).
    expect(regularDates(view).slice(0, 4)).toEqual([
      '2026-01-05',
      '2026-01-07',
      '2026-01-12',
      '2026-01-19',
    ]);

    await context.scheduleService.save(
      ownerCtx,
      OWNER,
      id,
      scheduleDto({ plannedSessions: 8 }),
    );
    expect(
      regularDates(await context.scheduleService.get(ownerCtx, id)),
    ).toHaveLength(8);
    expect(context.sessionLinks.rows).toHaveLength(0);
  });

  it('huỷ buổi giữ số, không dời buổi sau, khôi phục được; buổi đã qua không huỷ được', async () => {
    const context = setup();
    const { id, view } = await scheduledClass(context);
    const fifth = view.sessions[4];
    const cancelled = await context.sessionsService.cancel(
      teacherCtx,
      'user-m-teacher',
      id,
      fifth.id,
      'Giáo viên ốm',
    );
    expect(cancelled).toEqual(
      expect.objectContaining({
        seq: 5,
        status: ClassSessionStatus.CANCELLED,
        cancelReason: 'Giáo viên ốm',
      }),
    );
    expect(
      regularDates(await context.scheduleService.get(ownerCtx, id)),
    ).toEqual(regularDates(view));
    // Ngày nghỉ vẫn dời buổi đã huỷ như buổi thường (V1).
    await context.settingsService.createHoliday(ownerCtx, OWNER, {
      name: 'Nghỉ',
      startDate: '2026-01-19',
      endDate: '2026-01-19',
    });
    const after = await context.scheduleService.get(ownerCtx, id);
    expect(after.sessions[4]).toEqual(
      expect.objectContaining({
        seq: 5,
        status: ClassSessionStatus.CANCELLED,
        startsAt: at('2026-01-21', '18:00'),
      }),
    );
    await expect(
      context.sessionsService.cancel(otherTeacherCtx, 'x', id, fifth.id, null),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const restored = await context.sessionsService.restore(
      ownerCtx,
      OWNER,
      id,
      fifth.id,
    );
    expect(restored.status).toBe(ClassSessionStatus.SCHEDULED);

    fakeDate('2026-01-06T09:00:00+07:00');
    await expect(
      context.sessionsService.cancel(
        ownerCtx,
        OWNER,
        id,
        view.sessions[0].id,
        null,
      ),
    ).rejects.toThrow('đã diễn ra');
    // Buổi đã qua: ghi chú vẫn sửa được, giờ thì không.
    await context.sessionsService.update(
      ownerCtx,
      OWNER,
      id,
      view.sessions[0].id,
      {
        note: 'Đã học bài 1',
      },
    );
    await expect(
      context.sessionsService.update(ownerCtx, OWNER, id, view.sessions[0].id, {
        startsAt: at('2026-01-05', '17:00'),
        endsAt: at('2026-01-05', '18:30'),
      }),
    ).rejects.toThrow('đã diễn ra');
  });

  it('buổi bù: ngày cố định, "Bù cho Buổi N", không dời theo ngày nghỉ, xoá được khi chưa diễn ra', async () => {
    const context = setup();
    const { id, view } = await scheduledClass(context);
    const makeup = await context.sessionsService.createMakeup(
      teacherCtx,
      'user-m-teacher',
      id,
      {
        startsAt: at('2026-01-24', '09:00'),
        endsAt: at('2026-01-24', '10:30'),
        makeupForSessionId: view.sessions[4].id,
      },
    );
    expect(makeup).toEqual(
      expect.objectContaining({
        kind: ClassSessionKind.MAKEUP,
        seq: null,
        makeupFor: { id: view.sessions[4].id, seq: 5 },
      }),
    );
    await context.settingsService.createHoliday(ownerCtx, OWNER, {
      name: 'Nghỉ',
      startDate: '2026-01-19',
      endDate: '2026-01-24',
    });
    const after = await context.scheduleService.get(ownerCtx, id);
    const kept = after.sessions.find((row) => row.id === makeup.id)!;
    expect(kept.startsAt).toBe(at('2026-01-24', '09:00'));
    // Buổi bù xen theo thời gian giữa các buổi thường.
    expect(after.sessions.map((row) => row.seq)).toEqual([
      1,
      2,
      3,
      4,
      null,
      5,
      6,
      7,
      8,
      9,
      10,
    ]);

    await expect(
      context.sessionsService.removeMakeup(
        ownerCtx,
        OWNER,
        id,
        view.sessions[1].id,
      ),
    ).rejects.toThrow('Chỉ xoá được buổi bù');
    await context.sessionsService.removeMakeup(ownerCtx, OWNER, id, makeup.id);
    expect(context.sessions.rows).toHaveLength(10);
    await expect(
      context.sessionsService.createMakeup(ownerCtx, OWNER, id, {
        startsAt: at('2025-12-30', '09:00'),
        endsAt: at('2025-12-30', '10:00'),
      }),
    ).rejects.toThrow('sau thời điểm hiện tại');
  });

  it('dạy thế: giáo viên buổi riêng, dời buổi bật cảnh báo, "Đã kiểm tra" tắt; giáo viên dạy thế chỉ xem buổi của mình', async () => {
    const context = setup();
    const { id, view } = await scheduledClass(context);
    const third = view.sessions[2];
    await expect(
      context.sessionsService.detail(otherTeacherCtx, third.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      context.sessionsService.update(
        teacherCtx,
        'user-m-teacher',
        id,
        third.id,
        {
          teacherMembershipIds: ['m-student-1'],
        },
      ),
    ).rejects.toThrow('không có vai trò Giáo viên');
    const updated = await context.sessionsService.update(
      teacherCtx,
      'user-m-teacher',
      id,
      third.id,
      {
        teacherMembershipIds: ['m-teacher-2'],
        startsAt: at('2026-01-12', '17:00'),
        endsAt: at('2026-01-12', '18:30'),
      },
    );
    expect(updated).toEqual(
      expect.objectContaining({
        customTeachers: true,
        timeOverridden: true,
        teachers: [expect.objectContaining({ fullName: 'Giáo viên B' })],
      }),
    );
    await expect(
      context.sessionsService.update(ownerCtx, OWNER, id, third.id, {
        startsAt: at('2026-01-13', '17:00'),
        endsAt: at('2026-01-13', '18:30'),
      }),
    ).rejects.toThrow('cùng ngày');

    const detail = await context.sessionsService.detail(
      otherTeacherCtx,
      third.id,
    );
    expect(detail).toEqual(
      expect.objectContaining({
        canOpenClass: false,
        canEdit: false,
        classTeachers: [expect.objectContaining({ fullName: 'Giáo viên A' })],
      }),
    );

    await context.settingsService.createHoliday(ownerCtx, OWNER, {
      name: 'Nghỉ',
      startDate: '2026-01-07',
      endDate: '2026-01-07',
    });
    const movedView = await context.scheduleService.get(ownerCtx, id);
    const moved = movedView.sessions.find((row) => row.id === third.id)!;
    expect(moved).toEqual(
      expect.objectContaining({
        startsAt: at('2026-01-14', '18:00'),
        timeOverridden: false,
        movedWarning: true,
        customTeachers: true,
      }),
    );
    const dismissed = await context.sessionsService.update(
      ownerCtx,
      OWNER,
      id,
      third.id,
      { dismissMovedWarning: true },
    );
    expect(dismissed.movedWarning).toBe(false);

    // Về giáo viên của lớp.
    const reset = await context.sessionsService.update(
      ownerCtx,
      OWNER,
      id,
      third.id,
      {
        teacherMembershipIds: null,
      },
    );
    expect(reset.customTeachers).toBe(false);
    expect(reset.teachers.map((row) => row.fullName)).toEqual(['Giáo viên A']);
  });

  it('map nội dung: chương/mục của lớp; mục bị ẩn khỏi giáo trình thì bỏ map', async () => {
    const context = setup();
    const { id, view } = await scheduledClass(context);
    const curriculum = await context.curriculumService.get(ownerCtx, id);
    const lessonItem = curriculum.ungrouped[0];
    const linked = await context.sessionsService.saveLinks(
      teacherCtx,
      'user-m-teacher',
      id,
      view.sessions[0].id,
      { groupIds: [curriculum.groups[0].id], itemIds: [lessonItem.id] },
    );
    expect(linked.links.map((row) => row.title)).toEqual([
      'Chương 1',
      'Minna bài 1',
    ]);
    await expect(
      context.sessionsService.saveLinks(
        ownerCtx,
        OWNER,
        id,
        view.sessions[0].id,
        {
          groupIds: [],
          itemIds: ['00000000-0000-4000-8000-000000000000'],
        },
      ),
    ).rejects.toThrow('không thuộc giáo trình lớp');

    // Mục có bài làm → bị ẩn khi bỏ khỏi giáo trình → mất map.
    context.lessonAttempts.rows.push({
      id: 'la-1',
      classItemId: lessonItem.id,
      userId: 'user-m-student-1',
    } as LessonAttempt);
    await context.curriculumService.save(
      ownerCtx,
      OWNER,
      id,
      payload(curriculum, (draft) => {
        draft.ungrouped = [];
      }),
    );
    const after = await context.scheduleService.get(ownerCtx, id);
    expect(after.sessions[0].links.map((row) => row.title)).toEqual([
      'Chương 1',
    ]);
  });

  it('trùng lịch: học viên/giáo viên có buổi chồng giờ ở lớp khác (cảnh báo, không chặn)', async () => {
    const context = setup();
    const first = await scheduledClass(context);
    await context.membersService.addStudents(ownerCtx, OWNER, first.id, [
      'm-student-1',
    ]);
    const { id } = await context.createClass({
      code: 'N5-02',
      startDate: '2026-01-05',
      plannedSessions: 4,
    });
    await context.scheduleService.save(
      ownerCtx,
      OWNER,
      id,
      scheduleDto({
        plannedSessions: 4,
        slots: [{ weekday: 1, startTime: '19:00', endTime: '20:00' }],
      }),
    );
    const conflicts = await context.scheduleService.memberConflicts(
      ownerCtx,
      id,
      ['m-student-1', 'm-student-2'],
    );
    expect(conflicts).toEqual([
      expect.objectContaining({
        membershipId: 'm-student-1',
        sessions: expect.arrayContaining([
          expect.objectContaining({
            seq: 1,
            conflicts: [
              expect.objectContaining({
                classroom: expect.objectContaining({ code: 'N5-01' }),
                seq: 1,
                people: ['Học viên 1'],
              }),
            ],
          }),
        ]),
      }),
    ]);
    // Thêm vẫn được; lịch 2 lớp hiện trùng (giáo viên A dạy cả hai lớp).
    await context.membersService.addStudents(ownerCtx, OWNER, id, [
      'm-student-1',
    ]);
    const view = await context.scheduleService.get(ownerCtx, id);
    expect(view.sessions[0].conflicts[0].people).toEqual([
      'Giáo viên A',
      'Học viên 1',
    ]);
    // Buổi huỷ không tính trùng.
    await context.sessionsService.cancel(
      ownerCtx,
      OWNER,
      id,
      view.sessions[0].id,
      null,
    );
    expect(
      (await context.scheduleService.get(ownerCtx, id)).sessions[0].conflicts,
    ).toEqual([]);
  });

  it('lớp đã kết thúc không dời lịch và khoá thao tác buổi; mở lại thì tính lại', async () => {
    const context = setup();
    const { id, view } = await scheduledClass(context);
    await context.classroomsService.changeStatus(
      ownerCtx,
      OWNER,
      id,
      ClassroomStatus.ONGOING,
    );
    await context.classroomsService.changeStatus(
      ownerCtx,
      OWNER,
      id,
      ClassroomStatus.FINISHED,
    );
    await context.settingsService.createHoliday(ownerCtx, OWNER, {
      name: 'Nghỉ',
      startDate: '2026-01-07',
      endDate: '2026-01-07',
    });
    const closed = await context.scheduleService.get(ownerCtx, id);
    expect(regularDates(closed)).toEqual(regularDates(view));
    expect(closed.canEditSessions).toBe(false);
    await expect(
      context.sessionsService.cancel(
        ownerCtx,
        OWNER,
        id,
        view.sessions[4].id,
        null,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      context.scheduleService.save(ownerCtx, OWNER, id, scheduleDto()),
    ).rejects.toBeInstanceOf(ConflictException);

    await context.classroomsService.changeStatus(
      ownerCtx,
      OWNER,
      id,
      ClassroomStatus.ONGOING,
    );
    const reopened = await context.scheduleService.get(ownerCtx, id);
    expect(reopened.endDate).toBe('2026-02-09');
  });

  it('cài đặt: tham số chuyên cần, ngày nghỉ sai khoảng → 400', async () => {
    const { settingsService } = setup();
    const settings = await settingsService.update(ownerCtx, {
      lateWeight: 0.3,
      warningThreshold: 80,
    });
    expect(settings).toEqual({
      lateWeight: 0.3,
      warningThreshold: 80,
      holidays: [],
    });
    await expect(
      settingsService.createHoliday(ownerCtx, OWNER, {
        name: 'Sai',
        startDate: '2026-02-10',
        endDate: '2026-02-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const invalid = plainToInstance(UpdateTenantSettingsDto, {
      lateWeight: 1.5,
      warningThreshold: 70.5,
    });
    expect(validationMessages(await validate(invalid))).toEqual([
      'Hệ số nộp muộn là số từ 0 đến 1',
      'Ngưỡng cảnh báo phải là số nguyên',
    ]);
  });
});

describe('Chuyên cần, bảng điểm, nhận xét cuối khoá (Step 11)', () => {
  const NOW = '2026-09-20T10:00:00+07:00';
  const DEADLINE = '2026-09-10T17:00:00.000Z';
  beforeEach(() => fakeDate(NOW));
  afterEach(() => jest.useRealTimers());

  /**
   * Lớp N5 đang học với 3 học viên; mục "Kiểm tra chương 1" có deadline
   * 10/09 và một mục "Thi lại" cùng đề đứng sau.
   */
  async function classWithAttempts() {
    const harness = setup();
    const {
      classroomsService,
      membersService,
      curriculumService,
      createClass,
    } = harness;
    const { id } = await createClass();
    await membersService.addStudents(ownerCtx, OWNER, id, [
      'm-student-1',
      'm-student-2',
      'm-student-3',
    ]);
    await classroomsService.changeStatus(
      ownerCtx,
      OWNER,
      id,
      ClassroomStatus.ONGOING,
    );
    const before = await curriculumService.get(ownerCtx, id);
    const quizId = before.groups[0].items[1].id;
    const saved = await curriculumService.save(
      ownerCtx,
      OWNER,
      id,
      payload(before, (draft) => {
        draft.groups[0].items[1] = {
          ...draft.groups[0].items[1],
          deadlineAt: DEADLINE,
          passThreshold: 50,
        };
        draft.groups[0].items.push(
          examItem(harness.ids.quiz, {
            title: 'Thi lại chương 1',
            deadlineAt: DEADLINE,
            passThreshold: 50,
            retakeOfItemId: quizId,
          }),
        );
      }),
    );
    const group = saved.groups[0];
    return {
      ...harness,
      id,
      lessonItem: saved.ungrouped[0],
      homeworkItem: group.items[0],
      quizItem: group.items[1],
      retakeItem: group.items[2],
    };
  }

  const attempt = (
    over: Partial<ExamAttempt> & Pick<ExamAttempt, 'id' | 'classItemId'>,
  ) =>
    ({
      tenantId: TENANT,
      status: AttemptStatus.GRADED,
      submittedAt: new Date('2026-09-11T00:00:00Z'),
      autoCorrect: 2,
      autoTotal: 2,
      manualCount: 0,
      manualGradedCount: 0,
      voidedAt: null,
      ...over,
    }) as ExamAttempt;

  it('đúng hạn 1, muộn k, quá hạn 0; lần thi lại không bắt buộc không tính', async () => {
    const { progressService, examAttempts, id, quizItem, retakeItem } =
      await classWithAttempts();
    examAttempts.rows.push(
      // Học viên 1 vào thi trước hạn, đạt 100% → thi lại không bắt buộc.
      attempt({
        id: 'a1',
        classItemId: quizItem.id,
        userId: 'user-m-student-1',
        startedAt: new Date('2026-09-10T16:00:00Z'),
      }),
      attempt({
        id: 'a1-retake',
        classItemId: retakeItem.id,
        userId: 'user-m-student-1',
        startedAt: new Date('2026-09-12T01:00:00Z'),
        autoCorrect: 1,
      }),
      // Học viên 2 vào thi sau hạn và trượt → muộn, thi lại vẫn bắt buộc.
      attempt({
        id: 'a2',
        classItemId: quizItem.id,
        userId: 'user-m-student-2',
        startedAt: new Date('2026-09-10T17:30:00Z'),
        autoCorrect: 0,
      }),
    );

    const view = await progressService.attendance(teacherCtx, id);
    expect(view.params).toEqual(
      expect.objectContaining({
        lateWeight: 0.5,
        warningThreshold: 70,
        classLateWeight: null,
        classWarningThreshold: null,
      }),
    );
    // Chỉ mục đề thi có deadline thành cột; mục bài học không tính (R11.5).
    expect(view.columns.map((column) => column.itemId)).toEqual([
      quizItem.id,
      retakeItem.id,
    ]);
    expect(view.columns[1].attemptIndex).toBe(2);
    const rowOf = (name: string) =>
      view.rows.find((row) => row.student.fullName === name)!;

    expect(rowOf('Học viên 1').cells.map((cell) => cell.mark)).toEqual([
      AttendanceMark.ON_TIME,
      AttendanceMark.EXCLUDED,
    ]);
    expect(rowOf('Học viên 1').rate).toEqual(
      expect.objectContaining({ counted: 1, score: 1, percent: 100 }),
    );
    expect(rowOf('Học viên 1').belowThreshold).toBe(false);

    expect(rowOf('Học viên 2').cells.map((cell) => cell.mark)).toEqual([
      AttendanceMark.LATE,
      AttendanceMark.MISSED,
    ]);
    expect(rowOf('Học viên 2').rate).toEqual(
      expect.objectContaining({ counted: 2, score: 0.5, percent: 25 }),
    );
    expect(rowOf('Học viên 2').belowThreshold).toBe(true);

    expect(rowOf('Học viên 3').rate).toEqual(
      expect.objectContaining({ counted: 2, score: 0, percent: 0 }),
    );
  });

  it('lượt đã "Cho làm lại" và lượt đang làm dở không tính là đã nộp', async () => {
    const { progressService, examAttempts, id, quizItem, retakeItem } =
      await classWithAttempts();
    examAttempts.rows.push(
      attempt({
        id: 'a-voided',
        classItemId: quizItem.id,
        userId: 'user-m-student-1',
        startedAt: new Date('2026-09-09T01:00:00Z'),
        voidedAt: new Date('2026-09-09T02:00:00Z'),
      }),
      attempt({
        id: 'a-open',
        classItemId: retakeItem.id,
        userId: 'user-m-student-1',
        status: AttemptStatus.IN_PROGRESS,
        submittedAt: null,
        startedAt: new Date('2026-09-09T03:00:00Z'),
      }),
    );
    const view = await progressService.attendance(ownerCtx, id);
    const row = view.rows.find(
      (item) => item.student.membershipId === 'm-student-1',
    )!;
    expect(row.cells.map((cell) => cell.mark)).toEqual([
      AttendanceMark.MISSED,
      AttendanceMark.IN_PROGRESS,
    ]);
    expect(row.rate).toEqual(
      expect.objectContaining({ counted: 1, percent: 0 }),
    );
  });

  it('mục bỏ khỏi giáo trình lớp không còn là cột chuyên cần', async () => {
    const { progressService, curriculumService, id, retakeItem } =
      await classWithAttempts();
    const current = await curriculumService.get(ownerCtx, id);
    await curriculumService.save(
      ownerCtx,
      OWNER,
      id,
      payload(current, (draft) => {
        draft.groups[0].items = draft.groups[0].items.filter(
          (item) => item.id !== retakeItem.id,
        );
      }),
    );
    const view = await progressService.attendance(ownerCtx, id);
    expect(view.columns).toHaveLength(1);
  });

  it('tham số của lớp ghi đè trung tâm', async () => {
    const { progressService, classroomsService, examAttempts, id, quizItem } =
      await classWithAttempts();
    examAttempts.rows.push(
      attempt({
        id: 'a2',
        classItemId: quizItem.id,
        userId: 'user-m-student-2',
        startedAt: new Date('2026-09-10T17:30:00Z'),
        autoCorrect: 0,
      }),
    );
    await classroomsService.update(ownerCtx, OWNER, id, {
      lateWeight: 0.2,
      warningThreshold: 90,
    });
    const view = await progressService.attendance(ownerCtx, id);
    expect(view.params).toEqual(
      expect.objectContaining({
        lateWeight: 0.2,
        warningThreshold: 90,
        classLateWeight: 0.2,
        tenantLateWeight: 0.5,
      }),
    );
    const row = view.rows.find(
      (item) => item.student.membershipId === 'm-student-2',
    )!;
    // Muộn 1 + chưa nộp 1 → 0.2 / 2 = 10%.
    expect(row.rate.percent).toBe(10);
    expect(row.belowThreshold).toBe(true);
  });

  it('bảng điểm: nhóm thi gộp 1 cột lấy điểm cao nhất, bài học tính % câu tự chấm', async () => {
    const {
      progressService,
      examAttempts,
      lessonAttempts,
      id,
      lessonItem,
      quizItem,
      retakeItem,
    } = await classWithAttempts();
    examAttempts.rows.push(
      attempt({
        id: 'a2',
        classItemId: quizItem.id,
        userId: 'user-m-student-2',
        startedAt: new Date('2026-09-10T16:00:00Z'),
        autoCorrect: 0,
      }),
      attempt({
        id: 'a2-retake',
        classItemId: retakeItem.id,
        userId: 'user-m-student-2',
        startedAt: new Date('2026-09-12T01:00:00Z'),
        autoCorrect: 1,
      }),
      attempt({
        id: 'a3',
        classItemId: quizItem.id,
        userId: 'user-m-student-3',
        status: AttemptStatus.SUBMITTED,
        startedAt: new Date('2026-09-10T16:00:00Z'),
        manualCount: 1,
      }),
    );
    lessonAttempts.rows.push({
      id: 'la-1',
      tenantId: TENANT,
      classItemId: lessonItem.id,
      userId: 'user-m-student-2',
      lessonVersion: 1,
      status: LessonAttemptStatus.COMPLETED,
      startedAt: new Date('2026-09-05T01:00:00Z'),
      submittedAt: new Date('2026-09-05T01:30:00Z'),
      completedAt: new Date('2026-09-05T01:30:00Z'),
      autoCorrect: 3,
      autoTotal: 4,
      manualCount: 1,
      manualGradedCount: 0,
    } as LessonAttempt);

    const view = await progressService.gradebook(teacherCtx, id);
    // Cột: 2 mục bài học + 1 nhóm thi (mục gốc + thi lại gộp).
    expect(
      view.columns.map((column) => [column.kind, column.itemIds.length]),
    ).toEqual([
      ['lesson', 1],
      ['lesson', 1],
      ['exam', 2],
    ]);
    expect(view.groups.map((group) => group.title)).toEqual([
      'Chưa xếp chương',
      'Chương 1',
    ]);
    const row = view.rows.find(
      (item) => item.student.membershipId === 'm-student-2',
    )!;
    const [lesson, , exam] = row.cells;
    expect(lesson).toEqual(
      expect.objectContaining({ percent: 75, completed: true, started: true }),
    );
    expect(exam).toEqual(
      expect.objectContaining({ percent: 50, passed: true, hasPending: false }),
    );
    expect(row.groupAverages).toEqual([
      { groupId: view.columns[2].groupId, percent: 50 },
    ]);
    // Lượt còn câu chấm tay chưa chấm: chưa có điểm, đánh dấu chờ chấm.
    const pending = view.rows.find(
      (item) => item.student.membershipId === 'm-student-3',
    )!;
    expect(pending.cells[2]).toEqual(
      expect.objectContaining({ percent: null, hasPending: true }),
    );
  });

  it('nhận xét cuối khoá: giáo viên của lớp viết, xoá được, lớp chưa học thì 409', async () => {
    const { progressService, classroomsService, id, logs } =
      await classWithAttempts();
    const saved = await progressService.saveComment(
      teacherCtx,
      'user-m-teacher',
      id,
      'm-student-1',
      '  Tiến bộ tốt  ',
    );
    expect(saved).toEqual(expect.objectContaining({ text: 'Tiến bộ tốt' }));
    const view = await progressService.gradebook(ownerCtx, id);
    expect(view.canComment).toBe(true);
    expect(
      view.rows.find((row) => row.student.membershipId === 'm-student-1')!
        .comment,
    ).toEqual(
      expect.objectContaining({
        text: 'Tiến bộ tốt',
        author: { id: 'user-m-teacher', fullName: 'Giáo viên A' },
      }),
    );
    expect(
      logs.rows.filter(
        (row) => row.action === ClassLogAction.FINAL_COMMENT_SAVED,
      ),
    ).toHaveLength(1);

    // Chuỗi rỗng = xoá nhận xét.
    expect(
      await progressService.saveComment(
        ownerCtx,
        OWNER,
        id,
        'm-student-1',
        '   ',
      ),
    ).toBeNull();

    await classroomsService.changeStatus(
      ownerCtx,
      OWNER,
      id,
      ClassroomStatus.UPCOMING,
    );
    await expect(
      progressService.saveComment(ownerCtx, OWNER, id, 'm-student-1', 'Ghi'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('giáo viên ngoài lớp không xem/không viết được; học viên không thuộc lớp 404', async () => {
    const { progressService, id } = await classWithAttempts();
    await expect(
      progressService.attendance(otherTeacherCtx, id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      progressService.gradebook(otherTeacherCtx, id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      progressService.saveComment(ownerCtx, OWNER, id, 'm-student-4', 'Ghi'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('học viên đã rời lớp xuống cuối bảng; thành viên bị ngừng vẫn tính (giả định 16)', async () => {
    const { progressService, membersService, memberships, id } =
      await classWithAttempts();
    await membersService.removeStudent(ownerCtx, OWNER, id, 'm-student-1');
    // Ngừng thành viên sau khi đã vào lớp (lúc thêm phải đang hoạt động).
    memberships.rows.find((row) => row.id === 'm-student-3')!.status =
      MembershipStatus.INACTIVE;
    const view = await progressService.attendance(ownerCtx, id);
    expect(
      view.rows.map((row) => [row.student.fullName, row.student.removed]),
    ).toEqual([
      ['Học viên 2', false],
      ['Học viên 3', false],
      ['Học viên 1', true],
    ]);
    const inactive = view.rows.find(
      (row) => row.student.membershipId === 'm-student-3',
    )!;
    expect(inactive.student.inactive).toBe(true);
    // Vẫn tính chuyên cần: 2 mục quá hạn chưa nộp.
    expect(inactive.rate).toEqual(
      expect.objectContaining({ counted: 2, percent: 0 }),
    );
  });

  it('nhận xét cuối khoá: báo khi lớp kết thúc, sửa sau đó báo lại', async () => {
    const { notifications, classroomsService, progressService, id } =
      await classWithAttempts();
    await progressService.saveComment(
      ownerCtx,
      OWNER,
      id,
      'm-student-1',
      'Tiến bộ tốt',
    );
    expect(
      notifications.ofType(NotificationType.FINAL_COMMENT_PUBLISHED),
    ).toHaveLength(0);

    await classroomsService.changeStatus(
      ownerCtx,
      OWNER,
      id,
      ClassroomStatus.FINISHED,
    );
    const published = notifications.ofType(
      NotificationType.FINAL_COMMENT_PUBLISHED,
    );
    expect(published).toHaveLength(1);
    expect(published[0].userIds).toEqual(['user-m-student-1']);
    expect(published[0].dedupeKey).toBe(`final_comment:${id}`);

    await progressService.saveComment(
      ownerCtx,
      OWNER,
      id,
      'm-student-1',
      'Sửa lại nhận xét',
    );
    expect(
      notifications.ofType(NotificationType.FINAL_COMMENT_PUBLISHED),
    ).toHaveLength(2);
  });

  it('lớp kết thúc: phụ huynh của con dưới ngưỡng chuyên cần được báo (Step 13)', async () => {
    const {
      notifications,
      classroomsService,
      guardians,
      examAttempts,
      id,
      quizItem,
    } = await classWithAttempts();
    // Cùng một phụ huynh của hai con: chỉ con dưới ngưỡng được báo.
    for (const student of ['m-student-1', 'm-student-2']) {
      guardians.rows.push({
        id: `g-${student}`,
        tenantId: TENANT,
        studentMembershipId: student,
        parentMembershipId: 'm-parent',
      } as StudentGuardian);
    }
    // Học viên 1 thi đúng hạn và đậu (lần thi lại thành không bắt buộc) →
    // 100%; học viên 2 không làm gì → 0% < ngưỡng 70.
    examAttempts.rows.push(
      attempt({
        id: 'a-ontime',
        classItemId: quizItem.id,
        userId: 'user-m-student-1',
        startedAt: new Date('2026-09-10T00:00:00Z'),
      }),
    );

    await classroomsService.changeStatus(
      ownerCtx,
      OWNER,
      id,
      ClassroomStatus.FINISHED,
    );
    const low = notifications.ofType(NotificationType.CHILD_ATTENDANCE_LOW);
    expect(low).toHaveLength(1);
    expect(low[0].userIds).toEqual(['user-m-parent']);
    expect(low[0].params?.childName).toBe('Học viên 2');
    expect(low[0].params?.percent).toBe(0);
    expect(low[0].link).toBe('/t/a/children/m-student-2');
    expect(low[0].dedupeKey).toBe(`child_attendance:${id}:m-student-2`);
  });

  it('xuất Excel 2 sheet đọc được', async () => {
    const { progressService, id } = await classWithAttempts();
    const { fileName, buffer } = await progressService.workbook(ownerCtx, id);
    expect(fileName).toBe('bang-diem-n5-01.xlsx');
    const workbook = new ExcelJS.Workbook();
    // Kiểu `Buffer` trong .d.ts của exceljs khác Buffer của Node 24.
    await workbook.xlsx.load(buffer as never);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Chuyên cần',
      'Bảng điểm',
    ]);
    const attendance = workbook.getWorksheet('Chuyên cần')!;
    expect(attendance.getRow(4).getCell(1).value).toBe('Học viên');
    expect(attendance.actualRowCount).toBeGreaterThan(4);
  });
});

describe('Thông báo (Step 12)', () => {
  it('thêm học viên/giáo viên vào lớp: mỗi nhóm một thông báo, người thao tác không tự nhận', async () => {
    const { notifications, membersService, createClass } = setup();
    const { id } = await createClass();

    const teacherAdded = notifications.ofType(
      NotificationType.CLASS_TEACHER_ADDED,
    );
    expect(teacherAdded).toHaveLength(1);
    expect(teacherAdded[0].userIds).toEqual(['user-m-teacher']);
    expect(teacherAdded[0].link).toBe(`/t/a/dashboard/classes/${id}`);
    expect(teacherAdded[0].exceptUserId).toBe(OWNER);

    await membersService.addStudents(ownerCtx, OWNER, id, [
      'm-student-1',
      'm-student-2',
    ]);
    const studentAdded = notifications.ofType(
      NotificationType.CLASS_STUDENT_ADDED,
    );
    expect(studentAdded).toHaveLength(1);
    expect(studentAdded[0].userIds).toEqual([
      'user-m-student-1',
      'user-m-student-2',
    ]);
    expect(studentAdded[0].link).toBe(`/t/a/classes/${id}`);
    expect(studentAdded[0].params).toEqual({ className: 'N5 tối 2-4' });
  });

  it('giáo trình lớp: mục mới gộp 1 thông báo, mục hẹn ngày mở để cron báo, thi lại riêng', async () => {
    const {
      notifications,
      membersService,
      curriculumService,
      createClass,
      ids,
    } = setup();
    const { id } = await createClass();
    await membersService.addStudents(ownerCtx, OWNER, id, ['m-student-1']);
    const current = await curriculumService.get(teacherCtx, id);
    const quizId = current.groups[0].items[1].id;
    notifications.sent.length = 0;

    await curriculumService.save(
      teacherCtx,
      'user-m-teacher',
      id,
      payload(current, (draft) => {
        draft.groups[0].items.push(
          examItem(ids.final, { label: CurriculumItemLabel.FINAL }),
          lessonItem(ids.lesson3),
          examItem(ids.quiz, { retakeOfItemId: quizId }),
        );
        draft.groups.push({
          title: 'Chương 2',
          opensAt: '2026-12-01T00:00:00.000Z',
          items: [lessonItem(ids.lesson4)],
        });
      }),
    );

    const assigned = notifications.ofType(
      NotificationType.CLASS_ITEMS_ASSIGNED,
    );
    // Gộp 2 mục đã mở; mục của chương 2 chờ tới 01/12 nên cron báo sau.
    expect(assigned).toHaveLength(1);
    expect(assigned[0].params).toEqual({
      className: 'N5 tối 2-4',
      title: 'Thi cuối khoá',
      count: 2,
    });
    expect(assigned[0].userIds).toEqual(['user-m-student-1']);
    const retake = notifications.ofType(NotificationType.RETAKE_ASSIGNED);
    expect(retake).toHaveLength(1);
    expect(retake[0].params?.title).toBe('Kiểm tra chương 1');
    // Giáo viên của lớp được báo, người sửa thì không.
    const changed = notifications.ofType(
      NotificationType.CLASS_CURRICULUM_CHANGED,
    );
    expect(changed[0].exceptUserId).toBe('user-m-teacher');
    expect(changed[0].link).toBe(`/t/a/dashboard/classes/${id}?tab=curriculum`);
  });
});
