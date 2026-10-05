'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CalendarFeedView } from '@/components/calendar/CalendarFeedView';
import { vi } from '@/i18n/vi';
import { getMyClassSchedule } from '@/lib/learner-class-api';

const text = vi.classLearning;

/** "Lịch học của tôi" (R16): buổi của các lớp mình đang học, chỉ xem. */
export function LearnerSchedulePage({ slug: rawSlug }: { slug: string }) {
  const slug = rawSlug.toLowerCase();
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-8">
      <Link
        href={`/t/${slug}`}
        className="inline-flex w-fit items-center gap-1.5 text-[13.5px] font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
      >
        <ArrowLeft size={15} /> {text.backToTenant}
      </Link>
      <h1 className="text-[22px] font-bold leading-tight text-[var(--heading)]">
        {text.scheduleHeading}
      </h1>
      <p className="text-[13.5px] text-[var(--body)]">{text.scheduleHint}</p>
      <CalendarFeedView
        slug={slug}
        load={(range) => getMyClassSchedule(slug, range)}
        reloadKey="learner"
        // Học viên không vào được trang chi tiết buổi (chỉ giáo viên của lớp).
        sessionHref={() => undefined}
      />
    </div>
  );
}
