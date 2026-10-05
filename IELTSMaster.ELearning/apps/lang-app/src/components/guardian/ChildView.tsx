'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import {
  AttemptStatus,
  type ChildExamAttempt,
  type ChildLessonAttempt,
  type ChildManualAnswers,
  type ChildOverview,
} from '@lang/shared';
import { CalendarFeedView } from '@/components/calendar/CalendarFeedView';
import { ClassroomStatusBadge } from '@/components/classes/classes-ui';
import { Badge, FormAlert, SectionCard } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { formatDateTime } from '@/lib/format';
import {
  childClassPath,
  childrenPath,
  getChild,
  getChildSchedule,
} from '@/lib/guardian-api';
import { ChildBadges, ManualAnswerList } from './guardian-ui';

const text = vi.guardian;
const classText = vi.classLearning;

/** Trang tổng quan một con: lớp, lịch học và bài làm ngoài lớp (R19). */
export function ChildView({
  slug: rawSlug,
  membershipId,
}: {
  slug: string;
  membershipId: string;
}) {
  const slug = rawSlug.toLowerCase();
  const [data, setData] = useState<ChildOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getChild(slug, membershipId).then(
      (result) => {
        if (!cancelled) setData(result);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, text.loadError));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, membershipId]);

  const back = (
    <Link
      prefetch={false}
      href={childrenPath(slug)}
      className="inline-flex w-fit items-center gap-1.5 text-[13.5px] font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
    >
      <ArrowLeft size={15} /> {text.backToChildren}
    </Link>
  );

  if (error) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-16">
        <FormAlert tone="error">{error}</FormAlert>
        {back}
      </div>
    );
  }
  if (!data) {
    return (
      <p className="py-24 text-center text-[14px] text-[var(--muted)]">
        {vi.common.loading}
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-8">
      {back}
      <ChildBoard slug={slug} data={data} />
      <SectionCard title={text.scheduleHeading}>
        <p className="mb-3 text-[12.5px] text-[var(--muted)]">
          {text.scheduleHint}
        </p>
        <CalendarFeedView
          slug={slug}
          load={(range) => getChildSchedule(slug, membershipId, range)}
          reloadKey={membershipId}
          // Phụ huynh không vào trang chi tiết buổi (chỉ giáo viên của lớp).
          sessionHref={() => undefined}
        />
      </SectionCard>
    </div>
  );
}

/**
 * Phần hiển thị của trang con (nhận dữ liệu qua prop nên render/kiểm được
 * không cần gọi API): thông tin con, lớp và bài làm ngoài lớp.
 */
export function ChildBoard({
  slug,
  data,
}: {
  slug: string;
  data: ChildOverview;
}) {
  const { child } = data;
  const hasFree =
    data.examAttempts.length > 0 || data.lessonAttempts.length > 0;
  return (
    <>
      <header className="flex flex-col gap-2 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
        <h1 className="text-[24px] font-bold leading-tight text-[var(--heading)]">
          {child.fullName}
        </h1>
        <p className="text-[13px] text-[var(--muted)]">{child.email}</p>
        <ChildBadges child={child} />
        <p className="text-[12.5px] text-[var(--muted)]">{text.hint}</p>
      </header>

      <SectionCard title={text.classesHeading}>
        {data.classes.length === 0 ? (
          <p className="text-[13.5px] text-[var(--muted)]">{text.noClasses}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.classes.map((row) => (
              <li key={row.id}>
                <Link
                  prefetch={false}
                  href={childClassPath(slug, child.membershipId, row.id)}
                  className="group flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 transition hover:border-[var(--accent)]"
                >
                  <GraduationCap
                    size={17}
                    className="shrink-0 text-[var(--muted)]"
                  />
                  <span className="min-w-0 flex-1 basis-56">
                    <span className="block truncate text-[14.5px] font-semibold text-[var(--heading)]">
                      {row.name}
                    </span>
                    <span className="block truncate text-[12.5px] text-[var(--muted)]">
                      {row.course.name} ·{' '}
                      {classText.progress(row.doneCount, row.itemCount)}
                    </span>
                    {row.nextSession && (
                      <span className="mt-0.5 flex items-center gap-1 text-[12.5px] text-[var(--muted)]">
                        <CalendarDays size={13} />
                        {classText.nextSession}:{' '}
                        {formatDateTime(row.nextSession.startsAt)}
                      </span>
                    )}
                  </span>
                  <ClassroomStatusBadge status={row.status} />
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={text.freeHeading}>
        {!hasFree ? (
          <p className="text-[13.5px] text-[var(--muted)]">{text.noFree}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {data.examAttempts.length > 0 && (
              <FreeGroup title={text.freeExams}>
                {data.examAttempts.map((attempt) => (
                  <ExamRow
                    key={attempt.id}
                    attempt={attempt}
                    manualAnswers={data.manualAnswers}
                  />
                ))}
              </FreeGroup>
            )}
            {data.lessonAttempts.length > 0 && (
              <FreeGroup title={text.freeLessons}>
                {data.lessonAttempts.map((attempt) => (
                  <LessonRow
                    key={attempt.id}
                    attempt={attempt}
                    manualAnswers={data.manualAnswers}
                  />
                ))}
              </FreeGroup>
            )}
          </div>
        )}
      </SectionCard>
    </>
  );
}

function FreeGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
        {title}
      </h3>
      <ul className="flex flex-col gap-2">{children}</ul>
    </div>
  );
}

function ExamRow({
  attempt,
  manualAnswers,
}: {
  attempt: ChildExamAttempt;
  manualAnswers: ChildManualAnswers;
}) {
  const pending = attempt.manualCount - attempt.manualGradedCount;
  return (
    <li className="rounded-xl border border-[var(--border)] px-3 py-2.5">
      <p className="text-[14.5px] font-semibold text-[var(--heading)]">
        {attempt.title}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-1.5">
        <Badge tone="neutral">{vi.learner.attemptStatus[attempt.status]}</Badge>
        {attempt.percent !== null && (
          <Badge tone="accent">{text.percent(attempt.percent)}</Badge>
        )}
        {attempt.status !== AttemptStatus.IN_PROGRESS && (
          <span className="text-[12.5px] text-[var(--muted)]">
            {text.autoScore(attempt.autoCorrect, attempt.autoTotal)}
          </span>
        )}
        {pending > 0 && (
          <Badge tone="warning">{text.pendingGrading(pending)}</Badge>
        )}
      </p>
      <p className="mt-1 text-[12.5px] text-[var(--muted)]">
        {text.startedAt(formatDateTime(attempt.startedAt))}
      </p>
      <ManualAnswerList answers={manualAnswers[attempt.id]} />
    </li>
  );
}

function LessonRow({
  attempt,
  manualAnswers,
}: {
  attempt: ChildLessonAttempt;
  manualAnswers: ChildManualAnswers;
}) {
  const pending = attempt.manualCount - attempt.manualGradedCount;
  return (
    <li className="rounded-xl border border-[var(--border)] px-3 py-2.5">
      <p className="text-[14.5px] font-semibold text-[var(--heading)]">
        {attempt.title}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-1.5">
        {attempt.completedAt && (
          <Badge tone="success">{text.lessonCompleted}</Badge>
        )}
        {attempt.submittedAt && (
          <span className="text-[12.5px] text-[var(--muted)]">
            {text.autoScore(attempt.autoCorrect, attempt.autoTotal)}
          </span>
        )}
        {pending > 0 && (
          <Badge tone="warning">{text.pendingGrading(pending)}</Badge>
        )}
      </p>
      <p className="mt-1 text-[12.5px] text-[var(--muted)]">
        {text.startedAt(formatDateTime(attempt.startedAt))}
      </p>
      <ManualAnswerList answers={manualAnswers[attempt.id]} />
    </li>
  );
}
