'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronRight, GraduationCap } from 'lucide-react';
import type { LearnerClassItem } from '@lang/shared';
import { ClassroomStatusBadge } from '@/components/classes/classes-ui';
import { FormAlert } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { formatDateTime } from '@/lib/format';
import {
  learnerClassPath,
  learnerSchedulePath,
  listMyClasses,
} from '@/lib/learner-class-api';

const text = vi.classLearning;

/** "Lớp của tôi" ở trang trung tâm: lớp mà mình là học viên (D11, R19). */
export function MyClassList({ slug }: { slug: string }) {
  const [classes, setClasses] = useState<LearnerClassItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMyClasses(slug).then(
      (result) => {
        if (!cancelled) setClasses(result);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) return <FormAlert tone="error">{error}</FormAlert>;
  // Không phải học viên lớp nào thì không chiếm chỗ trên trang trung tâm.
  if (!classes || classes.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
          {text.heading}
        </h2>
        <Link
          prefetch={false}
          href={learnerSchedulePath(slug)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
        >
          <CalendarDays size={15} /> {text.myScheduleLink}
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((row) => (
          <li key={row.id}>
            <Link
              prefetch={false}
              href={learnerClassPath(slug, row.id)}
              className="group flex h-full flex-col gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition hover:border-[var(--accent)] hover:shadow-[0_12px_28px_var(--shadow-1)]"
            >
              <div className="flex items-center gap-2">
                <GraduationCap size={18} className="text-[var(--muted)]" />
                <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-[var(--muted)]">
                  {row.code}
                </span>
                <ClassroomStatusBadge status={row.status} />
              </div>
              <h3 className="text-[16px] font-bold leading-snug text-[var(--heading)]">
                {row.name}
              </h3>
              <p className="text-[13px] text-[var(--body)]">
                {row.course.name}
              </p>
              {row.nextSession && (
                <p className="text-[12.5px] text-[var(--muted)]">
                  {text.nextSession}: {formatDateTime(row.nextSession.startsAt)}
                  {row.nextSession.location
                    ? ` · ${row.nextSession.location}`
                    : ''}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[12.5px] text-[var(--muted)]">
                <span>{text.progress(row.doneCount, row.itemCount)}</span>
                <ChevronRight
                  size={16}
                  className="shrink-0 transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
