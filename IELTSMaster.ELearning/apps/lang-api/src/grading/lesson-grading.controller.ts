import {
  GRADER_ROLES,
  PermissionKey,
  type LessonGradeAnswerResult,
  type LessonGradingAttemptDetail,
  type LessonGradingAttemptList,
} from '@lang/shared';
import { Permissions } from '../auth/decorators';
import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../common/pipes';
import {
  TenantCtx,
  TenantRoles,
  type TenantContext,
} from '../tenants/tenant-context';
import { TenantGuard } from '../tenants/tenant.guard';
import {
  GradeAnswerDto,
  ListLessonGradingAttemptsQueryDto,
} from './dto/grading.dto';
import { LessonGradingService } from './lesson-grading.service';

/** Chấm Writing/Speaking trong bài học (cùng quyền với đề thi). */
@Controller('t/:slug/grading')
@UseGuards(TenantGuard)
@Permissions(PermissionKey.EXAMS_GRADE)
@TenantRoles(...GRADER_ROLES)
export class LessonGradingController {
  constructor(private readonly grading: LessonGradingService) {}

  @Get('lesson-attempts')
  list(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Query() query: ListLessonGradingAttemptsQueryDto,
  ): Promise<LessonGradingAttemptList> {
    return this.grading.list(ctx, actor.id, query);
  }

  @Get('lesson-attempts/:id')
  detail(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<LessonGradingAttemptDetail> {
    return this.grading.detail(ctx, actor.id, id);
  }

  @Get('lesson-attempts/:id/recordings/:answerId/url')
  recordingUrl(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('answerId', ParseIdPipe()) answerId: string,
  ): Promise<{ url: string }> {
    return this.grading.recordingUrl(ctx, actor.id, id, answerId);
  }

  @Put('lesson-answers/:answerId')
  grade(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('answerId', ParseIdPipe()) answerId: string,
    @Body() dto: GradeAnswerDto,
  ): Promise<LessonGradeAnswerResult> {
    return this.grading.grade(ctx, actor.id, answerId, dto);
  }
}
