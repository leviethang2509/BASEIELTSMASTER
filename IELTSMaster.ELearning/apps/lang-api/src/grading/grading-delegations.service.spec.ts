import 'reflect-metadata';
import {
  AttemptStatus,
  ExamStatus,
  GradingKind,
  GradingScopeType,
  MembershipStatus,
  TenantRole,
  TenantStatus,
  type TenantRole as TenantRoleType,
} from '@lang/shared';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { ClassItem } from '../classrooms/class-item.entity';
import { ClassroomTeacher } from '../classrooms/classroom-teacher.entity';
import { Classroom } from '../classrooms/classroom.entity';
import { Exam } from '../exams/exam.entity';
import { LessonAttempt } from '../lesson-attempts/lesson-attempt.entity';
import { Lesson } from '../lessons/lesson.entity';
import { MembershipRole } from '../memberships/membership-role.entity';
import { Membership } from '../memberships/membership.entity';
import type { TenantContext } from '../tenants/tenant-context';
import { fakeNotifications } from '../testing/fake-notifications';
import { InMemoryDataSource } from '../testing/in-memory-data-source';
import { InMemoryRepository } from '../testing/in-memory-repository';
import { User } from '../users/user.entity';
import { GradingDelegationsService } from './grading-delegations.service';
import { GradingDelegation } from './grading-delegation.entity';
import { canGradeAttempt, loadGraderScope } from './grading-access';

// Chuyển giao chấm (req-3 Step 10, R20): ai giao được, giao cho ai, và người
// được giao chấm được đúng phạm vi đó (không giao tiếp cho người khác).

const TENANT = 'tenant-a';

const context = (
  roles: TenantRoleType[],
  membershipId: string,
): TenantContext => ({
  tenantId: TENANT,
  slug: 'a',
  name: 'A',
  status: TenantStatus.ACTIVE,
  membershipId,
  roles,
  permissions: [],
});

const ownerCtx = context([TenantRole.TENANT_OWNER], 'm-owner');
const teacherCtx = context([TenantRole.TEACHER], 'm-teacher');
const otherCtx = context([TenantRole.TEACHER], 'm-teacher-2');
const authorCtx = context([TenantRole.TEACHER], 'm-author');

function setup() {
  const classrooms = new InMemoryRepository<Classroom>();
  const classroomTeachers = new InMemoryRepository<ClassroomTeacher>();
  const items = new InMemoryRepository<ClassItem>();
  const exams = new InMemoryRepository<Exam>();
  const lessons = new InMemoryRepository<Lesson>();
  const examAttempts = new InMemoryRepository<ExamAttempt>();
  const lessonAttempts = new InMemoryRepository<LessonAttempt>();
  const memberships = new InMemoryRepository<Membership>();
  const roles = new InMemoryRepository<MembershipRole>();
  const users = new InMemoryRepository<User>();
  const delegations = new InMemoryRepository<GradingDelegation>();
  // `@CreateDateColumn` do Postgres điền; repository giả thì tự thêm.
  const insertDelegations = delegations.insert.bind(delegations);
  delegations.insert = (rows) =>
    insertDelegations(
      (Array.isArray(rows) ? rows : [rows]).map((row) =>
        Object.assign({ createdAt: new Date() }, row),
      ),
    );

  const dataSource = new InMemoryDataSource()
    .register(Classroom, classrooms)
    .register(ClassroomTeacher, classroomTeachers)
    .register(ClassItem, items)
    .register(Exam, exams)
    .register(Lesson, lessons)
    .register(ExamAttempt, examAttempts)
    .register(LessonAttempt, lessonAttempts)
    .register(Membership, memberships)
    .register(MembershipRole, roles)
    .register(User, users)
    .register(GradingDelegation, delegations)
    .asDataSource();

  const addMember = (id: string, fullName: string, role: TenantRoleType) => {
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
  addMember('m-teacher', 'Giáo viên lớp', TenantRole.TEACHER);
  addMember('m-teacher-2', 'Giáo viên ngoài', TenantRole.TEACHER);
  addMember('m-author', 'Người soạn', TenantRole.TEACHER);
  addMember('m-student', 'Học viên', TenantRole.STUDENT);

  classrooms.rows.push({
    id: 'class-1',
    tenantId: TENANT,
    code: 'N5-01',
    name: 'N5',
  } as Classroom);
  classroomTeachers.rows.push({
    classroomId: 'class-1',
    membershipId: 'm-teacher',
  } as ClassroomTeacher);
  exams.rows.push({
    id: 'exam-1',
    tenantId: TENANT,
    title: 'Kiểm tra chương 1',
    status: ExamStatus.PUBLISHED,
    createdBy: 'user-m-author',
    deletedAt: null,
  } as Exam);
  items.rows.push({
    id: 'item-1',
    classroomId: 'class-1',
    itemType: 'exam',
    examId: 'exam-1',
    lessonId: null,
    title: null,
    removedAt: null,
  } as ClassItem);
  const attempt = (id: string, classItemId: string | null) => {
    examAttempts.rows.push({
      id,
      tenantId: TENANT,
      examId: 'exam-1',
      userId: 'user-m-student',
      membershipId: 'm-student',
      classItemId,
      status: AttemptStatus.SUBMITTED,
      manualCount: 1,
      manualGradedCount: 0,
      startedAt: new Date(),
      submittedAt: new Date(),
      voidedAt: null,
    } as ExamAttempt);
    return id;
  };
  attempt('a-class', 'item-1');
  attempt('a-free', null);

  return {
    service: new GradingDelegationsService(
      dataSource,
      fakeNotifications().service,
    ),
    dataSource,
    delegations,
  };
}

const query = (attemptId: string) => ({
  attemptId,
  kind: GradingKind.EXAM,
});

/** Người này chấm được lượt nào trong hai lượt mẫu. */
async function gradable(
  dataSource: ReturnType<typeof setup>['dataSource'],
  ctx: TenantContext,
) {
  const scope = await loadGraderScope(
    dataSource.manager,
    ctx,
    `user-${ctx.membershipId}`,
  );
  const rows = [
    {
      id: 'a-class',
      classItemId: 'item-1',
      classroomId: 'class-1',
    },
    { id: 'a-free', classItemId: null, classroomId: null },
  ];
  return rows
    .filter((row) =>
      canGradeAttempt(
        scope,
        {
          ...row,
          userId: 'user-m-student',
          voided: false,
          contentId: 'exam-1',
          authorId: 'user-m-author',
        },
        GradingKind.EXAM,
      ),
    )
    .map((row) => row.id);
}

describe('GradingDelegationsService', () => {
  it('mặc định: giáo viên lớp chấm bài trong lớp, người soạn chấm bài tự do', async () => {
    const { dataSource } = setup();
    expect(await gradable(dataSource, teacherCtx)).toEqual(['a-class']);
    expect(await gradable(dataSource, authorCtx)).toEqual(['a-free']);
    expect(await gradable(dataSource, otherCtx)).toEqual([]);
    expect(await gradable(dataSource, ownerCtx)).toEqual(['a-class', 'a-free']);
  });

  it('hộp chuyển giao: giáo viên lớp có 2 phạm vi, người ngoài lớp bị 403', async () => {
    const { service } = setup();
    const box = await service.box(
      teacherCtx,
      'user-m-teacher',
      query('a-class'),
    );
    expect(box.targets.map((target) => target.scopeType)).toEqual([
      GradingScopeType.EXAM_ATTEMPT,
      GradingScopeType.CLASS_ITEM,
    ]);
    await expect(
      service.box(otherCtx, 'user-m-teacher-2', query('a-class')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bài tự do: phạm vi thứ hai là cả đề thi', async () => {
    const { service } = setup();
    const box = await service.box(authorCtx, 'user-m-author', query('a-free'));
    expect(box.targets.map((target) => target.scopeType)).toEqual([
      GradingScopeType.EXAM_ATTEMPT,
      GradingScopeType.EXAM,
    ]);
    expect(box.targets[1].title).toContain('Kiểm tra chương 1');
  });

  it('giao mục lớp: người được giao chấm được bài của mục, không giao tiếp được', async () => {
    const { service, dataSource } = setup();
    const rows = await service.create(teacherCtx, 'user-m-teacher', {
      scopeType: GradingScopeType.CLASS_ITEM,
      scopeId: 'item-1',
      delegateMembershipIds: ['m-teacher-2'],
    });
    expect(rows.map((row) => row.delegate.fullName)).toEqual([
      'Giáo viên ngoài',
    ]);
    expect(rows[0].createdBy?.fullName).toBe('Giáo viên lớp');
    // Người được giao chấm được bài trong mục, nhưng không phải bài tự do.
    expect(await gradable(dataSource, otherCtx)).toEqual(['a-class']);
    // Giao lại lần nữa không tạo thêm dòng.
    const again = await service.create(teacherCtx, 'user-m-teacher', {
      scopeType: GradingScopeType.CLASS_ITEM,
      scopeId: 'item-1',
      delegateMembershipIds: ['m-teacher-2'],
    });
    expect(again).toHaveLength(1);
    // Không giao tiếp: người được giao không có phạm vi nào.
    const box = await service.box(
      otherCtx,
      'user-m-teacher-2',
      query('a-class'),
    );
    expect(box.targets).toEqual([]);
    await expect(
      service.create(otherCtx, 'user-m-teacher-2', {
        scopeType: GradingScopeType.CLASS_ITEM,
        scopeId: 'item-1',
        delegateMembershipIds: ['m-author'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('giao đề thi: chỉ người soạn (hoặc Owner/Admin), chỉ mở bài tự do', async () => {
    const { service, dataSource } = setup();
    await expect(
      service.create(teacherCtx, 'user-m-teacher', {
        scopeType: GradingScopeType.EXAM,
        scopeId: 'exam-1',
        delegateMembershipIds: ['m-teacher-2'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await service.create(authorCtx, 'user-m-author', {
      scopeType: GradingScopeType.EXAM,
      scopeId: 'exam-1',
      delegateMembershipIds: ['m-teacher-2'],
    });
    expect(await gradable(dataSource, otherCtx)).toEqual(['a-free']);
  });

  it('chỉ giao cho thành viên có vai trò Giáo viên', async () => {
    const { service } = setup();
    await expect(
      service.create(ownerCtx, 'user-m-owner', {
        scopeType: GradingScopeType.CLASS_ITEM,
        scopeId: 'item-1',
        delegateMembershipIds: ['m-student'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('gỡ chuyển giao: người có quyền gốc gỡ được, người khác 403', async () => {
    const { service, dataSource, delegations } = setup();
    const [row] = await service.create(ownerCtx, 'user-m-owner', {
      scopeType: GradingScopeType.CLASS_ITEM,
      scopeId: 'item-1',
      delegateMembershipIds: ['m-teacher-2'],
    });
    await expect(
      service.remove(otherCtx, 'user-m-teacher-2', row.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await service.remove(teacherCtx, 'user-m-teacher', row.id);
    expect(delegations.rows).toEqual([]);
    expect(await gradable(dataSource, otherCtx)).toEqual([]);
  });
});
