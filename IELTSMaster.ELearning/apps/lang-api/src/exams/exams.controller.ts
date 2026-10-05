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
  type ExamDetail,
  type ExamListItem,
  type ExamUserRef,
  type ExamVersionDetail,
  type ExamVersionList,
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
  CreateExamDto,
  ListExamsQueryDto,
  RestoreExamVersionDto,
  SaveExamContentDto,
  UpdateExamDto,
} from './dto/exam.dto';
import { ExamContentService } from './exam-content.service';
import { ExamsService } from './exams.service';

/**
 * Đề thi của tenant cho người soạn đề (Owner/Admin/Teacher). Xem được mọi đề;
 * quyền sửa (Teacher chỉ đề mình tạo) kiểm trong service.
 */
@Controller('t/:slug/exams')
@UseGuards(TenantGuard)
@Permissions(PermissionKey.EXAMS_CREATE)
@TenantRoles(...EXAM_AUTHOR_ROLES)
export class ExamsController {
  constructor(
    private readonly exams: ExamsService,
    private readonly content: ExamContentService,
  ) {}

  @Get()
  list(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Query() query: ListExamsQueryDto,
  ): Promise<Paginated<ExamListItem>> {
    return this.exams.list(ctx, actor.id, query);
  }

  /** Khai báo trước `:id` để không bị `ParseIdPipe` bắt. */
  @Get('creators')
  creators(@TenantCtx() ctx: TenantContext): Promise<ExamUserRef[]> {
    return this.exams.creators(ctx);
  }

  @Post()
  create(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateExamDto,
  ): Promise<ExamDetail> {
    return this.exams.create(ctx, actor.id, dto);
  }

  @Get(':id')
  detail(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<ExamDetail> {
    return this.exams.getDetail(ctx, actor.id, id);
  }

  @Patch(':id')
  update(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: UpdateExamDto,
  ): Promise<ExamDetail> {
    return this.exams.update(ctx, actor.id, id, dto);
  }

  @Put(':id/content')
  saveContent(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: SaveExamContentDto,
  ): Promise<ExamDetail> {
    return this.content.save(ctx, actor.id, id, dto);
  }

  @Get(':id/versions')
  versions(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<ExamVersionList> {
    return this.content.listVersions(ctx, actor.id, id);
  }

  @Get(':id/versions/:version')
  version(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
    @Param('version', VersionPipe()) version: number,
  ): Promise<ExamVersionDetail> {
    return this.content.getVersion(ctx, id, version);
  }

  @Post(':id/versions/:version/restore')
  @HttpCode(HttpStatus.OK)
  restore(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('version', VersionPipe()) version: number,
    @Body() dto: RestoreExamVersionDto,
  ): Promise<ExamDetail> {
    return this.content.restore(ctx, actor.id, id, version, dto);
  }

  /** Đề đã publish hoặc đề mình sửa được → bản nháp mới của người nhân bản. */
  @Post(':id/clone')
  clone(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<ExamDetail> {
    return this.exams.clone(ctx, actor.id, id);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  publish(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<ExamDetail> {
    return this.exams.publish(ctx, actor.id, id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<ExamDetail> {
    return this.exams.archive(ctx, actor.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<void> {
    return this.exams.remove(ctx, actor.id, id);
  }
}
