import { BookOpen, FileText } from 'lucide-react';
import { CourseStatus, CurriculumItemType, type CourseRef } from '@lang/shared';
import Link from 'next/link';
import { Badge } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { courseDetailPath } from '@/lib/training-api';

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  return (
    <Badge tone={status === CourseStatus.ACTIVE ? 'success' : 'warning'}>
      {vi.courses.status[status]}
    </Badge>
  );
}

/** Biểu tượng loại mục giáo trình: bài học hoặc đề thi. */
export function ItemTypeIcon({
  type,
  size = 16,
}: {
  type: CurriculumItemType;
  size?: number;
}) {
  const Icon = type === CurriculumItemType.LESSON ? BookOpen : FileText;
  return (
    <span
      title={vi.curricula.itemType[type]}
      className={`grid shrink-0 place-items-center rounded-md p-1 ${
        type === CurriculumItemType.LESSON
          ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
          : 'bg-[var(--info-soft)] text-[var(--info)]'
      }`}
    >
      <Icon size={size} />
    </span>
  );
}

/** Khoá học đang gắn giáo trình, dạng chip link. */
export function CourseChips({
  slug,
  courses,
}: {
  slug: string;
  courses: CourseRef[];
}) {
  if (courses.length === 0) {
    return (
      <span className="text-[12.5px] text-[var(--muted)]">
        {vi.curricula.noCourse}
      </span>
    );
  }
  return (
    <span className="flex flex-wrap gap-1">
      {courses.map((course) => (
        <Link
          key={course.id}
          href={courseDetailPath(slug, course.id)}
          title={course.name}
          className="max-w-full truncate rounded-md bg-[var(--hover)] px-2 py-0.5 text-[12px] font-medium text-[var(--body)] hover:text-[var(--accent)]"
        >
          {course.code}
        </Link>
      ))}
    </span>
  );
}
