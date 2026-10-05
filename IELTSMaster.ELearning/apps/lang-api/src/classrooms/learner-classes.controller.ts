import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  CalendarFeed,
  LearnerClassDetail,
  LearnerClassItem,
  StartClassItemResult,
} from '@lang/shared';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../common/pipes';
import { TenantCtx, type TenantContext } from '../tenants/tenant-context';
import { TenantGuard } from '../tenants/tenant.guard';
import { CalendarRangeQueryDto } from './dto/class-schedule.dto';
import { LearnerClassesService } from './learner-classes.service';

/**
 * Khu vực học viên trong lớp (req-3 Step 9). Mọi thành viên active gọi được;
 * service chỉ trả lớp mà người gọi còn là học viên (`classroom_students`), lớp
 * khác trả 404.
 */
@Controller('t/:slug/learner')
@UseGuards(TenantGuard)
export class LearnerClassesController {
  constructor(private readonly classes: LearnerClassesService) {}

  @Get('classes')
  list(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
  ): Promise<LearnerClassItem[]> {
    return this.classes.list(ctx, actor.id);
  }

  @Get('classes/:id')
  detail(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<LearnerClassDetail> {
    return this.classes.detail(ctx, actor.id, id);
  }

  @Post('classes/:id/items/:itemId/start')
  @HttpCode(HttpStatus.OK)
  startItem(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('itemId', ParseIdPipe()) itemId: string,
  ): Promise<StartClassItemResult> {
    return this.classes.startItem(ctx, actor.id, id, itemId);
  }

  @Get('schedule')
  schedule(
    @TenantCtx() ctx: TenantContext,
    @Query() query: CalendarRangeQueryDto,
  ): Promise<CalendarFeed> {
    return this.classes.schedule(ctx, query);
  }
}
