import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  EXAM_AUTHOR_ROLES,
  PermissionKey,
  TENANT_MANAGER_ROLES,
  type CalendarFeed,
  type ClassSessionDetail,
} from '@lang/shared';
import { Permissions } from '../auth/decorators';
import { ParseIdPipe } from '../common/pipes';
import {
  TenantCtx,
  TenantRoles,
  type TenantContext,
} from '../tenants/tenant-context';
import { TenantGuard } from '../tenants/tenant.guard';
import { ClassSessionsService } from './class-sessions.service';
import {
  CalendarRangeQueryDto,
  CenterCalendarQueryDto,
} from './dto/class-schedule.dto';
import { ScheduleFeedService } from './schedule-feed.service';

/**
 * Lịch (R16) và chi tiết buổi (R14.3). Teacher xem lịch dạy của mình, lịch
 * khoá học (lớp mình phụ trách) và chi tiết buổi mình dạy; lịch trung tâm chỉ
 * Owner/Admin.
 */
@Controller('t/:slug')
@UseGuards(TenantGuard)
@Permissions(PermissionKey.TENANT_CLASSES_MANAGE)
@TenantRoles(...EXAM_AUTHOR_ROLES)
export class ScheduleController {
  constructor(
    private readonly feeds: ScheduleFeedService,
    private readonly sessions: ClassSessionsService,
  ) {}

  @Get('schedule/mine')
  mine(
    @TenantCtx() ctx: TenantContext,
    @Query() query: CalendarRangeQueryDto,
  ): Promise<CalendarFeed> {
    return this.feeds.mine(ctx, query);
  }

  @Get('schedule/center')
  @Permissions(PermissionKey.TENANT_CLASSES_MANAGE)
  @TenantRoles(...TENANT_MANAGER_ROLES)
  center(
    @TenantCtx() ctx: TenantContext,
    @Query() query: CenterCalendarQueryDto,
  ): Promise<CalendarFeed> {
    return this.feeds.center(ctx, query);
  }

  @Get('courses/:id/sessions')
  courseSessions(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
    @Query() query: CalendarRangeQueryDto,
  ): Promise<CalendarFeed> {
    return this.feeds.course(ctx, id, query);
  }

  @Get('sessions/:sessionId')
  sessionDetail(
    @TenantCtx() ctx: TenantContext,
    @Param('sessionId', ParseIdPipe()) sessionId: string,
  ): Promise<ClassSessionDetail> {
    return this.sessions.detail(ctx, sessionId);
  }
}
