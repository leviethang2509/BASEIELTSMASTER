import {
  TENANT_MANAGER_ROLES,
  hasAnyRole,
  type LessonListItem,
  type LessonSectionItem,
} from '@lang/shared';
import { scopeOf } from '../catalog/catalog-scope';
import { toCategoryRef } from '../catalog/catalog.mapper';
import type { Category } from '../catalog/category.entity';
import type { LessonBlueprint } from '../catalog/lesson-blueprint.entity';
import { sum, toUserRef } from '../exams/exam.mapper';
import type { TenantContext } from '../tenants/tenant-context';
import type { User } from '../users/user.entity';
import type { LessonSection } from './lesson-section.entity';
import type { Lesson } from './lesson.entity';

/** Owner/Admin sửa mọi bài học; Teacher chỉ bài do mình tạo (A11). */
export function canEditLesson(
  ctx: TenantContext,
  actorId: string,
  lesson: Pick<Lesson, 'createdBy'>,
): boolean {
  return (
    hasAnyRole(ctx.roles, TENANT_MANAGER_ROLES) || lesson.createdBy === actorId
  );
}

/** Số liệu section không cần `raw_data`. */
export type LessonSectionStats = Pick<LessonSection, 'questionCount'>;

export function toLessonListItem(
  lesson: Lesson,
  refs: {
    blueprint: LessonBlueprint;
    category: Category;
    sections: readonly LessonSectionStats[];
    creator: User | undefined;
    clonedFrom: Pick<Lesson, 'id' | 'title'> | undefined;
    canEdit: boolean;
  },
): LessonListItem {
  const { blueprint, category, sections } = refs;
  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    status: lesson.status,
    visibility: lesson.visibility,
    blueprint: {
      id: blueprint.id,
      scope: scopeOf(blueprint),
      name: blueprint.name,
      code: blueprint.code,
      isActive: blueprint.isActive,
      category: toCategoryRef(category),
    },
    sectionCount: sections.length,
    questionCount: sum(sections.map((section) => section.questionCount)),
    currentVersion: lesson.currentVersion,
    creator: toUserRef(refs.creator),
    clonedFrom: refs.clonedFrom
      ? { id: refs.clonedFrom.id, title: refs.clonedFrom.title }
      : null,
    canEdit: refs.canEdit,
    publishedAt: lesson.publishedAt?.toISOString() ?? null,
    updatedAt: lesson.updatedAt.toISOString(),
  };
}

export function toLessonSectionItem(section: LessonSection): LessonSectionItem {
  return {
    id: section.id,
    moduleId: section.moduleId,
    name: section.name,
    sortOrder: section.sortOrder,
    questionCount: section.questionCount,
    rawData: section.rawData,
  };
}
