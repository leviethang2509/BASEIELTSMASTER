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
} from '@nestjs/common';
import {
  PermissionKey,
  SYSTEM_MANAGER_ROLES,
  type ExamBlueprintItem,
  type LessonBlueprintItem,
  type CategoryItem,
} from '@lang/shared';
import { Permissions, SystemRoles } from '../auth/decorators';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../common/pipes';
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

/** Danh mục hệ thống (`tenant_id` NULL), System Owner/Admin. */
@Controller('admin/categories')
@Permissions(PermissionKey.SYSTEM_TENANTS_MANAGE)
@SystemRoles(...SYSTEM_MANAGER_ROLES)
export class AdminCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(): Promise<CategoryItem[]> {
    return this.categories.list(null);
  }

  @Post()
  create(
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryItem> {
    return this.categories.create(null, actor.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryItem> {
    return this.categories.update(null, actor.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIdPipe()) id: string): Promise<void> {
    return this.categories.remove(null, id);
  }
}

/** Loại đề hệ thống kèm module, System Owner/Admin. */
@Controller('admin/exam-blueprints')
@Permissions(PermissionKey.SYSTEM_TENANTS_MANAGE)
@SystemRoles(...SYSTEM_MANAGER_ROLES)
export class AdminExamBlueprintsController {
  constructor(private readonly blueprints: ExamBlueprintsService) {}

  @Get()
  list(): Promise<ExamBlueprintItem[]> {
    return this.blueprints.list(null);
  }

  @Post()
  create(
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateExamBlueprintDto,
  ): Promise<ExamBlueprintItem> {
    return this.blueprints.create(null, actor.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: UpdateExamBlueprintDto,
  ): Promise<ExamBlueprintItem> {
    return this.blueprints.update(null, actor.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIdPipe()) id: string): Promise<void> {
    return this.blueprints.remove(null, id);
  }
}

/** Mẫu bài học hệ thống kèm phần, System Owner/Admin. */
@Controller('admin/lesson-blueprints')
@Permissions(PermissionKey.SYSTEM_TENANTS_MANAGE)
@SystemRoles(...SYSTEM_MANAGER_ROLES)
export class AdminLessonBlueprintsController {
  constructor(private readonly blueprints: LessonBlueprintsService) {}

  @Get()
  list(): Promise<LessonBlueprintItem[]> {
    return this.blueprints.list(null);
  }

  @Post()
  create(
    @CurrentUser() actor: RequestUser,
    @Body() dto: CreateLessonBlueprintDto,
  ): Promise<LessonBlueprintItem> {
    return this.blueprints.create(null, actor.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: RequestUser,
    @Param('id', ParseIdPipe()) id: string,
    @Body() dto: UpdateLessonBlueprintDto,
  ): Promise<LessonBlueprintItem> {
    return this.blueprints.update(null, actor.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIdPipe()) id: string): Promise<void> {
    return this.blueprints.remove(null, id);
  }
}
