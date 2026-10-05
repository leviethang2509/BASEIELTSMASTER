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
  type CurriculumDetail,
  type CurriculumListItem,
  type ExamUserRef,
} from '@lang/shared';
import { Permissions } from '../auth/decorators';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import type { Paginated } from '../common/pagination';
import { ParseIdPipe } from '../common/pipes';
import {
  TenantCtx,
  TenantRoles,
  type TenantContext,
} from '../tenants/tenant-context';
import { TenantGuard } from '../tenants/tenant.guard';
import { CurriculaService } from './curricula.service';
import {
  CreateCurriculumDto,
  ListCurriculaQueryDto,
  SaveCurriculumItemsDto,
  UpdateCurriculumDto,
} from './dto/curriculum.dto';

/**
 * Giáo trình tham khảo: Owner/Admin/Teacher xem, tạo, nhân bản; sửa/xoá (Teacher
 * chỉ giáo trình mình tạo) kiểm trong service (C6).
 */
@Controller('t/:slug/curricula')
@UseGuards(TenantGuard)
@Permissions(PermissionKey.EXAMS_CREATE)
@TenantRoles(...EXAM_AUTHOR_ROLES)
export class CurriculaController {
  constructor(private readonly curricula: CurriculaService) {}

  @Get()
  list(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Query() query: ListCurriculaQueryDto,
  ): Promise<Paginated<CurriculumListItem>> {
    return this.curricula.list(ctx, actor.id, query);
  }

  /** Khai báo trước `:id` để không bị `ParseIdPipe` bắt. */
  @Get('creators')
  creators(@TenantCtx() ctx: TenantContext): Promise<ExamUserRef[]> {
    return this.curricula.creators(ctx);
  }

  @Post()
  create(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateCurriculumDto,
  ): Promise<CurriculumDetail> {
    return this.curricula.create(ctx, actor.id, dto);
  }

  @Get(':id')
  detail(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<CurriculumDetail> {
    return this.curricula.getDetail(ctx, actor.id, id);
  }

  @Patch(':id')
  update(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: UpdateCurriculumDto,
  ): Promise<CurriculumDetail> {
    return this.curricula.update(ctx, actor.id, id, dto);
  }

  @Put(':id/items')
  saveItems(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: SaveCurriculumItemsDto,
  ): Promise<CurriculumDetail> {
    return this.curricula.saveItems(ctx, actor.id, id, dto);
  }

  @Post(':id/clone')
  clone(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<CurriculumDetail> {
    return this.curricula.clone(ctx, actor.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<void> {
    return this.curricula.remove(ctx, actor.id, id);
  }
}
