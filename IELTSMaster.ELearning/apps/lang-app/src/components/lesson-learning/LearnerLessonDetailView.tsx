'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Eye, Play } from 'lucide-react';
import type { LearnerLessonDetail } from '@lang/shared';
import { CategoryIcon } from '@/components/catalog/catalog-ui';
import {
  Badge,
  FormAlert,
  compactPrimaryButtonClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { ApiError } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { formatDateTime } from '@/lib/format';
import {
  getLearnerLesson,
  lessonAttemptPath,
  startLessonAttempt,
} from '@/lib/lesson-learner-api';
import { LessonStatusBadge } from './LessonStatusBadge';

const text = vi.lessonLearning;

/** Thông tin bài học, nút học / học tiếp và các lượt học của tôi. */
export function LearnerLessonDetailView({
  slug: rawSlug,
  lessonId,
}: {
  slug: string;
  lessonId: string;
}) {
  const slug = rawSlug.toLowerCase();
  const router = useRouter();
  const [lesson, setLesson] = useState<LearnerLessonDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const load = useCallback(() => {
    getLearnerLesson(slug, lessonId).then(setLesson, (err: unknown) =>
      setLoadError(errorMessage(err, vi.common.loadFailed)),
    );
  }, [slug, lessonId]);

  useEffect(load, [load]);

  async function start() {
    setStarting(true);
    setActionError(null);
    try {
      const attempt = await startLessonAttempt(slug, lessonId);
      router.push(lessonAttemptPath(slug, attempt.id));
    } catch (err) {
      setStarting(false);
      setActionError(errorMessage(err, vi.common.loadFailed));
      // Bài vừa ngừng mở: tải lại để hiện đúng trạng thái.
      if (err instanceof ApiError && err.status === 409) load();
    }
  }

  const back = (
    <Link
      href={`/t/${slug}`}
      className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
    >
      <ArrowLeft size={15} /> {text.backToTenant}
    </Link>
  );

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-16">
        <FormAlert tone="error">{loadError}</FormAlert>
        {back}
      </div>
    );
  }
  if (!lesson) {
    return (
      <p className="py-24 text-center text-[14px] text-[var(--muted)]">
        {vi.common.loading}
      </p>
    );
  }

  const { category } = lesson.blueprint;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-8">
      {back}

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_18px_44px_var(--shadow-1)] sm:p-8">
        <div className="flex items-center gap-2.5">
          <CategoryIcon icon={category.icon} color={category.color} />
          <span className="min-w-0 flex-1 text-[13px] font-semibold text-[var(--muted)]">
            {category.name} · {lesson.blueprint.name}
          </span>
          {lesson.myAttempt && (
            <LessonStatusBadge status={lesson.myAttempt.status} />
          )}
        </div>
        <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-[-0.02em] text-[var(--heading)] sm:text-[30px]">
          {lesson.title}
        </h1>
        {lesson.description && (
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-[var(--body)]">
            {lesson.description}
          </p>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[13.5px] text-[var(--muted)]">
          <BookOpen size={15} />
          {text.lessonStats(lesson.sectionCount, lesson.questionCount)}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {actionError && <FormAlert tone="error">{actionError}</FormAlert>}
          {lesson.isOpen ? (
            <>
              <p className="text-[13.5px] text-[var(--body)]">
                {text.startHint}
              </p>
              <button
                type="button"
                onClick={start}
                disabled={starting}
                className={`${compactPrimaryButtonClass} self-start`}
              >
                <Play size={15} />
                {starting
                  ? text.starting
                  : lesson.myAttempt
                    ? text.continue
                    : text.start}
              </button>
            </>
          ) : (
            <FormAlert tone="warning">{text.closed}</FormAlert>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
          {text.sectionsHeading}
        </h2>
        <ol className="mt-3 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          {lesson.sections.map((section, index) => (
            <li
              key={index}
              className="flex items-center gap-3 px-4 py-3 text-[14px]"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[12.5px] font-bold text-[var(--accent)]">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 font-semibold text-[var(--heading)]">
                {section.name}
              </span>
              <span className="shrink-0 text-[13px] text-[var(--muted)]">
                {section.questionCount > 0
                  ? text.questions(section.questionCount)
                  : text.theory}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
          {text.historyHeading}
        </h2>
        {lesson.attempts.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-[var(--border-strong)] px-4 py-8 text-center text-[14px] text-[var(--body)]">
            {text.noAttempts}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            {lesson.attempts.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="min-w-0 flex-1 text-[14px]">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-[var(--heading)]">
                    {text.version(item.lessonVersion)}
                    {!item.canSubmit && (
                      <Badge tone="neutral">{text.oldVersion}</Badge>
                    )}
                  </p>
                  <p className="text-[12.5px] text-[var(--muted)]">
                    {[
                      vi.learner.startedAt(formatDateTime(item.startedAt)),
                      text.progress(
                        item.viewedSectionCount,
                        item.sectionCount,
                        item.submittedSectionCount,
                        item.questionSectionCount,
                      ),
                      item.autoTotal > 0 &&
                        text.autoScore(item.autoCorrect, item.autoTotal),
                      item.manualCount > 0 &&
                        text.manualProgress(
                          item.manualGradedCount,
                          item.manualCount,
                        ),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <LessonStatusBadge status={item.status} />
                  <Link
                    prefetch={false}
                    href={lessonAttemptPath(slug, item.id)}
                    className={secondaryButtonClass}
                  >
                    {item.canSubmit ? <Play size={15} /> : <Eye size={15} />}
                    {item.canSubmit ? text.continue : text.review}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
