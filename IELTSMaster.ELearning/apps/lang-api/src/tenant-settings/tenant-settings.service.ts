import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClassLogAction,
  HOLIDAY_MAX_DAYS,
  calendarDaysBetween,
  isClassroomClosed,
  type DateRange,
  type HolidayImpact,
  type HolidayView,
  type TenantTrainingSettings,
} from '@lang/shared';
import { DataSource, type EntityManager } from 'typeorm';
import { writeClassLog } from '../classrooms/class-logs';
import { notifySessionsMoved } from '../classrooms/class-notifications';
import {
  computeSchedule,
  loadHolidays,
  loadRegularSessions,
  movedCount,
  recomputeClassroom,
  scheduleParamsOf,
} from '../classrooms/class-schedule';
import { findClassroom } from '../classrooms/classroom-access';
import { Classroom } from '../classrooms/classroom.entity';
import { toClassroomRef } from '../classrooms/classroom.mapper';
import { NotificationsService } from '../notifications/notifications.service';
import type { TenantContext } from '../tenants/tenant-context';
import { Tenant } from '../tenants/tenant.entity';
import type {
  HolidayDto,
  HolidayImpactDto,
  UpdateTenantSettingsDto,
} from './dto/tenant-settings.dto';
import { TenantHoliday } from './tenant-holiday.entity';

const HOLIDAY_NOT_FOUND = 'Không tìm thấy ngày nghỉ';
const HOLIDAY_ORDER = 'Đến ngày phải cùng hoặc sau từ ngày';
const HOLIDAY_TOO_LONG = `Một ngày nghỉ dài tối đa ${HOLIDAY_MAX_DAYS} ngày`;

type HolidayAction = 'created' | 'updated' | 'removed';

function toHolidayView(row: TenantHoliday): HolidayView {
  return {
    id: row.id,
    name: row.name,
    startDate: row.startDate,
    endDate: row.endDate,
  };
}

function assertRange(range: DateRange): void {
  const days = calendarDaysBetween(range.startDate, range.endDate);
  if (days < 0) throw new BadRequestException(HOLIDAY_ORDER);
  if (days >= HOLIDAY_MAX_DAYS) throw new BadRequestException(HOLIDAY_TOO_LONG);
}

/**
 * Cài đặt trung tâm (Owner/Admin): tham số chuyên cần (R11.1–2) và ngày nghỉ
 * (T4, U5). Thêm/sửa/xoá ngày nghỉ tính lại lịch mọi lớp đang mở có "Áp dụng
 * ngày nghỉ của trung tâm" (U6); buổi đã diễn ra, buổi bù không dời.
 */
@Injectable()
export class TenantSettingsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  async get(ctx: TenantContext): Promise<TenantTrainingSettings> {
    const manager = this.dataSource.manager;
    const tenant = (await manager
      .getRepository(Tenant)
      .findOneBy({ id: ctx.tenantId }))!;
    const holidays = await loadHolidays(manager, ctx.tenantId);
    return {
      lateWeight: tenant.lateWeight,
      warningThreshold: tenant.warningThreshold,
      // Mới nhất trước.
      holidays: holidays.reverse().map(toHolidayView),
    };
  }

  async update(
    ctx: TenantContext,
    dto: UpdateTenantSettingsDto,
  ): Promise<TenantTrainingSettings> {
    const changes: Partial<Tenant> = {};
    if (dto.lateWeight !== undefined) changes.lateWeight = dto.lateWeight;
    if (dto.warningThreshold !== undefined) {
      changes.warningThreshold = dto.warningThreshold;
    }
    if (Object.keys(changes).length > 0) {
      await this.dataSource.manager
        .getRepository(Tenant)
        .update(ctx.tenantId, changes);
    }
    return this.get(ctx);
  }

  async createHoliday(
    ctx: TenantContext,
    actorId: string,
    dto: HolidayDto,
  ): Promise<TenantTrainingSettings> {
    assertRange(dto);
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(TenantHoliday);
      await repository.insert(
        repository.create({
          tenantId: ctx.tenantId,
          name: dto.name,
          startDate: dto.startDate,
          endDate: dto.endDate,
          createdBy: actorId,
        }),
      );
      await this.recomputeTenant(manager, ctx, actorId, dto.name, 'created');
    });
    return this.get(ctx);
  }

  async updateHoliday(
    ctx: TenantContext,
    actorId: string,
    id: string,
    dto: HolidayDto,
  ): Promise<TenantTrainingSettings> {
    assertRange(dto);
    await this.dataSource.transaction(async (manager) => {
      const holiday = await this.findHoliday(manager, ctx, id);
      await manager.getRepository(TenantHoliday).update(holiday.id, {
        name: dto.name,
        startDate: dto.startDate,
        endDate: dto.endDate,
      });
      const datesChanged =
        holiday.startDate !== dto.startDate || holiday.endDate !== dto.endDate;
      if (datesChanged) {
        await this.recomputeTenant(manager, ctx, actorId, dto.name, 'updated');
      }
    });
    return this.get(ctx);
  }

  async removeHoliday(
    ctx: TenantContext,
    actorId: string,
    id: string,
  ): Promise<TenantTrainingSettings> {
    await this.dataSource.transaction(async (manager) => {
      const holiday = await this.findHoliday(manager, ctx, id);
      await manager.getRepository(TenantHoliday).delete({ id: holiday.id });
      await this.recomputeTenant(
        manager,
        ctx,
        actorId,
        holiday.name,
        'removed',
      );
    });
    return this.get(ctx);
  }

  /**
   * Lớp bị ảnh hưởng nếu thêm/sửa/xoá ngày nghỉ (hộp xác nhận, U5.3): số buổi
   * dời và ngày kết thúc mới. Không ghi gì.
   */
  async impact(
    ctx: TenantContext,
    dto: HolidayImpactDto,
  ): Promise<HolidayImpact> {
    const manager = this.dataSource.manager;
    let holidays: DateRange[] = await loadHolidays(manager, ctx.tenantId);
    if (dto.holidayId) {
      await this.findHoliday(manager, ctx, dto.holidayId);
      holidays = holidays.filter(
        (row) => (row as TenantHoliday).id !== dto.holidayId,
      );
    }
    if (!dto.remove) {
      const range = { startDate: dto.startDate!, endDate: dto.endDate! };
      assertRange(range);
      holidays = [...holidays, range];
    }
    const now = new Date();
    const classes: HolidayImpact['classes'] = [];
    for (const classroom of await this.affectedClassrooms(manager, ctx)) {
      const result = computeSchedule(
        await scheduleParamsOf(manager, classroom),
        await loadRegularSessions(manager, classroom.id),
        holidays,
        now,
      );
      const moved = movedCount(result);
      if (moved === 0 && result.endDate === classroom.endDate) continue;
      classes.push({
        classroom: toClassroomRef(classroom),
        moved,
        previousEndDate: classroom.endDate,
        endDate: result.endDate,
      });
    }
    return { classes };
  }

  private async findHoliday(
    manager: EntityManager,
    ctx: TenantContext,
    id: string,
  ): Promise<TenantHoliday> {
    const holiday = await manager
      .getRepository(TenantHoliday)
      .findOneBy({ id, tenantId: ctx.tenantId });
    if (!holiday) throw new NotFoundException(HOLIDAY_NOT_FOUND);
    return holiday;
  }

  /** Lớp chưa kết thúc/huỷ đang áp dụng ngày nghỉ của trung tâm. */
  private async affectedClassrooms(
    manager: EntityManager,
    ctx: TenantContext,
  ): Promise<Classroom[]> {
    const rows = await manager
      .getRepository(Classroom)
      .findBy({ tenantId: ctx.tenantId, applyTenantHolidays: true });
    return rows
      .filter((row) => !isClassroomClosed(row.status))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Tính lại lịch từng lớp bị ảnh hưởng (khoá dòng lớp theo thứ tự id), ghi
   * nhật ký lớp khi có buổi dời hoặc ngày kết thúc đổi. Danh sách buổi dời để
   * gửi thông báo gộp ở Step 12 (U5.3).
   */
  private async recomputeTenant(
    manager: EntityManager,
    ctx: TenantContext,
    actorId: string,
    holidayName: string,
    action: HolidayAction,
  ): Promise<void> {
    const holidays = await loadHolidays(manager, ctx.tenantId);
    const now = new Date();
    for (const row of await this.affectedClassrooms(manager, ctx)) {
      const classroom = await findClassroom(
        manager,
        ctx.tenantId,
        row.id,
        true,
      );
      if (!classroom.applyTenantHolidays) continue;
      const result = await recomputeClassroom(
        manager,
        classroom,
        holidays,
        now,
        actorId,
      );
      if (!result) continue;
      await notifySessionsMoved(manager, this.notifications, {
        classroom,
        slug: ctx.slug,
        result,
        actorId,
      });
      const moved = movedCount(result);
      if (moved === 0 && result.endDate === classroom.endDate) continue;
      await writeClassLog(
        manager,
        classroom.id,
        actorId,
        ClassLogAction.SCHEDULE_RECOMPUTED,
        {
          holiday: holidayName,
          holidayAction: action,
          moved,
          previousEndDate: classroom.endDate,
          endDate: result.endDate,
        },
      );
    }
  }
}
