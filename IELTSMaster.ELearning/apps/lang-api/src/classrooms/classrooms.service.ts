import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ClassLogAction,
  ClassroomStatus,
  CourseStatus,
  canChangeClassroomStatus,
  isClassroomClosed,
  type ClassLogEntry,
  type ClassroomDetail,
  type ClassroomListItem,
} from '@lang/shared';
import { DataSource, In, IsNull, type Repository } from 'typeorm';
import { AttemptsService } from '../attempts/attempts.service';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '../common/database-errors';
import { toSkipTake, type Paginated } from '../common/pagination';
import { escapeLike } from '../common/sql';
import { toUserRef } from '../exams/exam.mapper';
import { Membership } from '../memberships/membership.entity';
import { NotificationsService } from '../notifications/notifications.service';
import type { TenantContext } from '../tenants/tenant-context';
import { CourseCurriculum } from '../training/course-curriculum.entity';
import { Course } from '../training/course.entity';
import { COURSE_NOT_FOUND } from '../training/courses.service';
import { Curriculum } from '../training/curriculum.entity';
import { toCourseRef } from '../training/training.mapper';
import { User } from '../users/user.entity';
import { countInProgressAttempts, learnerCountsByItem } from './class-activity';
import { ClassChangeLog } from './class-change-log.entity';
import { copyCurriculumIntoClassroom } from './class-curriculum.service';
import {
  notifyFinalComments,
  notifyGuardiansAttendance,
  notifySessionsMoved,
} from './class-notifications';
import { ClassItem } from './class-item.entity';
import { writeClassLog } from './class-logs';
import { loadHolidays, recomputeClassroom } from './class-schedule';
import {
  findClassroom,
  isClassManager,
  loadClassroomAccess,
} from './classroom-access';
import { ClassroomStudent } from './classroom-student.entity';
import { ClassroomTeacher } from './classroom-teacher.entity';
import { Classroom } from './classroom.entity';
import { toClassroomListItem } from './classroom.mapper';
import type { ListClassLogsQueryDto } from './dto/class-logs.dto';
import type {
  CreateClassroomDto,
  ListClassroomsQueryDto,
  UpdateClassroomDto,
} from './dto/classroom.dto';

const CODE_TAKEN = 'Mã lớp đã tồn tại';
const COURSE_ARCHIVED = 'Khoá học đã lưu trữ, không tạo lớp mới được';
const CURRICULUM_NOT_ATTACHED =
  'Giáo trình tham khảo không thuộc khoá học đã chọn';
const PLANNED_SESSIONS_REQUIRED =
  'Khoá học chưa có số buổi dự kiến, vui lòng nhập số buổi của lớp';
const STATUS_CONFLICT = 'Trạng thái lớp vừa thay đổi, hãy tải lại trang';
const HAS_ACTIVITY =
  'Lớp đã có bài làm của học viên, không xoá được. Hãy chuyển sang "Đã huỷ"';

const STATUS_LABELS: Record<ClassroomStatus, string> = {
  [ClassroomStatus.UPCOMING]: 'Sắp mở',
  [ClassroomStatus.ONGOING]: 'Đang học',
  [ClassroomStatus.FINISHED]: 'Đã kết thúc',
  [ClassroomStatus.CANCELLED]: 'Đã huỷ',
};

/** Trường thông tin lớp ghi vào nhật ký khi đổi. */
const INFO_FIELDS = [
  'code',
  'name',
  'description',
  'maxStudents',
  'location',
  // Tham số chuyên cần ghi đè của lớp (Step 11); `null` = theo trung tâm.
  'lateWeight',
  'warningThreshold',
] as const;

/**
 * Lớp học (req-3 Step 7, D1–D2, D11, giả định 3–4). Owner/Admin tạo, sửa,
 * đổi trạng thái, xoá; Teacher xem lớp mình phụ trách (`loadClassroomAccess`).
 */
@Injectable()
export class ClassroomsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly attempts: AttemptsService,
    @InjectRepository(Classroom)
    private readonly classrooms: Repository<Classroom>,
    @InjectRepository(ClassroomTeacher)
    private readonly teachers: Repository<ClassroomTeacher>,
    @InjectRepository(ClassroomStudent)
    private readonly students: Repository<ClassroomStudent>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(ClassChangeLog)
    private readonly changeLogs: Repository<ClassChangeLog>,
    private readonly notifications: NotificationsService,
  ) {}

  /** Owner/Admin thấy mọi lớp; Teacher chỉ lớp mình phụ trách (D11). */
  async list(
    ctx: TenantContext,
    query: ListClassroomsQueryDto,
  ): Promise<Paginated<ClassroomListItem>> {
    const { skip, take } = toSkipTake(query);
    const qb = this.classrooms
      .createQueryBuilder('classroom')
      .where('classroom.tenantId = :tenantId', { tenantId: ctx.tenantId })
      .orderBy(
        `CASE classroom.status WHEN '${ClassroomStatus.ONGOING}' THEN 0 WHEN '${ClassroomStatus.UPCOMING}' THEN 1 WHEN '${ClassroomStatus.FINISHED}' THEN 2 ELSE 3 END`,
        'ASC',
      )
      .addOrderBy('classroom.startDate', 'DESC')
      .addOrderBy('classroom.code', 'ASC')
      .offset(skip)
      .limit(take);
    if (query.q) {
      qb.andWhere('(classroom.name ILIKE :q OR classroom.code ILIKE :q)', {
        q: `%${escapeLike(query.q)}%`,
      });
    }
    if (query.status) {
      qb.andWhere('classroom.status = :status', { status: query.status });
    }
    if (query.courseId) {
      qb.andWhere('classroom.courseId = :courseId', {
        courseId: query.courseId,
      });
    }
    const teacherIds = [
      ...(isClassManager(ctx) ? [] : [ctx.membershipId]),
      ...(query.teacherId ? [query.teacherId] : []),
    ];
    teacherIds.forEach((membershipId, index) => {
      qb.innerJoin(
        ClassroomTeacher,
        `teacher${index}`,
        `teacher${index}.classroomId = classroom.id AND teacher${index}.membershipId = :teacher${index}`,
        { [`teacher${index}`]: membershipId },
      );
    });
    const [rows, total] = await qb.getManyAndCount();
    return {
      items: await this.toListItems(rows),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getDetail(ctx: TenantContext, id: string): Promise<ClassroomDetail> {
    const manager = this.dataSource.manager;
    const access = await loadClassroomAccess(manager, ctx, id);
    const { classroom } = access;
    const itemIds = (
      await manager.getRepository(ClassItem).find({
        select: { id: true },
        where: { classroomId: id },
      })
    ).map((item) => item.id);
    const [[item], source, inProgress, counts] = await Promise.all([
      this.toListItems([classroom]),
      classroom.sourceCurriculumId
        ? manager
            .getRepository(Curriculum)
            .findOneBy({ id: classroom.sourceCurriculumId })
        : Promise.resolve(null),
      countInProgressAttempts(manager, itemIds),
      learnerCountsByItem(manager, itemIds),
    ]);
    return {
      ...item,
      description: classroom.description,
      sourceCurriculum: source ? { id: source.id, name: source.name } : null,
      canManage: access.canManage,
      canEditCurriculum: access.canEditCurriculum,
      inProgressAttemptCount: inProgress,
      hasActivity: counts.size > 0,
      createdAt: classroom.createdAt.toISOString(),
    };
  }

  /** Tạo từ khoá học đang dùng, chép giáo trình tham khảo nếu chọn (R6). */
  async create(
    ctx: TenantContext,
    actorId: string,
    dto: CreateClassroomDto,
  ): Promise<ClassroomDetail> {
    let id: string;
    try {
      id = await this.dataSource.transaction(async (manager) => {
        // FOR SHARE: khoá học không bị xoá/lưu trữ giữa chừng.
        const course = await manager.getRepository(Course).findOne({
          where: { id: dto.courseId, tenantId: ctx.tenantId },
          lock: { mode: 'pessimistic_read' },
        });
        if (!course) throw new BadRequestException(COURSE_NOT_FOUND);
        if (course.status !== CourseStatus.ACTIVE) {
          throw new BadRequestException(COURSE_ARCHIVED);
        }
        const plannedSessions = dto.plannedSessions ?? course.plannedSessions;
        if (!plannedSessions) {
          throw new BadRequestException(PLANNED_SESSIONS_REQUIRED);
        }
        let source: Curriculum | null = null;
        if (dto.sourceCurriculumId) {
          const attached = await manager
            .getRepository(CourseCurriculum)
            .existsBy({
              courseId: course.id,
              curriculumId: dto.sourceCurriculumId,
            });
          // FOR SHARE: không chạy song song với lần lưu mục của giáo trình.
          source = attached
            ? await manager.getRepository(Curriculum).findOne({
                where: { id: dto.sourceCurriculumId, tenantId: ctx.tenantId },
                lock: { mode: 'pessimistic_read' },
              })
            : null;
          if (!source) throw new BadRequestException(CURRICULUM_NOT_ATTACHED);
        }
        await this.assertCodeAvailable(ctx, dto.code);

        const repository = manager.getRepository(Classroom);
        const classroom = await repository.save(
          repository.create({
            tenantId: ctx.tenantId,
            courseId: course.id,
            code: dto.code,
            name: dto.name,
            description: dto.description ?? null,
            startDate: dto.startDate,
            plannedSessions,
            endDate: null,
            maxStudents: dto.maxStudents ?? null,
            location: dto.location ?? null,
            status: ClassroomStatus.UPCOMING,
            applyTenantHolidays: true,
            sourceCurriculumId: source?.id ?? null,
            curriculumRevision: 1,
            createdBy: actorId,
            updatedBy: actorId,
          }),
        );
        if (source) {
          await copyCurriculumIntoClassroom(manager, classroom.id, source.id);
        }
        await writeClassLog(
          manager,
          classroom.id,
          actorId,
          ClassLogAction.CREATED,
          { curriculum: source?.name ?? null },
        );
        return classroom.id;
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(CODE_TAKEN);
      throw error;
    }
    return this.getDetail(ctx, id);
  }

  /** Sửa thông tin (khoá học không đổi, D1); lớp đã kết thúc/huỷ vẫn sửa được. */
  async update(
    ctx: TenantContext,
    actorId: string,
    id: string,
    dto: UpdateClassroomDto,
  ): Promise<ClassroomDetail> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const classroom = await findClassroom(manager, ctx.tenantId, id, true);
        const changes: Partial<Classroom> = {};
        for (const field of INFO_FIELDS) {
          const value = dto[field];
          if (value !== undefined && value !== classroom[field]) {
            (changes as Record<string, unknown>)[field] = value;
          }
        }
        if (changes.code !== undefined) {
          await this.assertCodeAvailable(ctx, changes.code);
        }
        const fields = Object.keys(changes);
        if (fields.length === 0) return;
        await manager
          .getRepository(Classroom)
          .update(id, { ...changes, updatedBy: actorId });
        await writeClassLog(manager, id, actorId, ClassLogAction.UPDATED, {
          fields,
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(CODE_TAKEN);
      throw error;
    }
    return this.getDetail(ctx, id);
  }

  /**
   * Đổi trạng thái bằng tay (D2, T6). Sang "Đã kết thúc"/"Đã huỷ": chốt ngay
   * mọi lượt thi làm dở trong lớp (không mở lại khi lớp mở lại). Mở lại lớp đã
   * kết thúc thì tính lại thời khoá biểu.
   */
  async changeStatus(
    ctx: TenantContext,
    actorId: string,
    id: string,
    status: ClassroomStatus,
  ): Promise<ClassroomDetail> {
    await this.dataSource.transaction(async (manager) => {
      const classroom = await findClassroom(manager, ctx.tenantId, id, true);
      const from = classroom.status;
      if (from === status) return;
      if (!canChangeClassroomStatus(from, status)) {
        throw new ConflictException(
          `Không chuyển được lớp từ "${STATUS_LABELS[from]}" sang "${STATUS_LABELS[status]}"`,
        );
      }
      const { affected } = await manager
        .getRepository(Classroom)
        .update({ id, status: from }, { status, updatedBy: actorId });
      if (!affected) throw new ConflictException(STATUS_CONFLICT);

      if (isClassroomClosed(from) && !isClassroomClosed(status)) {
        // Mở lại lớp: lịch không được dời lúc lớp đóng (U3.4), tính lại ngay.
        const result = await recomputeClassroom(
          manager,
          { ...classroom, status },
          await loadHolidays(manager, ctx.tenantId),
          new Date(),
          actorId,
        );
        if (result) {
          await notifySessionsMoved(manager, this.notifications, {
            classroom,
            slug: ctx.slug,
            result,
            actorId,
          });
        }
      }
      let finalized: number | undefined;
      if (isClassroomClosed(status)) {
        const items = await manager.getRepository(ClassItem).find({
          select: { id: true },
          where: { classroomId: id },
        });
        finalized = await this.attempts.finalizeForClassItems(
          manager,
          items.map((item) => item.id),
        );
      }
      if (status === ClassroomStatus.FINISHED) {
        await notifyFinalComments(manager, this.notifications, {
          classroom,
          slug: ctx.slug,
          actorId,
        });
        // Sau khi đã chốt lượt dở dang thì chuyên cần mới là số cuối cùng.
        await notifyGuardiansAttendance(manager, this.notifications, {
          classroom: { ...classroom, status },
          slug: ctx.slug,
        });
      }
      await writeClassLog(manager, id, actorId, ClassLogAction.STATUS_CHANGED, {
        from,
        to: status,
        ...(finalized ? { finalizedAttempts: finalized } : {}),
      });
    });
    return this.getDetail(ctx, id);
  }

  /** Chỉ xoá hẳn khi chưa có bài làm nào; có rồi thì chỉ huỷ (giả định 4). */
  async remove(ctx: TenantContext, id: string): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        await findClassroom(manager, ctx.tenantId, id, true);
        const items = await manager.getRepository(ClassItem).find({
          select: { id: true },
          where: { classroomId: id },
        });
        const counts = await learnerCountsByItem(
          manager,
          items.map((item) => item.id),
        );
        if (counts.size > 0) throw new ConflictException(HAS_ACTIVITY);
        await manager.getRepository(Classroom).delete({ id });
      });
    } catch (error) {
      // Học viên vừa bắt đầu bài ngay sau lúc kiểm tra (FK NO ACTION).
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(HAS_ACTIVITY);
      }
      throw error;
    }
  }

  /** Nhật ký thay đổi, mới nhất trước. */
  async logs(
    ctx: TenantContext,
    id: string,
    query: ListClassLogsQueryDto,
  ): Promise<Paginated<ClassLogEntry>> {
    await loadClassroomAccess(this.dataSource.manager, ctx, id);
    const { skip, take } = toSkipTake(query);
    const [rows, total] = await this.changeLogs
      .createQueryBuilder('log')
      .where('log.classroomId = :id', { id })
      .orderBy('log.createdAt', 'DESC')
      .addOrderBy('log.id', 'ASC')
      .offset(skip)
      .limit(take)
      .getManyAndCount();
    const actorIds = [...new Set(rows.flatMap((row) => row.actorUserId ?? []))];
    const users =
      actorIds.length > 0 ? await this.users.findBy({ id: In(actorIds) }) : [];
    const userById = new Map(users.map((user) => [user.id, user]));
    return {
      items: rows.map((row) => ({
        id: row.id,
        action: row.action,
        detail: row.detail,
        actor: toUserRef(
          row.actorUserId ? userById.get(row.actorUserId) : undefined,
        ),
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  private async toListItems(
    classrooms: Classroom[],
  ): Promise<ClassroomListItem[]> {
    if (classrooms.length === 0) return [];
    const ids = classrooms.map((row) => row.id);
    const courseIds = [...new Set(classrooms.map((row) => row.courseId))];
    const [courses, teachers, students] = await Promise.all([
      this.courses.findBy({ id: In(courseIds) }),
      this.teachers.findBy({ classroomId: In(ids) }),
      this.students.findBy({ classroomId: In(ids), removedAt: IsNull() }),
    ]);
    const memberships =
      teachers.length > 0
        ? await this.memberships.findBy({
            id: In(teachers.map((row) => row.membershipId)),
          })
        : [];
    const users =
      memberships.length > 0
        ? await this.users.findBy({
            id: In(memberships.map((row) => row.userId)),
          })
        : [];
    const courseById = new Map(courses.map((row) => [row.id, row]));
    const membershipById = new Map(memberships.map((row) => [row.id, row]));
    const userById = new Map(users.map((row) => [row.id, row]));
    return classrooms.map((classroom) =>
      toClassroomListItem(classroom, {
        course: toCourseRef(courseById.get(classroom.courseId)!),
        studentCount: students.filter((row) => row.classroomId === classroom.id)
          .length,
        teachers: teachers
          .filter((row) => row.classroomId === classroom.id)
          .flatMap((row) => {
            const membership = membershipById.get(row.membershipId);
            const user = membership ? userById.get(membership.userId) : null;
            return user ? [{ id: user.id, fullName: user.fullName }] : [];
          })
          .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi')),
      }),
    );
  }

  private async assertCodeAvailable(
    ctx: TenantContext,
    code: string,
  ): Promise<void> {
    const taken = await this.classrooms.existsBy({
      tenantId: ctx.tenantId,
      code,
    });
    if (taken) throw new ConflictException(CODE_TAKEN);
  }
}
