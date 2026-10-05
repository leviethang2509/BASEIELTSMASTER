import {
  ClassSessionKind,
  ClassSessionStatus,
  compareSlots,
  isClassroomClosed,
  recomputeSchedule,
  type DateRange,
  type RecomputeScheduleResult,
  type ScheduleChangeSummary,
  type ScheduleSlot,
} from '@lang/shared';
import { In, type EntityManager } from 'typeorm';
import { TenantHoliday } from '../tenant-settings/tenant-holiday.entity';
import { ClassScheduleSlot } from './class-schedule-slot.entity';
import { ClassSessionLink } from './class-session-link.entity';
import { ClassSessionTeacher } from './class-session-teacher.entity';
import { ClassSession } from './class-session.entity';
import { Classroom } from './classroom.entity';

/** Tham số thời khoá biểu của lớp (lưu ở `classrooms` + `class_schedule_slots`). */
export interface ScheduleParams {
  startDate: string;
  plannedSessions: number;
  applyTenantHolidays: boolean;
  slots: ScheduleSlot[];
}

/** Ngày nghỉ của trung tâm, cũ nhất trước. */
export function loadHolidays(
  manager: EntityManager,
  tenantId: string,
): Promise<TenantHoliday[]> {
  return manager
    .getRepository(TenantHoliday)
    .findBy({ tenantId })
    .then((rows) =>
      rows.sort(
        (a, b) =>
          a.startDate.localeCompare(b.startDate) ||
          a.endDate.localeCompare(b.endDate),
      ),
    );
}

export async function loadSlots(
  manager: EntityManager,
  classroomId: string,
): Promise<ScheduleSlot[]> {
  const rows = await manager
    .getRepository(ClassScheduleSlot)
    .findBy({ classroomId });
  return rows
    .map(({ weekday, startTime, endTime }) => ({
      weekday,
      startTime,
      endTime,
    }))
    .sort(compareSlots);
}

export async function scheduleParamsOf(
  manager: EntityManager,
  classroom: Classroom,
): Promise<ScheduleParams> {
  return {
    startDate: classroom.startDate,
    plannedSessions: classroom.plannedSessions,
    applyTenantHolidays: classroom.applyTenantHolidays,
    slots: await loadSlots(manager, classroom.id),
  };
}

/** Buổi thường của lớp theo số buổi. */
export async function loadRegularSessions(
  manager: EntityManager,
  classroomId: string,
): Promise<ClassSession[]> {
  const rows = await manager
    .getRepository(ClassSession)
    .findBy({ classroomId, kind: ClassSessionKind.REGULAR });
  return rows.sort((a, b) => a.seq! - b.seq!);
}

/** Tính lại lịch với tham số cho trước, không ghi (xem trước). */
export function computeSchedule(
  params: ScheduleParams,
  regular: ClassSession[],
  holidays: readonly DateRange[],
  now: Date,
): RecomputeScheduleResult {
  return recomputeSchedule({
    startDate: params.startDate,
    plannedSessions: params.plannedSessions,
    slots: params.slots,
    holidays: params.applyTenantHolidays ? holidays : [],
    sessions: regular.map((session) => ({
      id: session.id,
      seq: session.seq!,
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
      timeOverridden: session.timeOverridden,
      customTeachers: session.customTeachers,
      movedWarning: session.movedWarning,
    })),
    now,
  });
}

/**
 * Ghi kết quả tính lại: dời buổi, tạo buổi thiếu, xoá buổi cuối thừa (kèm map
 * nội dung, giáo viên riêng), cập nhật `end_date`. Chạy trong transaction đã
 * khoá dòng lớp.
 */
export async function applySchedule(
  manager: EntityManager,
  classroom: Classroom,
  result: RecomputeScheduleResult,
  actorId: string | null,
): Promise<void> {
  const sessions = manager.getRepository(ClassSession);
  for (const change of result.changed) {
    await sessions.update(change.id, {
      startsAt: new Date(change.startsAt),
      endsAt: new Date(change.endsAt),
      timeOverridden: false,
      movedWarning: change.movedWarning,
    });
  }
  if (result.removed.length > 0) {
    const ids = result.removed.map((row) => row.id);
    await manager
      .getRepository(ClassSessionLink)
      .delete({ sessionId: In(ids) });
    await manager
      .getRepository(ClassSessionTeacher)
      .delete({ sessionId: In(ids) });
    await sessions.update(
      { makeupForSessionId: In(ids) },
      { makeupForSessionId: null },
    );
    await sessions.delete({ id: In(ids) });
  }
  if (result.created.length > 0) {
    await sessions.insert(
      result.created.map((row) =>
        sessions.create({
          classroomId: classroom.id,
          kind: ClassSessionKind.REGULAR,
          seq: row.seq,
          startsAt: new Date(row.startsAt),
          endsAt: new Date(row.endsAt),
          timeOverridden: false,
          location: null,
          note: null,
          status: ClassSessionStatus.SCHEDULED,
          cancelReason: null,
          makeupForSessionId: null,
          customTeachers: false,
          movedWarning: false,
          createdBy: actorId,
        }),
      ),
    );
  }
  if (result.endDate !== classroom.endDate) {
    await manager
      .getRepository(Classroom)
      .update(classroom.id, { endDate: result.endDate });
  }
}

/**
 * Tính lại và ghi lịch của lớp theo tham số đang lưu (khi ngày nghỉ đổi, lớp
 * mở lại). Lớp đã kết thúc/huỷ không dời gì (U3.4) → `null`.
 */
export async function recomputeClassroom(
  manager: EntityManager,
  classroom: Classroom,
  holidays: readonly DateRange[],
  now: Date,
  actorId: string | null,
): Promise<RecomputeScheduleResult | null> {
  if (isClassroomClosed(classroom.status)) return null;
  const params = await scheduleParamsOf(manager, classroom);
  const regular = await loadRegularSessions(manager, classroom.id);
  const result = computeSchedule(params, regular, holidays, now);
  await applySchedule(manager, classroom, result, actorId);
  return result;
}

/** Tóm tắt thay đổi cho hộp xác nhận: buổi dời, buổi bị xoá kèm số nội dung map. */
export async function summarizeSchedule(
  manager: EntityManager,
  classroom: Classroom,
  result: RecomputeScheduleResult,
): Promise<ScheduleChangeSummary> {
  const removedIds = result.removed.map((row) => row.id);
  const links =
    removedIds.length > 0
      ? await manager
          .getRepository(ClassSessionLink)
          .findBy({ sessionId: In(removedIds) })
      : [];
  return {
    heldCount: result.heldCount,
    created: result.created.length,
    moved: result.changed.map((row) => ({
      seq: row.seq,
      fromStartsAt: row.fromStartsAt,
      startsAt: row.startsAt,
      dateChanged: row.dateChanged,
      movedWarning: row.movedWarning,
    })),
    removed: result.removed.map((row) => ({
      seq: row.seq,
      startsAt: row.startsAt,
      linkCount: links.filter((link) => link.sessionId === row.id).length,
    })),
    previousEndDate: classroom.endDate,
    endDate: result.endDate,
  };
}

/** Số buổi đổi ngày (dời), dùng cho nhật ký và thông báo gộp (U5.3). */
export function movedCount(result: RecomputeScheduleResult): number {
  return result.changed.filter((row) => row.dateChanged).length;
}
