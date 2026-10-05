import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClassLogAction,
  ClassSessionKind,
  ClassSessionStatus,
  NotificationType,
  TenantRole,
  isClassroomClosed,
  trainingDateOf,
  type ClassSessionDetail,
  type ClassSessionView,
  type SessionField,
} from '@lang/shared';
import { DataSource, In, IsNull, type EntityManager } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import type { TenantContext } from '../tenants/tenant-context';
import { Course } from '../training/course.entity';
import { toCourseRef } from '../training/training.mapper';
import { ClassGroup } from './class-group.entity';
import { ClassItem } from './class-item.entity';
import { loadEligible } from './class-members.service';
import { writeClassLog } from './class-logs';
import {
  notifySessionChanged,
  notifySessionTeachers,
} from './class-notifications';
import { ClassSessionLink } from './class-session-link.entity';
import { ClassSessionTeacher } from './class-session-teacher.entity';
import { ClassSession } from './class-session.entity';
import {
  assertClassroomOpen,
  isClassManager,
  loadClassroomAccess,
  NOT_CLASS_TEACHER,
} from './classroom-access';
import { Classroom } from './classroom.entity';
import { toClassroomRef } from './classroom.mapper';
import type {
  CreateMakeupSessionDto,
  SaveSessionLinksDto,
  UpdateClassSessionDto,
} from './dto/class-schedule.dto';
import {
  buildSessionViews,
  loadPersonRefs,
  loadSessionPeople,
  personRefs,
} from './session-data';

export const SESSION_NOT_FOUND = 'Không tìm thấy buổi học';
const SESSION_STARTED =
  'Buổi học đã diễn ra, chỉ sửa được phòng/link, ghi chú và nội dung';
const SESSION_NOT_CANCELLED = 'Buổi học chưa bị huỷ';
const SESSION_ALREADY_CANCELLED = 'Buổi học đã bị huỷ';
const TIME_PAIR = 'Vui lòng nhập cả giờ bắt đầu và giờ kết thúc';
const TIME_ORDER = 'Giờ kết thúc phải sau giờ bắt đầu';
const TIME_TOO_LONG = 'Một buổi học dài tối đa 12 giờ';
const TIME_IN_PAST = 'Giờ bắt đầu phải sau thời điểm hiện tại';
const TIME_SAME_DAY =
  'Buổi thường chỉ đổi giờ trong cùng ngày; đổi ngày thì sửa thời khoá biểu hoặc huỷ buổi và thêm buổi bù';
const TEACHERS_REQUIRED = 'Vui lòng chọn ít nhất một giáo viên';
const MAKEUP_TARGET = 'Buổi được bù phải là buổi thường của lớp';
const NOT_MAKEUP = 'Chỉ xoá được buổi bù';
const LINK_TARGET = 'Chương hoặc mục không thuộc giáo trình lớp, hãy tải lại';
const MAX_SESSION_MS = 12 * 60 * 60 * 1000;

/**
 * Thao tác trên từng buổi (V1, R14, R17): giáo viên của lớp và Owner/Admin
 * huỷ/khôi phục, thêm/xoá buổi bù, sửa phòng/ghi chú/giờ/giáo viên, map nội
 * dung. Buổi đã diễn ra chỉ sửa phòng, ghi chú, nội dung map (người dùng chốt
 * Step 8). Giáo viên dạy thế chỉ xem chi tiết buổi mình dạy (`detail`).
 */
@Injectable()
export class ClassSessionsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  async update(
    ctx: TenantContext,
    actorId: string,
    classroomId: string,
    sessionId: string,
    dto: UpdateClassSessionDto,
  ): Promise<ClassSessionView> {
    await this.dataSource.transaction(async (manager) => {
      const { classroom, session } = await this.lockForEdit(
        manager,
        ctx,
        classroomId,
        sessionId,
      );
      const now = new Date();
      const started = session.startsAt <= now;
      const changes: Partial<ClassSession> = {};
      const fields: SessionField[] = [];
      if (dto.location !== undefined && dto.location !== session.location) {
        changes.location = dto.location;
        fields.push('location');
      }
      if (dto.note !== undefined && dto.note !== session.note) {
        changes.note = dto.note;
        fields.push('note');
      }
      if (dto.startsAt !== undefined || dto.endsAt !== undefined) {
        if (!dto.startsAt || !dto.endsAt) {
          throw new BadRequestException(TIME_PAIR);
        }
        const startsAt = new Date(dto.startsAt);
        const endsAt = new Date(dto.endsAt);
        if (
          startsAt.getTime() !== session.startsAt.getTime() ||
          endsAt.getTime() !== session.endsAt.getTime()
        ) {
          if (started) throw new ConflictException(SESSION_STARTED);
          assertSessionTime(startsAt, endsAt, now);
          if (
            session.kind === ClassSessionKind.REGULAR &&
            (trainingDateOf(startsAt) !== trainingDateOf(session.startsAt) ||
              trainingDateOf(endsAt) !== trainingDateOf(session.startsAt))
          ) {
            throw new BadRequestException(TIME_SAME_DAY);
          }
          Object.assign(changes, {
            startsAt,
            endsAt,
            timeOverridden: session.kind === ClassSessionKind.REGULAR,
            movedWarning: false,
          });
          fields.push('time');
        }
      }
      if (dto.teacherMembershipIds !== undefined) {
        const changed = await this.replaceTeachers(
          manager,
          ctx,
          session,
          dto.teacherMembershipIds,
          started,
        );
        if (changed) {
          changes.customTeachers = dto.teacherMembershipIds !== null;
          changes.movedWarning = false;
          fields.push('teachers');
        }
      }
      if (
        dto.dismissMovedWarning &&
        session.movedWarning &&
        changes.movedWarning === undefined
      ) {
        changes.movedWarning = false;
        fields.push('movedWarning');
      }
      if (fields.length === 0) return;
      await manager.getRepository(ClassSession).update(session.id, changes);
      await writeClassLog(
        manager,
        classroomId,
        actorId,
        ClassLogAction.SESSION_UPDATED,
        { ...sessionLabel(session), sessionFields: fields },
      );
      if (fields.includes('time')) {
        await notifySessionChanged(manager, this.notifications, {
          classroom,
          slug: ctx.slug,
          session: { ...session, ...changes },
          type: NotificationType.SESSIONS_MOVED,
          actorId,
        });
      }
      if (fields.includes('teachers') && dto.teacherMembershipIds?.length) {
        await notifySessionTeachers(manager, this.notifications, {
          classroom,
          slug: ctx.slug,
          session,
          membershipIds: dto.teacherMembershipIds,
          actorId,
        });
      }
    });
    return this.view(ctx, sessionId);
  }

  /** Huỷ buổi chưa diễn ra: giữ số, các buổi sau không dời (V1.1). */
  async cancel(
    ctx: TenantContext,
    actorId: string,
    classroomId: string,
    sessionId: string,
    reason: string | null,
  ): Promise<ClassSessionView> {
    await this.dataSource.transaction(async (manager) => {
      const { classroom, session } = await this.lockForEdit(
        manager,
        ctx,
        classroomId,
        sessionId,
      );
      if (session.startsAt <= new Date()) {
        throw new ConflictException(SESSION_STARTED);
      }
      if (session.status === ClassSessionStatus.CANCELLED) {
        throw new ConflictException(SESSION_ALREADY_CANCELLED);
      }
      await manager.getRepository(ClassSession).update(session.id, {
        status: ClassSessionStatus.CANCELLED,
        cancelReason: reason,
      });
      await writeClassLog(
        manager,
        classroomId,
        actorId,
        ClassLogAction.SESSION_CANCELLED,
        { ...sessionLabel(session), reason },
      );
      await notifySessionChanged(manager, this.notifications, {
        classroom,
        slug: ctx.slug,
        session,
        type: NotificationType.SESSION_CANCELLED,
        actorId,
      });
    });
    return this.view(ctx, sessionId);
  }

  /** Khôi phục buổi đã huỷ nếu chưa diễn ra (V1.1). */
  async restore(
    ctx: TenantContext,
    actorId: string,
    classroomId: string,
    sessionId: string,
  ): Promise<ClassSessionView> {
    await this.dataSource.transaction(async (manager) => {
      const { session } = await this.lockForEdit(
        manager,
        ctx,
        classroomId,
        sessionId,
      );
      if (session.startsAt <= new Date()) {
        throw new ConflictException(SESSION_STARTED);
      }
      if (session.status !== ClassSessionStatus.CANCELLED) {
        throw new ConflictException(SESSION_NOT_CANCELLED);
      }
      await manager.getRepository(ClassSession).update(session.id, {
        status: ClassSessionStatus.SCHEDULED,
        cancelReason: null,
      });
      await writeClassLog(
        manager,
        classroomId,
        actorId,
        ClassLogAction.SESSION_RESTORED,
        sessionLabel(session),
      );
    });
    return this.view(ctx, sessionId);
  }

  /** Buổi bù: ngày cố định, không dời theo lịch, map nội dung được (V1.3). */
  async createMakeup(
    ctx: TenantContext,
    actorId: string,
    classroomId: string,
    dto: CreateMakeupSessionDto,
  ): Promise<ClassSessionView> {
    const id = await this.dataSource.transaction(async (manager) => {
      const classroom = await this.lockClassroom(manager, ctx, classroomId);
      const startsAt = new Date(dto.startsAt);
      const endsAt = new Date(dto.endsAt);
      assertSessionTime(startsAt, endsAt, new Date());
      let target: ClassSession | null = null;
      if (dto.makeupForSessionId) {
        target = await manager.getRepository(ClassSession).findOneBy({
          id: dto.makeupForSessionId,
          classroomId,
          kind: ClassSessionKind.REGULAR,
        });
        if (!target) throw new BadRequestException(MAKEUP_TARGET);
      }
      const teacherIds = dto.teacherMembershipIds ?? null;
      if (teacherIds !== null) {
        await assertTeachers(manager, ctx, teacherIds);
      }
      const repository = manager.getRepository(ClassSession);
      const session = await repository.save(
        repository.create({
          classroomId,
          kind: ClassSessionKind.MAKEUP,
          seq: null,
          startsAt,
          endsAt,
          timeOverridden: false,
          location: dto.location ?? null,
          note: dto.note ?? null,
          status: ClassSessionStatus.SCHEDULED,
          cancelReason: null,
          makeupForSessionId: target?.id ?? null,
          customTeachers: teacherIds !== null,
          movedWarning: false,
          createdBy: actorId,
        }),
      );
      if (teacherIds !== null) {
        await insertTeachers(manager, session.id, teacherIds);
      }
      await writeClassLog(
        manager,
        classroomId,
        actorId,
        ClassLogAction.MAKEUP_ADDED,
        { ...sessionLabel(session), makeupForSeq: target?.seq ?? null },
      );
      await notifySessionChanged(manager, this.notifications, {
        classroom,
        slug: ctx.slug,
        session,
        type: NotificationType.SESSION_MAKEUP_ADDED,
        actorId,
      });
      if (teacherIds !== null && teacherIds.length > 0) {
        await notifySessionTeachers(manager, this.notifications, {
          classroom,
          slug: ctx.slug,
          session,
          membershipIds: teacherIds,
          actorId,
        });
      }
      return session.id;
    });
    return this.view(ctx, id);
  }

  /** Xoá buổi bù chưa diễn ra (buổi thường chỉ huỷ được). */
  async removeMakeup(
    ctx: TenantContext,
    actorId: string,
    classroomId: string,
    sessionId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const { session } = await this.lockForEdit(
        manager,
        ctx,
        classroomId,
        sessionId,
      );
      if (session.kind !== ClassSessionKind.MAKEUP) {
        throw new ConflictException(NOT_MAKEUP);
      }
      if (session.startsAt <= new Date()) {
        throw new ConflictException(SESSION_STARTED);
      }
      await manager.getRepository(ClassSessionLink).delete({ sessionId });
      await manager.getRepository(ClassSessionTeacher).delete({ sessionId });
      await manager.getRepository(ClassSession).delete({ id: sessionId });
      await writeClassLog(
        manager,
        classroomId,
        actorId,
        ClassLogAction.MAKEUP_REMOVED,
        sessionLabel(session),
      );
    });
  }

  /** Thay toàn bộ chương/mục map với buổi (R17); mục đã ẩn không map được. */
  async saveLinks(
    ctx: TenantContext,
    actorId: string,
    classroomId: string,
    sessionId: string,
    dto: SaveSessionLinksDto,
  ): Promise<ClassSessionView> {
    await this.dataSource.transaction(async (manager) => {
      const { session } = await this.lockForEdit(
        manager,
        ctx,
        classroomId,
        sessionId,
      );
      const groupIds = [...new Set(dto.groupIds)];
      const itemIds = [...new Set(dto.itemIds)];
      const [groups, items] = await Promise.all([
        groupIds.length > 0
          ? manager
              .getRepository(ClassGroup)
              .findBy({ id: In(groupIds), classroomId })
          : Promise.resolve([]),
        itemIds.length > 0
          ? manager.getRepository(ClassItem).findBy({
              id: In(itemIds),
              classroomId,
              removedAt: IsNull(),
            })
          : Promise.resolve([]),
      ]);
      if (
        groups.length !== groupIds.length ||
        items.length !== itemIds.length
      ) {
        throw new BadRequestException(LINK_TARGET);
      }
      const repository = manager.getRepository(ClassSessionLink);
      const old = await repository.findBy({ sessionId });
      const key = (
        link: Pick<ClassSessionLink, 'classGroupId' | 'classItemId'>,
      ) =>
        link.classGroupId ? `g:${link.classGroupId}` : `i:${link.classItemId}`;
      const wanted = [
        ...groupIds.map((id) => ({ classGroupId: id, classItemId: null })),
        ...itemIds.map((id) => ({ classGroupId: null, classItemId: id })),
      ];
      const oldKeys = new Set(old.map(key));
      const wantedKeys = new Set(wanted.map(key));
      const added = wanted.filter((link) => !oldKeys.has(key(link)));
      const removed = old.filter((link) => !wantedKeys.has(key(link)));
      if (added.length === 0 && removed.length === 0) return;
      if (removed.length > 0) {
        await repository.delete({ id: In(removed.map((link) => link.id)) });
      }
      if (added.length > 0) {
        await repository.insert(
          added.map((link) => repository.create({ sessionId, ...link })),
        );
      }
      await writeClassLog(
        manager,
        classroomId,
        actorId,
        ClassLogAction.SESSION_LINKS_SAVED,
        sessionLabel(session),
      );
    });
    return this.view(ctx, sessionId);
  }

  /**
   * Chi tiết buổi (`GET t/:slug/sessions/:sid`): Owner/Admin, giáo viên của
   * lớp, hoặc giáo viên của buổi (dạy thế, R14.3) – người khác 403.
   */
  async detail(
    ctx: TenantContext,
    sessionId: string,
  ): Promise<ClassSessionDetail> {
    const manager = this.dataSource.manager;
    const session = await manager
      .getRepository(ClassSession)
      .findOneBy({ id: sessionId });
    const classroom = session
      ? await manager
          .getRepository(Classroom)
          .findOneBy({ id: session.classroomId, tenantId: ctx.tenantId })
      : null;
    if (!session || !classroom) throw new NotFoundException(SESSION_NOT_FOUND);
    const people = await loadSessionPeople(manager, [session]);
    const classTeachers = people.classTeachers.get(classroom.id) ?? [];
    const canOpenClass =
      isClassManager(ctx) || classTeachers.includes(ctx.membershipId);
    const teachesSession = (people.teachers.get(session.id) ?? []).includes(
      ctx.membershipId,
    );
    if (!canOpenClass && !teachesSession) {
      throw new ForbiddenException(NOT_CLASS_TEACHER);
    }
    const students = people.students.get(classroom.id) ?? [];
    const [[view], course, refs] = await Promise.all([
      buildSessionViews(manager, ctx.tenantId, [session], people),
      manager.getRepository(Course).findOneBy({ id: classroom.courseId }),
      loadPersonRefs(manager, ctx.tenantId, [...classTeachers, ...students]),
    ]);
    return {
      ...view!,
      classroom: {
        ...toClassroomRef(classroom),
        location: classroom.location,
        course: toCourseRef(course!),
      },
      classTeachers: personRefs(classTeachers, refs),
      students: personRefs(students, refs),
      canOpenClass,
      canEdit: canOpenClass && !isClassroomClosed(classroom.status),
    };
  }

  private async view(
    ctx: TenantContext,
    sessionId: string,
  ): Promise<ClassSessionView> {
    const manager = this.dataSource.manager;
    const session = await manager
      .getRepository(ClassSession)
      .findOneBy({ id: sessionId });
    if (!session) throw new NotFoundException(SESSION_NOT_FOUND);
    const [view] = await buildSessionViews(manager, ctx.tenantId, [session]);
    return view!;
  }

  /** Khoá lớp (giáo viên của lớp hoặc Owner/Admin, lớp còn mở). */
  private async lockClassroom(
    manager: EntityManager,
    ctx: TenantContext,
    classroomId: string,
  ): Promise<Classroom> {
    const { classroom } = await loadClassroomAccess(
      manager,
      ctx,
      classroomId,
      true,
    );
    assertClassroomOpen(classroom);
    return classroom;
  }

  private async lockForEdit(
    manager: EntityManager,
    ctx: TenantContext,
    classroomId: string,
    sessionId: string,
  ): Promise<{ classroom: Classroom; session: ClassSession }> {
    const classroom = await this.lockClassroom(manager, ctx, classroomId);
    const session = await manager
      .getRepository(ClassSession)
      .findOneBy({ id: sessionId, classroomId });
    if (!session) throw new NotFoundException(SESSION_NOT_FOUND);
    return { classroom, session };
  }

  /**
   * Đổi giáo viên của buổi (R14.2): `null` = theo giáo viên của lớp, danh sách
   * = giáo viên riêng (thành viên có role Teacher). Trả `true` khi có thay đổi.
   */
  private async replaceTeachers(
    manager: EntityManager,
    ctx: TenantContext,
    session: ClassSession,
    teacherIds: string[] | null,
    started: boolean,
  ): Promise<boolean> {
    const repository = manager.getRepository(ClassSessionTeacher);
    const current = session.customTeachers
      ? (await repository.findBy({ sessionId: session.id }))
          .map((row) => row.membershipId)
          .sort()
      : null;
    const next = teacherIds ? [...new Set(teacherIds)].sort() : null;
    if (JSON.stringify(current) === JSON.stringify(next)) return false;
    if (started) throw new ConflictException(SESSION_STARTED);
    if (next !== null) await assertTeachers(manager, ctx, next);
    await repository.delete({ sessionId: session.id });
    if (next !== null) await insertTeachers(manager, session.id, next);
    return true;
  }
}

function assertSessionTime(startsAt: Date, endsAt: Date, now: Date): void {
  if (endsAt <= startsAt) throw new BadRequestException(TIME_ORDER);
  if (endsAt.getTime() - startsAt.getTime() > MAX_SESSION_MS) {
    throw new BadRequestException(TIME_TOO_LONG);
  }
  if (startsAt <= now) throw new BadRequestException(TIME_IN_PAST);
}

async function assertTeachers(
  manager: EntityManager,
  ctx: TenantContext,
  membershipIds: string[],
): Promise<void> {
  if (membershipIds.length === 0) {
    throw new BadRequestException(TEACHERS_REQUIRED);
  }
  await loadEligible(
    manager,
    ctx.tenantId,
    membershipIds,
    TenantRole.TEACHER,
    'Giáo viên',
  );
}

async function insertTeachers(
  manager: EntityManager,
  sessionId: string,
  membershipIds: string[],
): Promise<void> {
  const repository = manager.getRepository(ClassSessionTeacher);
  await repository.insert(
    [...new Set(membershipIds)].map((membershipId) =>
      repository.create({ sessionId, membershipId }),
    ),
  );
}

/** Buổi trong nhật ký: số buổi (buổi bù `null`) + giờ bắt đầu lúc thao tác. */
function sessionLabel(session: ClassSession): {
  seq: number | null;
  sessionAt: string;
} {
  return { seq: session.seq, sessionAt: session.startsAt.toISOString() };
}
