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
  UseGuards,
} from '@nestjs/common';
import {
  EXAM_AUTHOR_ROLES,
  PermissionKey,
  TENANT_MANAGER_ROLES,
  type ExamBlueprintItem,
  type LessonBlueprintItem,
  type CategoryItem,
} from '@lang/shared';
import { Permissions } from '../auth/decorators';
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
  CreateExamBlueprintDto,
  UpdateExamBlueprintDto,
} from './dto/exam-blueprint.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import {
  CreateLessonBlueprintDto,
  UpdateLessonBlueprintDto,
} from './dto/lesson-blueprint.dto';
import { ExamBlueprintsService } from './exam-blueprints.service';
import { LessonBlueprintsService } from './lesson-blueprints.service';
import { CategoriesService } from './categories.service';

/**
 * Danh mục của tenant: xem gồm mục hệ thống + của tenant (Owner/Admin/
 * Teacher); tạo/sửa/xoá chỉ mục của tenant (Owner/Admin).
 */
@Controller('t/:slug/categories')
@UseGuards(TenantGuard)
@Permissions(PermissionKey.EXAMS_CREATE)
@TenantRoles(...TENANT_MANAGER_ROLES)
export class TenantCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @Permissions(PermissionKey.EXAMS_CREATE)
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  list(@TenantCtx() ctx: TenantContext): Promise<CategoryItem[]> {
    return this.categories.list(ctx.tenantId);
  }

  @Post()
  create(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryItem> {
    return this.categories.create(ctx.tenantId, actor.id, dto);
  }

  @Patch(':id')
  update(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryItem> {
    return this.categories.update(ctx.tenantId, actor.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<void> {
    return this.categories.remove(ctx.tenantId, id);
  }
}

/** Loại đề của tenant, quyền như danh mục. */
@Controller('t/:slug/exam-blueprints')
@UseGuards(TenantGuard)
@Permissions(PermissionKey.EXAMS_CREATE)
@TenantRoles(...TENANT_MANAGER_ROLES)
export class TenantExamBlueprintsController {
  constructor(private readonly blueprints: ExamBlueprintsService) {}

  @Get()
  @Permissions(PermissionKey.EXAMS_CREATE)
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  list(@TenantCtx() ctx: TenantContext): Promise<ExamBlueprintItem[]> {
    return this.blueprints.list(ctx.tenantId);
  }

  @Post()
  create(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateExamBlueprintDto,
  ): Promise<ExamBlueprintItem> {
    return this.blueprints.create(ctx.tenantId, actor.id, dto);
  }

  @Patch(':id')
  update(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: UpdateExamBlueprintDto,
  ): Promise<ExamBlueprintItem> {
    return this.blueprints.update(ctx.tenantId, actor.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<void> {
    return this.blueprints.remove(ctx.tenantId, id);
  }
}

/** Mẫu bài học của tenant, quyền như danh mục. */
@Controller('t/:slug/lesson-blueprints')
@UseGuards(TenantGuard)
@Permissions(PermissionKey.EXAMS_CREATE)
@TenantRoles(...TENANT_MANAGER_ROLES)
export class TenantLessonBlueprintsController {
  constructor(private readonly blueprints: LessonBlueprintsService) {}

  @Get()
  @Permissions(PermissionKey.EXAMS_CREATE)
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  list(@TenantCtx() ctx: TenantContext): Promise<LessonBlueprintItem[]> {
    return this.blueprints.list(ctx.tenantId);
  }

  @Post()
  create(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateLessonBlueprintDto,
  ): Promise<LessonBlueprintItem> {
    return this.blueprints.create(ctx.tenantId, actor.id, dto);
  }

  @Patch(':id')
  update(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: UpdateLessonBlueprintDto,
  ): Promise<LessonBlueprintItem> {
    return this.blueprints.update(ctx.tenantId, actor.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<void> {
    return this.blueprints.remove(ctx.tenantId, id);
  }
}
