import {
  RECORDING_MAX_BYTES,
  type AttemptRecording,
  type AttemptResult,
  type AttemptView,
  type LearnerAttemptItem,
  type LearnerExamDetail,
  type LearnerExamList,
  type Paginated,
  type SaveAttemptResponsesResult,
} from '@lang/shared';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../common/pipes';
import type { UploadedFile as MulterFile } from '../storage/media-file';
import { TenantCtx, type TenantContext } from '../tenants/tenant-context';
import { TenantGuard } from '../tenants/tenant.guard';
import { AttemptsService } from './attempts.service';
import {
  ListLearnerExamsQueryDto,
  ListMyAttemptsQueryDto,
  SaveAttemptResponsesDto,
  SubmitAttemptSectionDto,
  UploadRecordingDto,
} from './dto/attempt.dto';
import { LearnerExamsService } from './learner-exams.service';

/**
 * Khu vực chính của tenant: xem đề đang publish, làm bài và xem kết quả. Mọi
 * thành viên active đều dùng được (không giới hạn role); chỉ thao tác trên
 * lượt làm của chính mình.
 */
@Controller('t/:slug/learner')
@UseGuards(TenantGuard)
export class LearnerController {
  constructor(
    private readonly exams: LearnerExamsService,
    private readonly attempts: AttemptsService,
  ) {}

  @Get('exams')
  listExams(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Query() query: ListLearnerExamsQueryDto,
  ): Promise<LearnerExamList> {
    return this.exams.list(ctx, actor.id, query);
  }

  @Get('exams/:id')
  examDetail(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<LearnerExamDetail> {
    return this.exams.detail(ctx, actor.id, id);
  }

  @Post('exams/:id/attempts')
  startAttempt(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<AttemptView> {
    return this.attempts.create(ctx, actor.id, id);
  }

  @Get('attempts')
  myAttempts(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Query() query: ListMyAttemptsQueryDto,
  ): Promise<Paginated<LearnerAttemptItem>> {
    return this.exams.myAttempts(ctx, actor.id, query);
  }

  @Get('attempts/:id')
  attempt(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<AttemptView> {
    return this.attempts.get(ctx, actor.id, id);
  }

  @Post('attempts/:id/sections/:sectionId/start')
  @HttpCode(HttpStatus.OK)
  startSection(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('sectionId', ParseIdPipe()) sectionId: string,
  ): Promise<AttemptView> {
    return this.attempts.start(ctx, actor.id, id, sectionId);
  }

  @Put('attempts/:id/sections/:sectionId/responses')
  saveResponses(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('sectionId', ParseIdPipe()) sectionId: string,
    @Body() dto: SaveAttemptResponsesDto,
  ): Promise<SaveAttemptResponsesResult> {
    return this.attempts.saveResponses(
      ctx,
      actor.id,
      id,
      sectionId,
      dto.responses,
    );
  }

  @Post('attempts/:id/sections/:sectionId/submit')
  @HttpCode(HttpStatus.OK)
  submitSection(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('sectionId', ParseIdPipe()) sectionId: string,
    @Body() dto: SubmitAttemptSectionDto,
  ): Promise<AttemptView> {
    return this.attempts.submitSection(
      ctx,
      actor.id,
      id,
      sectionId,
      dto.responses,
    );
  }

  @Post('attempts/:id/finish')
  @HttpCode(HttpStatus.OK)
  finish(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<AttemptView> {
    return this.attempts.finish(ctx, actor.id, id);
  }

  @Post('attempts/:id/recordings')
  @UseInterceptors(
    // Nới giới hạn multer để quá cỡ vẫn nhận message tiếng Việt từ service.
    FileInterceptor('file', { limits: { fileSize: RECORDING_MAX_BYTES + 1 } }),
  )
  uploadRecording(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: UploadRecordingDto,
    @UploadedFile() file: MulterFile | undefined,
  ): Promise<AttemptRecording> {
    return this.attempts.uploadRecording(
      ctx,
      actor.id,
      id,
      dto.sectionId,
      dto.number,
      file,
    );
  }

  @Get('attempts/:id/recordings/:answerId/url')
  recordingUrl(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('answerId', ParseIdPipe()) answerId: string,
  ): Promise<{ url: string }> {
    return this.attempts.recordingUrl(ctx, actor.id, id, answerId);
  }

  @Get('attempts/:id/result')
  result(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<AttemptResult> {
    return this.attempts.result(ctx, actor.id, id);
  }
}
