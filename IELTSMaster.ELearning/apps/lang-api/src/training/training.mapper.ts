import {
  TENANT_MANAGER_ROLES,
  hasAnyRole,
  type CategoryRef,
  type CourseListItem,
  type CourseRef,
  type CurriculumContentRef,
  type CurriculumItemView,
  type CurriculumListItem,
  type ExamUserRef,
} from '@lang/shared';
import type { TenantContext } from '../tenants/tenant-context';
import type { Course } from './course.entity';
import type { CurriculumItem } from './curriculum-item.entity';
import type { Curriculum } from './curriculum.entity';

/** Owner/Admin sửa mọi giáo trình; Teacher chỉ giáo trình mình tạo (C6). */
export function canEditCurriculum(
  ctx: TenantContext,
  actorId: string,
  curriculum: Pick<Curriculum, 'createdBy'>,
): boolean {
  return (
    hasAnyRole(ctx.roles, TENANT_MANAGER_ROLES) ||
    curriculum.createdBy === actorId
  );
}

export function toCourseRef(course: Course): CourseRef {
  return {
    id: course.id,
    code: course.code,
    name: course.name,
    status: course.status,
  };
}

export function toCourseListItem(
  course: Course,
  extra: {
    category: CategoryRef | null;
    curriculumCount: number;
    classCount: number;
  },
): CourseListItem {
  return {
    ...toCourseRef(course),
    description: course.description,
    category: extra.category,
    coverUrl: course.coverUrl,
    level: course.level,
    plannedSessions: course.plannedSessions,
    curriculumCount: extra.curriculumCount,
    classCount: extra.classCount,
    updatedAt: course.updatedAt.toISOString(),
  };
}

export function toCurriculumListItem(
  curriculum: Curriculum,
  extra: {
    creator: ExamUserRef | null;
    clonedFrom: { id: string; name: string } | null;
    groupCount: number;
    itemCount: number;
    courses: CourseRef[];
    canEdit: boolean;
  },
): CurriculumListItem {
  return {
    id: curriculum.id,
    name: curriculum.name,
    description: curriculum.description,
    ...extra,
    updatedAt: curriculum.updatedAt.toISOString(),
  };
}

export function toCurriculumItemView(
  item: CurriculumItem,
  content: CurriculumContentRef,
): CurriculumItemView {
  return {
    id: item.id,
    itemType: item.itemType,
    title: item.title,
    label: item.label,
    note: item.note,
    content,
  };
}

/** Id bài học/đề thi của mục (CHECK bảo đảm có đúng một). */
export function contentIdOf(item: Pick<CurriculumItem, 'lessonId' | 'examId'>) {
  return (item.lessonId ?? item.examId)!;
}
