import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ClassLogAction,
  ClassSessionStatus,
  compareSlots,
  heldSessionCount,
  isClassroomClosed,
  trainingDateOf,
  validateScheduleSlots,
  type ClassScheduleView,
  type MemberScheduleConflicts,
  type RecomputeScheduleResult,
  type ScheduleChangeSummary,
  type ScheduleSlot,
  type ScheduleSlotError,
} from '@lang/shared';
import { DataSource, MoreThan, type EntityManager } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import type { TenantContext } from '../tenants/tenant-context';
import { loadMembers } from './class-members.service';
import { notifySessionsMoved } from './class-notifications';
import { writeClassLog } from './class-logs';
import {
  applySchedule,
  computeSchedule,
  loadHolidays,
  loadRegularSessions,
  loadSlots,
  movedCount,
  summarizeSchedule,
  type ScheduleParams,
} from './class-schedule';
import { ClassScheduleSlot } from './class-schedule-slot.entity';
import { ClassSession } from './class-session.entity';
import {
  assertClassroomOpen,
  findClassroom,
  loadClassroomAccess,
} from './classroom-access';
import { Classroom } from './classroom.entity';
import type { SaveClassScheduleDto } from './dto/class-schedule.dto';
import { buildSessionViews, loadConflicts } from './session-data';

const SLOT_ERRORS: Record<ScheduleSlotError, string> = {
  weekday: 'Thứ trong tuần không hợp lệ',
  time: 'Giờ không hợp lệ (HH:mm)',
  order: 'Giờ kết thúc phải sau giờ bắt đầu',
  overlap: 'Các buổi trong cùng một ngày không được chồng giờ nhau',
};

/**
 * Thời khoá biểu lớp (U1, U5, plan 4.6): Owner/Admin sửa lịch lặp, ngày bắt
 * đầu, số buổi, "Áp dụng ngày nghỉ" (controller giới hạn role); lưu là tính
 * lại ngày giờ các buổi tương lai. Giáo viên của lớp xem.
 */
@Injectable()
export class ClassScheduleService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  async get(
    ctx: TenantContext,
    classroomId: string,
  ): Promise<ClassScheduleView> {
    const manager = this.dataSource.manager;
    const access = await loadClassroomAccess(manager, ctx, classroomId);
    const { classroom } = access;
    const [slots, sessions, holidays] = await Promise.all([
      loadSlots(manager, classroomId),
      manager.getRepository(ClassSession).findBy({ classroomId }),
      loadHolidays(manager, ctx.tenantId),
    ]);
    const views = await buildSessionViews(manager, ctx.tenantId, sessions);
    const regular = views.filter((row) => row.seq !== null);
    const lastDate = [
      ...(classroom.endDate ? [classroom.endDate] : []),
      ...views.map((row) => trainingDateOf(row.startsAt)),
    ]
      .sort()
      .pop();
    const open = !isClassroomClosed(classroom.status);
    return {
      classroomId,
      startDate: classroom.startDate,
      plannedSessions: classroom.plannedSessions,
      endDate: classroom.endDate,
      applyTenantHolidays: classroom.applyTenantHolidays,
      location: classroom.location,
      slots,
      sessions: views,
      // Ngày nghỉ trong khoảng thời gian của lớp (hiện màu xám trên lịch).
      holidays: holidays
        .filter(
          (row) =>
            row.endDate >= classroom.startDate &&
            (!lastDate || row.startDate <= lastDate),
        )
        .map(({ id, name, startDate, endDate }) => ({
          id,
          name,
          startDate,
          endDate,
        })),
      heldCount: heldSessionCount(
        regular.map((row) => ({ seq: row.seq!, startsAt: row.startsAt })),
        new Date(),
      ),
      canManage: access.canManage && open,
      canEditSessions: open,
    };
  }

  /** Xem trước thay đổi của lịch trước khi lưu (hộp xác nhận, giả định 6). */
  async preview(
    ctx: TenantContext,
    classroomId: string,
    dto: SaveClassScheduleDto,
  ): Promise<ScheduleChangeSummary> {
    const manager = this.dataSource.manager;
    const classroom = await findClassroom(manager, ctx.tenantId, classroomId);
    assertClassroomOpen(classroom);
    const { result } = await this.compute(manager, classroom, dto, new Date());
    return summarizeSchedule(manager, classroom, result);
  }

  async save(
    ctx: TenantContext,
    actorId: string,
    classroomId: string,
    dto: SaveClassScheduleDto,
  ): Promise<ClassScheduleView> {
    await this.dataSource.transaction(async (manager) => {
      const classroom = await findClassroom(
        manager,
        ctx.tenantId,
        classroomId,
        true,
      );
      assertClassroomOpen(classroom);
      const { params, result } = await this.compute(
        manager,
        classroom,
        dto,
        new Date(),
      );
      const oldSlots = await loadSlots(manager, classroomId);
      const slotsChanged =
        JSON.stringify(oldSlots) !== JSON.stringify(params.slots);
      if (slotsChanged) {
        const repository = manager.getRepository(ClassScheduleSlot);
        await repository.delete({ classroomId });
        await repository.insert(
          params.slots.map((slot) =>
            repository.create({ classroomId, ...slot }),
          ),
        );
      }
      const fields = (
        ['startDate', 'plannedSessions', 'applyTenantHolidays'] as const
      ).filter((field) => classroom[field] !== params[field]);
      if (fields.length > 0) {
        await manager.getRepository(Classroom).update(classroomId, {
          startDate: params.startDate,
          plannedSessions: params.plannedSessions,
          applyTenantHolidays: params.applyTenantHolidays,
          updatedBy: actorId,
        });
      }
      await applySchedule(manager, classroom, result, actorId);
      await notifySessionsMoved(manager, this.notifications, {
        classroom,
        slug: ctx.slug,
        result,
        actorId,
      });
      const scheduleChanged =
        result.created.length + result.changed.length + result.removed.length >
        0;
      if (!slotsChanged && fields.length === 0 && !scheduleChanged) return;
      await writeClassLog(
        manager,
        classroomId,
        actorId,
        ClassLogAction.SCHEDULE_SAVED,
        {
          fields: [...fields, ...(slotsChanged ? ['slots'] : [])],
          moved: movedCount(result),
          createdSessions: result.created.length,
          removedSessions: result.removed.length,
          previousEndDate: classroom.endDate,
          endDate: result.endDate,
        },
      );
    });
    return this.get(ctx, classroomId);
  }

  /**
   * Buổi chưa diễn ra của lớp trùng giờ với buổi ở lớp khác của người sắp thêm
   * (R15: cảnh báo đỏ, không chặn). Chỉ trả người có trùng.
   */
  async memberConflicts(
    ctx: TenantContext,
    classroomId: string,
    membershipIds: string[],
  ): Promise<MemberScheduleConflicts[]> {
    const manager = this.dataSource.manager;
    await findClassroom(manager, ctx.tenantId, classroomId);
    const sessions = await manager.getRepository(ClassSession).findBy({
      classroomId,
      status: ClassSessionStatus.SCHEDULED,
      endsAt: MoreThan(new Date()),
    });
    if (sessions.length === 0) return [];
    const members = await loadMembers(manager, ctx.tenantId, membershipIds);
    const result: MemberScheduleConflicts[] = [];
    for (const membershipId of [...new Set(membershipIds)]) {
      const member = members.get(membershipId);
      if (!member) continue;
      // Xét riêng người sắp thêm ở mọi buổi của lớp.
      const conflicts = await loadConflicts(manager, ctx.tenantId, sessions, {
        teachers: new Map(sessions.map((row) => [row.id, [membershipId]])),
        classTeachers: new Map(),
        students: new Map(),
      });
      if (conflicts.size === 0) continue;
      result.push({
        membershipId,
        fullName: member.user.fullName,
        sessions: sessions
          .filter((row) => conflicts.has(row.id))
          .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
          .map((row) => ({
            sessionId: row.id,
            kind: row.kind,
            seq: row.seq,
            startsAt: row.startsAt.toISOString(),
            endsAt: row.endsAt.toISOString(),
            conflicts: conflicts.get(row.id)!,
          })),
      });
    }
    return result;
  }

  private async compute(
    manager: EntityManager,
    classroom: Classroom,
    dto: SaveClassScheduleDto,
    now: Date,
  ): Promise<{ params: ScheduleParams; result: RecomputeScheduleResult }> {
    const slots: ScheduleSlot[] = dto.slots.map(
      ({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime }),
    );
    const error = validateScheduleSlots(slots);
    if (error) throw new BadRequestException(SLOT_ERRORS[error]);
    const params: ScheduleParams = {
      startDate: dto.startDate,
      plannedSessions: dto.plannedSessions,
      applyTenantHolidays: dto.applyTenantHolidays,
      slots: [...slots].sort(compareSlots),
    };
    const [regular, holidays] = await Promise.all([
      loadRegularSessions(manager, classroom.id),
      loadHolidays(manager, classroom.tenantId),
    ]);
    const result = computeSchedule(params, regular, holidays, now);
    if (params.plannedSessions < result.heldCount) {
      throw new BadRequestException(
        `Lớp đã học ${result.heldCount} buổi, số buổi không được nhỏ hơn ${result.heldCount}`,
      );
    }
    return { params, result };
  }
}
