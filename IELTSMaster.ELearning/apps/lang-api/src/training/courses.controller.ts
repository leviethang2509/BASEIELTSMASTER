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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  EXAM_AUTHOR_ROLES,
  PermissionKey,
  TENANT_MANAGER_ROLES,
  type CourseDetail,
  type CourseListItem,
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
import { CoursesService } from './courses.service';
import {
  CreateCourseDto,
  ListCoursesQueryDto,
  UpdateCourseDto,
} from './dto/course.dto';

/** Khoá học: Owner/Admin quản lý và gắn/bỏ giáo trình, Teacher chỉ xem (B2, R6). */
@Controller('t/:slug/courses')
@UseGuards(TenantGuard)
@Permissions(PermissionKey.TENANT_CLASSES_MANAGE)
@TenantRoles(...TENANT_MANAGER_ROLES)
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  @Permissions(PermissionKey.TENANT_CLASSES_MANAGE)
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  list(
    @TenantCtx() ctx: TenantContext,
    @Query() query: ListCoursesQueryDto,
  ): Promise<Paginated<CourseListItem>> {
    return this.courses.list(ctx, query);
  }

  @Post()
  create(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateCourseDto,
  ): Promise<CourseDetail> {
    return this.courses.create(ctx, actor.id, dto);
  }

  @Get(':id')
  @Permissions(PermissionKey.TENANT_CLASSES_MANAGE)
  @TenantRoles(...EXAM_AUTHOR_ROLES)
  detail(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<CourseDetail> {
    return this.courses.getDetail(ctx, actor.id, id);
  }

  @Patch(':id')
  update(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: UpdateCourseDto,
  ): Promise<CourseDetail> {
    return this.courses.update(ctx, actor.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
  ): Promise<void> {
    return this.courses.remove(ctx, id);
  }

  @Post(':id/curricula/:curriculumId')
  attach(
    @TenantCtx() ctx: TenantContext,
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Param('curriculumId', ParseIdPipe()) curriculumId: string,
  ): Promise<CourseDetail> {
    return this.courses.attachCurriculum(ctx, actor.id, id, curriculumId);
  }

  @Delete(':id/curricula/:curriculumId')
  @HttpCode(HttpStatus.NO_CONTENT)
  detach(
    @TenantCtx() ctx: TenantContext,
    @Param('id', ParseIdPipe()) id: string,
    @Param('curriculumId', ParseIdPipe()) curriculumId: string,
  ): Promise<void> {
    return this.courses.detachCurriculum(ctx, id, curriculumId);
  }
}
