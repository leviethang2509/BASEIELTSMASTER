import type {
  ExamBlueprintItem,
  CategoryItem,
  CategoryRef,
  ExamModuleItem,
  LessonBlueprintItem,
  LessonModuleItem,
} from '@lang/shared';
import { compareText, scopeOf } from './catalog-scope';
import type { ExamBlueprint } from './exam-blueprint.entity';
import type { Category } from './category.entity';
import type { ExamModule } from './exam-module.entity';
import type { LessonBlueprint } from './lesson-blueprint.entity';
import type { LessonModule } from './lesson-module.entity';

export function toCategoryItem(
  category: Category,
  counts: Pick<
    CategoryItem,
    'examBlueprintCount' | 'lessonBlueprintCount' | 'courseCount'
  >,
): CategoryItem {
  return {
    ...toCategoryRef(category),
    description: category.description,
    sortOrder: category.sortOrder,
    ...counts,
    updatedAt: category.updatedAt.toISOString(),
  };
}

export function toCategoryRef(category: Category): CategoryRef {
  return {
    id: category.id,
    scope: scopeOf(category),
    name: category.name,
    code: category.code,
    icon: category.icon,
    color: category.color,
    isActive: category.isActive,
  };
}

export function toExamModuleItem(module: ExamModule): ExamModuleItem {
  return {
    id: module.id,
    name: module.name,
    code: module.code,
    sortOrder: module.sortOrder,
    referenceDurationMinutes: module.referenceDurationMinutes,
    description: module.description,
  };
}

export function toExamBlueprintItem(
  blueprint: ExamBlueprint,
  category: Category,
  modules: ExamModule[],
  examCount: number,
): ExamBlueprintItem {
  return {
    id: blueprint.id,
    scope: scopeOf(blueprint),
    category: toCategoryRef(category),
    name: blueprint.name,
    code: blueprint.code,
    description: blueprint.description,
    isActive: blueprint.isActive,
    modules: [...modules]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(toExamModuleItem),
    examCount,
    updatedAt: blueprint.updatedAt.toISOString(),
  };
}

export function toLessonModuleItem(module: LessonModule): LessonModuleItem {
  return {
    id: module.id,
    name: module.name,
    code: module.code,
    sortOrder: module.sortOrder,
    description: module.description,
  };
}

export function toLessonBlueprintItem(
  blueprint: LessonBlueprint,
  category: Category,
  modules: LessonModule[],
  lessonCount: number,
): LessonBlueprintItem {
  return {
    id: blueprint.id,
    scope: scopeOf(blueprint),
    category: toCategoryRef(category),
    name: blueprint.name,
    code: blueprint.code,
    description: blueprint.description,
    isActive: blueprint.isActive,
    modules: [...modules]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(toLessonModuleItem),
    lessonCount,
    updatedAt: blueprint.updatedAt.toISOString(),
  };
}

/** Mục hệ thống trước, rồi theo thứ tự và tên. */
export function compareCategories(a: Category, b: Category): number {
  return (
    Number(a.tenantId !== null) - Number(b.tenantId !== null) ||
    a.sortOrder - b.sortOrder ||
    compareText(a.name, b.name)
  );
}
