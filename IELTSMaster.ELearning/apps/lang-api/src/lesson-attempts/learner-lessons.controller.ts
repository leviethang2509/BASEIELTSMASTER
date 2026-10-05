import {
  RECORDING_MAX_BYTES,
  type LearnerLessonDetail,
  type LearnerLessonList,
  type LessonAttemptView,
  type LessonDraftRecording,
  type LessonSectionViewResult,
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
  SaveAttemptResponsesDto,
  SubmitAttemptSectionDto,
  UploadRecordingDto,
} from '../attempts/dto/attempt.dto';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { ParseIdPipe, QuestionNumberPipe } from '../common/pipes';
import type { UploadedFile as MulterFile } from '../storage/media-file';
import { TenantCtx, type TenantContext } from '../tenants/tenant-context';
import { TenantGuard } from '../tenants/tenant.guard';
import { ListLearnerLessonsQueryDto } from './dto/lesson-attempt.dto';
import { LearnerLessonsService } from './learner-lessons.service';
import { LessonAttemptsService } from './lesson-attempts.service';

/**
 * Học bài học ở khu vực chính (req-3 Step 5). Mọi thành viên active đều dùng
 * được; chỉ thao tác trên lượt học của chính mình.
 */
@Controller('t/:slug/learner')
@UseGuards(TenantGuard)
export class LearnerLessonsController {
  constructor(
    private readonly lessons: LearnerLessonsService,
    private readonly attempts: LessonAttemptsService,
  ) {}

  @Get('lessons')
  listLessons(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Query() query: ListLearnerLessonsQueryDto,
  ): Promise<LearnerLessonList> {
    return this.lessons.list(ctx, actor.id, query);
  }

  @Get('lessons/:id')
  lessonDetail(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<LearnerLessonDetail> {
    return this.lessons.detail(ctx, actor.id, id);
  }

  /** Mở lượt học của version hiện tại (đã có thì trả lượt đó). */
  @Post('lessons/:id/attempts')
  @HttpCode(HttpStatus.OK)
  startAttempt(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<LessonAttemptView> {
    return this.attempts.start(ctx, actor.id, id);
  }

  @Get('lesson-attempts/:id')
  attempt(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<LessonAttemptView> {
    return this.attempts.get(ctx, actor.id, id);
  }

  @Put('lesson-attempts/:id/sections/:sectionId/view')
  viewSection(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('sectionId', ParseIdPipe()) sectionId: string,
  ): Promise<LessonSectionViewResult> {
    return this.attempts.view(ctx, actor.id, id, sectionId);
  }

  @Put('lesson-attempts/:id/sections/:sectionId/responses')
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

  @Post('lesson-attempts/:id/sections/:sectionId/submit')
  @HttpCode(HttpStatus.OK)
  submitSection(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('sectionId', ParseIdPipe()) sectionId: string,
    @Body() dto: SubmitAttemptSectionDto,
  ): Promise<LessonAttemptView> {
    return this.attempts.submit(ctx, actor.id, id, sectionId, dto.responses);
  }

  @Post('lesson-attempts/:id/sections/:sectionId/retry')
  @HttpCode(HttpStatus.OK)
  retrySection(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('sectionId', ParseIdPipe()) sectionId: string,
  ): Promise<LessonAttemptView> {
    return this.attempts.retry(ctx, actor.id, id, sectionId);
  }

  @Post('lesson-attempts/:id/recordings')
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
  ): Promise<LessonDraftRecording> {
    return this.attempts.uploadRecording(
      ctx,
      actor.id,
      id,
      dto.sectionId,
      dto.number,
      file,
    );
  }

  /** Ghi âm của lần đang làm. */
  @Get('lesson-attempts/:id/sections/:sectionId/recordings/:number/url')
  draftRecordingUrl(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('sectionId', ParseIdPipe()) sectionId: string,
    @Param('number', QuestionNumberPipe()) number: number,
  ): Promise<{ url: string }> {
    return this.attempts.draftRecordingUrl(
      ctx,
      actor.id,
      id,
      sectionId,
      number,
    );
  }

  /** Ghi âm đã nộp (lần nộp gần nhất). */
  @Get('lesson-attempts/:id/answers/:answerId/recording-url')
  answerRecordingUrl(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('answerId', ParseIdPipe()) answerId: string,
  ): Promise<{ url: string }> {
    return this.attempts.answerRecordingUrl(ctx, actor.id, id, answerId);
  }
}
