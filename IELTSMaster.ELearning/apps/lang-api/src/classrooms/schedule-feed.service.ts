import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClassroomStatus,
  addCalendarDays,
  isValidCalendarRange,
  trainingDateTimeToIso,
  type CalendarFeed,
  type CalendarSession,
} from '@lang/shared';
import {
  Between,
  DataSource,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
} from 'typeorm';
import type { TenantContext } from '../tenants/tenant-context';
import { TenantHoliday } from '../tenant-settings/tenant-holiday.entity';
import { Course } from '../training/course.entity';
import { COURSE_NOT_FOUND } from '../training/courses.service';
import { toCourseRef } from '../training/training.mapper';
import { ClassSessionTeacher } from './class-session-teacher.entity';
import { ClassSession } from './class-session.entity';
import { isClassManager } from './classroom-access';
import { ClassroomTeacher } from './classroom-teacher.entity';
import { Classroom } from './classroom.entity';
import { toClassroomRef } from './classroom.mapper';
import type {
  CalendarRangeQueryDto,
  CenterCalendarQueryDto,
} from './dto/class-schedule.dto';
import {
  bySessionTime,
  loadConflicts,
  loadPersonRefs,
  loadSessionPeople,
  personRefs,
} from './session-data';

const INVALID_RANGE = 'Khoảng ngày không hợp lệ (tối đa 3 tháng)';

/**
 * Lịch gộp (R16): khoá học (gộp lớp), "Lịch dạy của tôi", lịch trung tâm
 * (Owner/Admin, lọc khoá học/giáo viên). Lớp đã huỷ không hiện. Teacher chỉ
 * thấy lớp mình phụ trách và buổi mình dạy thế (người dùng chốt Step 8).
 */
@Injectable()
export class ScheduleFeedService {
  constructor(private readonly dataSource: DataSource) {}

  async course(
    ctx: TenantContext,
    courseId: string,
    range: CalendarRangeQueryDto,
  ): Promise<CalendarFeed> {
    const course = await this.dataSource.manager
      .getRepository(Course)
      .findOneBy({ id: courseId, tenantId: ctx.tenantId });
    if (!course) throw new NotFoundException(COURSE_NOT_FOUND);
    const classrooms = await this.openClassrooms(ctx.tenantId, { courseId });
    if (isClassManager(ctx)) {
      return this.feed(ctx, range, classrooms, () => true);
    }
    const mine = await this.teacherClassroomIds(ctx.membershipId);
    const custom = await this.customSessionIds(ctx.membershipId);
    return this.feed(
      ctx,
      range,
      classrooms,
      (session) => mine.has(session.classroomId) || custom.has(session.id),
    );
  }

  /** Buổi mình dạy: lớp mình phụ trách (không có giáo viên riêng) + buổi được xếp dạy. */
  async mine(
    ctx: TenantContext,
    range: CalendarRangeQueryDto,
  ): Promise<CalendarFeed> {
    const classrooms = await this.openClassrooms(ctx.tenantId);
    const mine = await this.teacherClassroomIds(ctx.membershipId);
    const custom = await this.customSessionIds(ctx.membershipId);
    return this.feed(ctx, range, classrooms, (session) =>
      session.customTeachers
        ? custom.has(session.id)
        : mine.has(session.classroomId),
    );
  }

  async center(
    ctx: TenantContext,
    query: CenterCalendarQueryDto,
  ): Promise<CalendarFeed> {
    const classrooms = await this.openClassrooms(ctx.tenantId, {
      courseId: query.courseId,
    });
    if (!query.teacherId) return this.feed(ctx, query, classrooms, () => true);
    const teaching = await this.teacherClassroomIds(query.teacherId);
    const custom = await this.customSessionIds(query.teacherId);
    return this.feed(ctx, query, classrooms, (session) =>
      session.customTeachers
        ? custom.has(session.id)
        : teaching.has(session.classroomId),
    );
  }

  /**
   * Lịch của một nhóm lớp cho trước — "Lịch học của tôi" (Step 9): lớp mà học
   * viên đang học. Lớp đã huỷ không hiện (như các lịch khác).
   */
  async forClassrooms(
    ctx: TenantContext,
    range: CalendarRangeQueryDto,
    classroomIds: string[],
  ): Promise<CalendarFeed> {
    const ids = new Set(classroomIds);
    const classrooms =
      ids.size > 0
        ? (await this.openClassrooms(ctx.tenantId)).filter((row) =>
            ids.has(row.id),
          )
        : [];
    return this.feed(ctx, range, classrooms, () => true);
  }

  private openClassrooms(
    tenantId: string,
    filter: { courseId?: string } = {},
  ): Promise<Classroom[]> {
    return this.dataSource.manager.getRepository(Classroom).findBy({
      tenantId,
      status: Not(ClassroomStatus.CANCELLED),
      ...(filter.courseId ? { courseId: filter.courseId } : {}),
    });
  }

  private async teacherClassroomIds(membershipId: string) {
    const rows = await this.dataSource.manager
      .getRepository(ClassroomTeacher)
      .findBy({ membershipId });
    return new Set(rows.map((row) => row.classroomId));
  }

  private async customSessionIds(membershipId: string) {
    const rows = await this.dataSource.manager
      .getRepository(ClassSessionTeacher)
      .findBy({ membershipId });
    return new Set(rows.map((row) => row.sessionId));
  }

  private async feed(
    ctx: TenantContext,
    range: CalendarRangeQueryDto,
    classrooms: Classroom[],
    include: (session: ClassSession) => boolean,
  ): Promise<CalendarFeed> {
    if (!isValidCalendarRange(range.from, range.to)) {
      throw new BadRequestException(INVALID_RANGE);
    }
    const manager = this.dataSource.manager;
    const from = new Date(trainingDateTimeToIso(range.from, '00:00'));
    const to = new Date(
      new Date(
        trainingDateTimeToIso(addCalendarDays(range.to, 1), '00:00'),
      ).getTime() - 1,
    );
    const [rows, holidays] = await Promise.all([
      classrooms.length > 0
        ? manager.getRepository(ClassSession).findBy({
            classroomId: In(classrooms.map((row) => row.id)),
            startsAt: Between(from, to),
          })
        : Promise.resolve([]),
      manager.getRepository(TenantHoliday).findBy({
        tenantId: ctx.tenantId,
        startDate: LessThanOrEqual(range.to),
        endDate: MoreThanOrEqual(range.from),
      }),
    ]);
    const sessions = rows.filter(include).sort(bySessionTime);
    const classroomById = new Map(classrooms.map((row) => [row.id, row]));
    const courseIds = [
      ...new Set(
        sessions.map((row) => classroomById.get(row.classroomId)!.courseId),
      ),
    ];
    const people = await loadSessionPeople(manager, sessions);
    const [courses, conflicts, refs] = await Promise.all([
      courseIds.length > 0
        ? manager.getRepository(Course).findBy({ id: In(courseIds) })
        : Promise.resolve([]),
      loadConflicts(manager, ctx.tenantId, sessions, people),
      loadPersonRefs(manager, ctx.tenantId, [
        ...new Set([...people.teachers.values()].flat()),
      ]),
    ]);
    const courseById = new Map(courses.map((row) => [row.id, row]));
    return {
      from: range.from,
      to: range.to,
      sessions: sessions.map((session): CalendarSession => {
        const classroom = classroomById.get(session.classroomId)!;
        const teachers = people.teachers.get(session.id) ?? [];
        const classTeachers = people.classTeachers.get(classroom.id) ?? [];
        return {
          id: session.id,
          classroom: toClassroomRef(classroom),
          course: toCourseRef(courseById.get(classroom.courseId)!),
          kind: session.kind,
          seq: session.seq,
          startsAt: session.startsAt.toISOString(),
          endsAt: session.endsAt.toISOString(),
          status: session.status,
          location: session.location ?? classroom.location,
          teachers: personRefs(teachers, refs),
          substitute:
            teachers.includes(ctx.membershipId) &&
            !classTeachers.includes(ctx.membershipId),
          hasConflict: conflicts.has(session.id),
          movedWarning: session.movedWarning,
        };
      }),
      holidays: holidays
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .map(({ id, name, startDate, endDate }) => ({
          id,
          name,
          startDate,
          endDate,
        })),
    };
  }
}
