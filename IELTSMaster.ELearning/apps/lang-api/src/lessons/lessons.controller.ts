import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  EXAM_AUTHOR_ROLES,
  PermissionKey,
  type LessonDetail,
  type LessonListItem,
  type ExamUserRef,
  type LessonVersionDetail,
  type LessonVersionList,
} from '@lang/shared';
import { Permissions } from '../auth/decorators';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import type { Paginated } from '../common/pagination';
import { ParseIdPipe, VersionPipe } from '../common/pipes';
import {
  TenantCtx,
  TenantRoles,
  type TenantContext,
} from '../tenants/tenant-context';
import { TenantGuard } from '../tenants/tenant.guard';
import {
  CreateLessonDto,
  ListLessonsQueryDto,
  RestoreLessonVersionDto,
  SaveLessonContentDto,
  UpdateLessonDto,
} from './dto/lesson.dto';
import { LessonContentService } from './lesson-content.service';
import { LessonsService } from './lessons.service';

/**
 * Bài học của tenant cho người soạn (Owner/Admin/Teacher, như đề thi). Xem được
 * mọi bài; quyền sửa (Teacher chỉ bài mình tạo) kiểm trong service.
 */
@Controller('t/:slug/lessons')
@UseGuards(TenantGuard)
@Permissions(PermissionKey.EXAMS_CREATE)
@TenantRoles(...EXAM_AUTHOR_ROLES)
export class LessonsController {
  constructor(
    private readonly lessons: LessonsService,
    private readonly content: LessonContentService,
  ) {}

  @Get()
  list(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Query() query: ListLessonsQueryDto,
  ): Promise<Paginated<LessonListItem>> {
    return this.lessons.list(ctx, actor.id, query);
  }

  /** Khai báo trước `:id` để không bị `ParseIdPipe` bắt. */
  @Get('creators')
  creators(@TenantCtx() ctx: TenantContext): Promise<ExamUserRef[]> {
    return this.lessons.creators(ctx);
  }

  @Post()
  create(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateLessonDto,
  ): Promise<LessonDetail> {
    return this.lessons.create(ctx, actor.id, dto);
  }

  @Get(':id')
  detail(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<LessonDetail> {
    return this.lessons.getDetail(ctx, actor.id, id);
  }

  @Patch(':id')
  update(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: UpdateLessonDto,
  ): Promise<LessonDetail> {
    return this.lessons.update(ctx, actor.id, id, dto);
  }

  @Put(':id/content')
  saveContent(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: SaveLessonContentDto,
  ): Promise<LessonDetail> {
    return this.content.save(ctx, actor.id, id, dto);
  }

  @Get(':id/versions')
  versions(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<LessonVersionList> {
    return this.content.listVersions(ctx, actor.id, id);
  }

  @Get(':id/versions/:version')
  version(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
    @Param('version', VersionPipe()) version: number,
  ): Promise<LessonVersionDetail> {
    return this.content.getVersion(ctx, id, version);
  }

  @Post(':id/versions/:version/restore')
  @HttpCode(HttpStatus.OK)
  restore(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('version', VersionPipe()) version: number,
    @Body() dto: RestoreLessonVersionDto,
  ): Promise<LessonDetail> {
    return this.content.restore(ctx, actor.id, id, version, dto);
  }

  /** Bài đã publish hoặc bài mình sửa được → bản nháp mới của người nhân bản. */
  @Post(':id/clone')
  clone(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<LessonDetail> {
    return this.lessons.clone(ctx, actor.id, id);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  publish(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<LessonDetail> {
    return this.lessons.publish(ctx, actor.id, id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<LessonDetail> {
    return this.lessons.archive(ctx, actor.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<void> {
    return this.lessons.remove(ctx, actor.id, id);
  }
}
