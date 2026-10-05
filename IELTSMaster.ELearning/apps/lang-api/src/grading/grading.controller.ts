import {
  GRADER_ROLES,
  PermissionKey,
  type GradeAnswerResult,
  type GradingAttemptDetail,
  type GradingAttemptList,
  type GradingDelegation,
  type GradingDelegationBox,
} from '@lang/shared';
import { Permissions } from '../auth/decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
  CreateGradingDelegationDto,
  GradeAnswerDto,
  GradingDelegationQueryDto,
  ListGradingAttemptsQueryDto,
} from './dto/grading.dto';
import { GradingDelegationsService } from './grading-delegations.service';
import { GradingService } from './grading.service';

/** Chấm bài Writing/Speaking (Owner/Admin/Teacher, trừ bài của chính mình). */
@Controller('t/:slug/grading')
@UseGuards(TenantGuard)
@Permissions(PermissionKey.EXAMS_GRADE)
@TenantRoles(...GRADER_ROLES)
export class GradingController {
  constructor(
    private readonly grading: GradingService,
    private readonly delegations: GradingDelegationsService,
  ) {}

  /** Hộp "Chuyển giao chấm" của một bài làm. */
  @Get('delegations')
  delegationBox(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Query() query: GradingDelegationQueryDto,
  ): Promise<GradingDelegationBox> {
    return this.delegations.box(ctx, actor.id, query);
  }

  @Post('delegations')
  @HttpCode(HttpStatus.OK)
  delegate(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateGradingDelegationDto,
  ): Promise<GradingDelegation[]> {
    return this.delegations.create(ctx, actor.id, dto);
  }

  @Delete('delegations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDelegation(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<void> {
    return this.delegations.remove(ctx, actor.id, id);
  }

  @Get('attempts')
  list(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Query() query: ListGradingAttemptsQueryDto,
  ): Promise<GradingAttemptList> {
    return this.grading.list(ctx, actor.id, query);
  }

  @Get('attempts/:id')
  detail(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<GradingAttemptDetail> {
    return this.grading.detail(ctx, actor.id, id);
  }

  @Get('attempts/:id/recordings/:answerId/url')
  recordingUrl(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('answerId', ParseIdPipe()) answerId: string,
  ): Promise<{ url: string }> {
    return this.grading.recordingUrl(ctx, actor.id, id, answerId);
  }

  @Put('answers/:answerId')
  grade(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('answerId', ParseIdPipe()) answerId: string,
    @Body() dto: GradeAnswerDto,
  ): Promise<GradeAnswerResult> {
    return this.grading.grade(ctx, actor.id, answerId, dto);
  }
}
