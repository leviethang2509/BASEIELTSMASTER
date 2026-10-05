import 'reflect-metadata';
import {
  ClassroomStatus,
  CurriculumItemType,
  NotificationType,
} from '@lang/shared';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { ClassGroup } from '../classrooms/class-group.entity';
import { ClassItem } from '../classrooms/class-item.entity';
import { ClassroomStudent } from '../classrooms/classroom-student.entity';
import { Classroom } from '../classrooms/classroom.entity';
import { Exam } from '../exams/exam.entity';
import { LessonAttempt } from '../lesson-attempts/lesson-attempt.entity';
import { Lesson } from '../lessons/lesson.entity';
import { Membership } from '../memberships/membership.entity';
import { StudentGuardian } from '../memberships/student-guardian.entity';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';
import { fakeNotifications } from '../testing/fake-notifications';
import { InMemoryDataSource } from '../testing/in-memory-data-source';
import { InMemoryRepository } from '../testing/in-memory-repository';
import { sweepClassItems } from './notification-sweep';

const NOW = new Date('2026-09-20T10:00:00Z');
const TENANT = 'tenant-a';
const CLASS = 'class-1';
const EXAM = 'exam-1';

/** Lớp đang học, 2 học viên, 1 đề thi dùng cho mọi mục. */
function setup() {
  const classrooms = new InMemoryRepository<Classroom>();
  const groups = new InMemoryRepository<ClassGroup>();
  const items = new InMemoryRepository<ClassItem>();
  const enrollments = new InMemoryRepository<ClassroomStudent>();
  const memberships = new InMemoryRepository<Membership>();
  const users = new InMemoryRepository<User>();
  const guardians = new InMemoryRepository<StudentGuardian>();
  const tenants = new InMemoryRepository<Tenant>();
  const exams = new InMemoryRepository<Exam>();
  const lessons = new InMemoryRepository<Lesson>();
  const examAttempts = new InMemoryRepository<ExamAttempt>();
  const lessonAttempts = new InMemoryRepository<LessonAttempt>();

  tenants.rows.push({ id: TENANT, slug: 'a', name: 'A' } as Tenant);
  classrooms.rows.push({
    id: CLASS,
    tenantId: TENANT,
    name: 'N5 tối T2-T4',
    status: ClassroomStatus.ONGOING,
  } as Classroom);
  exams.rows.push({ id: EXAM, title: 'Kiểm tra chương 1' } as Exam);
  for (const [membershipId, userId, fullName] of [
    ['m-1', 'u-1', 'Học viên 1'],
    ['m-2', 'u-2', 'Học viên 2'],
  ]) {
    memberships.rows.push({ id: membershipId, userId } as Membership);
    users.rows.push({ id: userId, fullName } as User);
    enrollments.rows.push({
      id: `e-${membershipId}`,
      classroomId: CLASS,
      membershipId,
      removedAt: null,
    } as ClassroomStudent);
  }

  const addItem = (row: Partial<ClassItem>) => {
    const id = row.id ?? `item-${items.rows.length + 1}`;
    items.rows.push({
      id,
      classroomId: CLASS,
      groupId: null,
      itemType: CurriculumItemType.EXAM,
      examId: EXAM,
      lessonId: null,
      title: null,
      opensAt: null,
      deadlineAt: null,
      removedAt: null,
      ...row,
    } as ClassItem);
    return id;
  };

  const dataSource = new InMemoryDataSource()
    .register(Classroom, classrooms)
    .register(ClassGroup, groups)
    .register(ClassItem, items)
    .register(ClassroomStudent, enrollments)
    .register(Membership, memberships)
    .register(User, users)
    .register(StudentGuardian, guardians)
    .register(Tenant, tenants)
    .register(Exam, exams)
    .register(Lesson, lessons)
    .register(ExamAttempt, examAttempts)
    .register(LessonAttempt, lessonAttempts)
    .asDataSource();

  const notifications = fakeNotifications();
  const sweep = (now = NOW) =>
    sweepClassItems(dataSource.manager, notifications.service, now);
  return {
    sweep,
    notifications,
    addItem,
    groups,
    classrooms,
    examAttempts,
    guardians,
    memberships,
    users,
  };
}

const hoursFromNow = (hours: number) =>
  new Date(NOW.getTime() + hours * 60 * 60 * 1000);

describe('sweepClassItems', () => {
  it('mục vừa mở: báo mọi học viên, chạy lại không tạo thêm', async () => {
    const { sweep, notifications, addItem } = setup();
    addItem({ id: 'vua-mo', opensAt: hoursFromNow(-1) });
    addItem({ id: 'chua-mo', opensAt: hoursFromNow(5) });
    addItem({ id: 'mo-lau-roi', opensAt: hoursFromNow(-24 * 10) });

    const counts = await sweep();
    expect(counts.opened).toBe(2);
    const sent = notifications.ofType(NotificationType.CLASS_ITEM_OPENED);
    expect(sent).toHaveLength(1);
    expect(sent[0].userIds).toEqual(['u-1', 'u-2']);
    expect(sent[0].dedupeKey).toBe('open:vua-mo');
    expect(sent[0].params?.title).toBe('Kiểm tra chương 1');
    expect(sent[0].link).toBe(`/t/a/classes/${CLASS}`);
  });

  it('ngày mở của chương cũng tính (mốc muộn hơn)', async () => {
    const { sweep, notifications, addItem, groups } = setup();
    groups.rows.push({
      id: 'g-1',
      classroomId: CLASS,
      opensAt: hoursFromNow(-2),
    } as ClassGroup);
    addItem({ id: 'theo-chuong', groupId: 'g-1', opensAt: null });
    addItem({ id: 'muc-mo-sau', groupId: 'g-1', opensAt: hoursFromNow(6) });

    await sweep();
    const sent = notifications.ofType(NotificationType.CLASS_ITEM_OPENED);
    expect(sent.map((row) => row.dedupeKey)).toEqual(['open:theo-chuong']);
  });

  it('sắp hết hạn và quá hạn: chỉ học viên chưa nộp', async () => {
    const { sweep, notifications, addItem, examAttempts } = setup();
    addItem({ id: 'sap-het-han', deadlineAt: hoursFromNow(5) });
    addItem({ id: 'qua-han', deadlineAt: hoursFromNow(-5) });
    addItem({ id: 'con-lau', deadlineAt: hoursFromNow(48) });
    examAttempts.rows.push({
      id: 'a-1',
      classItemId: 'sap-het-han',
      userId: 'u-1',
      voidedAt: null,
    } as ExamAttempt);
    // Lượt đã "Cho làm lại" không tính là đã nộp.
    examAttempts.rows.push({
      id: 'a-2',
      classItemId: 'qua-han',
      userId: 'u-1',
      voidedAt: NOW,
    } as ExamAttempt);

    const counts = await sweep();
    expect(counts).toEqual({
      opened: 0,
      deadlineSoon: 1,
      overdue: 2,
      guardianOverdue: 0,
    });
    const soon = notifications.ofType(NotificationType.ITEM_DEADLINE_SOON);
    expect(soon[0].userIds).toEqual(['u-2']);
    expect(soon[0].dedupeKey).toBe('soon:sap-het-han');
    expect(soon[0].params?.at).toBe(hoursFromNow(5).toISOString());
    const late = notifications.ofType(NotificationType.ITEM_OVERDUE);
    expect(late[0].userIds).toEqual(['u-1', 'u-2']);
    expect(late[0].dedupeKey).toBe('late:qua-han');
  });

  it('bài học tính theo lần nộp; lớp chưa học hoặc đã kết thúc bỏ qua', async () => {
    const { sweep, notifications, addItem, classrooms } = setup();
    addItem({
      id: 'bai-hoc',
      itemType: CurriculumItemType.LESSON,
      examId: null,
      lessonId: 'lesson-1',
      title: 'Minna bài 1',
      deadlineAt: hoursFromNow(-2),
    });
    await sweep();
    expect(
      notifications.ofType(NotificationType.ITEM_OVERDUE)[0].params?.title,
    ).toBe('Minna bài 1');

    notifications.sent.length = 0;
    await classrooms.update(CLASS, { status: ClassroomStatus.FINISHED });
    expect(await sweep()).toEqual({
      opened: 0,
      deadlineSoon: 0,
      overdue: 0,
      guardianOverdue: 0,
    });
    expect(notifications.sent).toHaveLength(0);
  });

  it('quá hạn: phụ huynh của con chưa nộp cũng được báo (Step 13)', async () => {
    const { sweep, notifications, addItem, guardians, memberships, users } =
      setup();
    memberships.rows.push({ id: 'm-ph', userId: 'u-ph' } as Membership);
    users.rows.push({ id: 'u-ph', fullName: 'Phụ huynh' } as User);
    guardians.rows.push({
      id: 'g-1',
      tenantId: TENANT,
      studentMembershipId: 'm-1',
      parentMembershipId: 'm-ph',
    } as StudentGuardian);
    addItem({ id: 'qua-han', deadlineAt: hoursFromNow(-3) });

    const counts = await sweep();
    expect(counts.guardianOverdue).toBe(1);
    const sent = notifications.ofType(NotificationType.CHILD_ITEM_OVERDUE);
    expect(sent).toHaveLength(1);
    expect(sent[0].userIds).toEqual(['u-ph']);
    expect(sent[0].params?.childName).toBe('Học viên 1');
    expect(sent[0].link).toBe('/t/a/children/m-1');
    // Khoá chống trùng theo từng con: cron chạy lại không báo lại.
    expect(sent[0].dedupeKey).toBe('child_late:qua-han:m-1');
  });

  it('mục đã bỏ khỏi giáo trình không báo', async () => {
    const { sweep, notifications, addItem } = setup();
    addItem({ id: 'da-bo', deadlineAt: hoursFromNow(-1), removedAt: NOW });
    await sweep();
    expect(notifications.sent).toHaveLength(0);
  });
});
