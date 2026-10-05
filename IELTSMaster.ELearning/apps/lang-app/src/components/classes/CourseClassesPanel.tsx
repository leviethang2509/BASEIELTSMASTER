'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import {
  CourseStatus,
  type ClassroomListItem,
  type CourseDetail,
} from '@lang/shared';
import { FormAlert, compactPrimaryButtonClass } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { classDetailPath, listClassrooms } from '@/lib/classroom-api';
import { errorMessage } from '@/lib/error-message';
import { formatDate } from '@/lib/format';
import { ClassroomFormModal } from './ClassroomFormModal';
import { ClassroomStatusBadge } from './classes-ui';

/**
 * Tab "Lớp" của trang khoá học: lớp mở từ khoá học (Teacher chỉ thấy lớp mình
 * phụ trách); Owner/Admin tạo lớp mới với khoá học chọn sẵn.
 */
export function CourseClassesPanel({
  slug,
  course,
  canManage,
}: {
  slug: string;
  course: CourseDetail;
  canManage: boolean;
}) {
  const router = useRouter();
  const text = vi.classes;
  const [rows, setRows] = useState<ClassroomListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listClassrooms(slug, { page: 1, pageSize: 100, courseId: course.id }).then(
      (result) => {
        if (!cancelled) setRows(result.items);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, course.id]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-[13.5px] text-[var(--body)]">
          {text.courseTabHint}
        </p>
        {canManage && course.status === CourseStatus.ACTIVE && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={compactPrimaryButtonClass}
          >
            <Plus size={16} /> {text.create}
          </button>
        )}
      </div>
      {error && <FormAlert tone="error">{error}</FormAlert>}
      {rows === null ? (
        !error && (
          <span className="text-[14px] text-[var(--muted)]">
            {vi.common.loading}
          </span>
        )
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border-strong)] p-6 text-center text-[14px] text-[var(--muted)]">
          {canManage ? text.empty : text.emptyForTeacher}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={classDetailPath(slug, row.id)}
                  className="block truncate text-[14px] font-semibold text-[var(--heading)] hover:text-[var(--accent)]"
                >
                  {row.name}
                </Link>
                <span className="block truncate text-[12.5px] text-[var(--muted)]">
                  <span className="font-mono">{row.code}</span> ·{' '}
                  {formatDate(row.startDate)} ·{' '}
                  {text.studentCount(row.studentCount, row.maxStudents)}{' '}
                  {text.students.toLowerCase()} ·{' '}
                  {row.teachers.length === 0
                    ? text.noTeacher
                    : row.teachers
                        .map((teacher) => teacher.fullName)
                        .join(', ')}
                </span>
              </div>
              <ClassroomStatusBadge status={row.status} />
            </li>
          ))}
        </ul>
      )}
      <ClassroomFormModal
        open={creating}
        slug={slug}
        classroom={null}
        defaultCourseId={course.id}
        onClose={() => setCreating(false)}
        onSaved={(classroom) => {
          setCreating(false);
          router.push(classDetailPath(slug, classroom.id));
        }}
      />
    </section>
  );
}
