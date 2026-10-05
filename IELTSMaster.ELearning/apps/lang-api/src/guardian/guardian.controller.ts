import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  TenantRole,
  type CalendarFeed,
  type ChildClassDetail,
  type ChildOverview,
  type GuardianChild,
} from '@lang/shared';
import { ParseIdPipe } from '../common/pipes';
import { CalendarRangeQueryDto } from '../classrooms/dto/class-schedule.dto';
import {
  TenantCtx,
  TenantRoles,
  type TenantContext,
} from '../tenants/tenant-context';
import { TenantGuard } from '../tenants/tenant.guard';
import { GuardianService } from './guardian.service';

/**
 * "Con của tôi" (req-3 Step 13, R19): chỉ vai trò Phụ huynh – Owner/Admin và
 * giáo viên xem học viên ở dashboard lớp, không qua đây (plan mục 5). Service
 * còn kiểm liên kết `student_guardians` nên phụ huynh chỉ thấy con của mình.
 */
@Controller('t/:slug/children')
@UseGuards(TenantGuard)
@TenantRoles(TenantRole.PARENT)
export class GuardianController {
  constructor(private readonly guardian: GuardianService) {}

  @Get()
  list(@TenantCtx() ctx: TenantContext): Promise<GuardianChild[]> {
    return this.guardian.list(ctx);
  }

  @Get(':membershipId')
  overview(
    @TenantCtx() ctx: TenantContext,
    @Param('membershipId', ParseIdPipe()) membershipId: string,
  ): Promise<ChildOverview> {
    return this.guardian.overview(ctx, membershipId);
  }

  @Get(':membershipId/classes/:classId')
  classDetail(
    @TenantCtx() ctx: TenantContext,
    @Param('membershipId', ParseIdPipe()) membershipId: string,
    @Param('classId', ParseIdPipe()) classId: string,
  ): Promise<ChildClassDetail> {
    return this.guardian.classDetail(ctx, membershipId, classId);
  }

  @Get(':membershipId/schedule')
  schedule(
    @TenantCtx() ctx: TenantContext,
    @Param('membershipId', ParseIdPipe()) membershipId: string,
    @Query() query: CalendarRangeQueryDto,
  ): Promise<CalendarFeed> {
    return this.guardian.schedule(ctx, membershipId, query);
  }
}
