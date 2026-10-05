import {
  TENANT_MANAGER_ROLES,
  hasAnyRole,
  type ExamListItem,
  type ExamSectionItem,
  type ExamUserRef,
} from '@lang/shared';
import { scopeOf } from '../catalog/catalog-scope';
import type { ExamBlueprint } from '../catalog/exam-blueprint.entity';
import type { Category } from '../catalog/category.entity';
import { toCategoryRef } from '../catalog/catalog.mapper';
import type { TenantContext } from '../tenants/tenant-context';
import type { User } from '../users/user.entity';
import type { ExamSection } from './exam-section.entity';
import type { Exam } from './exam.entity';

/** Owner/Admin sửa mọi đề; Teacher chỉ đề do mình tạo. */
export function canEditExam(
  ctx: TenantContext,
  actorId: string,
  exam: Pick<Exam, 'createdBy'>,
): boolean {
  return (
    hasAnyRole(ctx.roles, TENANT_MANAGER_ROLES) || exam.createdBy === actorId
  );
}

export function toUserRef(user: User | undefined): ExamUserRef | null {
  return user ? { id: user.id, fullName: user.fullName } : null;
}

/** Số liệu section không cần `raw_data`. */
export type SectionStats = Pick<
  ExamSection,
  'durationMinutes' | 'questionCount'
>;

export function toExamListItem(
  exam: Exam,
  refs: {
    blueprint: ExamBlueprint;
    category: Category;
    sections: readonly SectionStats[];
    creator: User | undefined;
    clonedFrom: Pick<Exam, 'id' | 'title'> | undefined;
    canEdit: boolean;
  },
): ExamListItem {
  const { blueprint, category, sections } = refs;
  return {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    status: exam.status,
    visibility: exam.visibility,
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
    totalDurationMinutes: sum(
      sections.map((section) => section.durationMinutes),
    ),
    currentVersion: exam.currentVersion,
    creator: toUserRef(refs.creator),
    clonedFrom: refs.clonedFrom
      ? { id: refs.clonedFrom.id, title: refs.clonedFrom.title }
      : null,
    canEdit: refs.canEdit,
    publishedAt: exam.publishedAt?.toISOString() ?? null,
    updatedAt: exam.updatedAt.toISOString(),
  };
}

export function toExamSectionItem(section: ExamSection): ExamSectionItem {
  return {
    id: section.id,
    moduleId: section.moduleId,
    name: section.name,
    sortOrder: section.sortOrder,
    durationMinutes: section.durationMinutes,
    questionCount: section.questionCount,
    rawData: section.rawData,
  };
}

export const bySortOrder = (
  a: Pick<ExamSection, 'sortOrder'>,
  b: Pick<ExamSection, 'sortOrder'>,
) => a.sortOrder - b.sortOrder;

export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
