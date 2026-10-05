import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from '../exams/exam.entity';
import { Lesson } from '../lessons/lesson.entity';
import { TenantsModule } from '../tenants/tenants.module';
import { Course } from '../training/course.entity';
import {
  AdminCategoriesController,
  AdminExamBlueprintsController,
  AdminLessonBlueprintsController,
} from './admin-catalog.controller';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';
import { ExamBlueprint } from './exam-blueprint.entity';
import { ExamBlueprintsService } from './exam-blueprints.service';
import { ExamModule } from './exam-module.entity';
import { LessonBlueprint } from './lesson-blueprint.entity';
import { LessonBlueprintsService } from './lesson-blueprints.service';
import { LessonModule } from './lesson-module.entity';
import {
  TenantCategoriesController,
  TenantExamBlueprintsController,
  TenantLessonBlueprintsController,
} from './tenant-catalog.controller';

/**
 * Danh mục (dùng chung), loại đề + module và mẫu bài học + phần cho `/admin/*`
 * và `/t/:slug/*` (req-1 Step 11, req-3 Step 2).
 */
@Module({
  imports: [
    TenantsModule,
    TypeOrmModule.forFeature([
      Category,
      ExamBlueprint,
      ExamModule,
      LessonBlueprint,
      LessonModule,
      Exam,
      Lesson,
      Course,
    ]),
  ],
  controllers: [
    AdminCategoriesController,
    AdminExamBlueprintsController,
    AdminLessonBlueprintsController,
    TenantCategoriesController,
    TenantExamBlueprintsController,
    TenantLessonBlueprintsController,
  ],
  providers: [
    CategoriesService,
    ExamBlueprintsService,
    LessonBlueprintsService,
  ],
  exports: [TypeOrmModule, ExamBlueprintsService, LessonBlueprintsService],
})
export class CatalogModule {}
