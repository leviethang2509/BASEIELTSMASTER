'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Play } from 'lucide-react';
import { type LearnerExamDetail } from '@lang/shared';
import { CategoryIcon } from '@/components/catalog/catalog-ui';
import {
  FormAlert,
  compactPrimaryButtonClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { ApiError } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { formatDateTime } from '@/lib/format';
import { attemptPath, getLearnerExam, startAttempt } from '@/lib/learner-api';
import { AttemptActionLink } from './AttemptActionLink';
import { AttemptStatusBadge, attemptScoreText } from './AttemptStatusBadge';

const text = vi.learner;

/** Thông tin đề, nút bắt đầu / làm tiếp và lịch sử lượt làm của tôi. */
export function LearnerExamDetailView({
  slug: rawSlug,
  examId,
}: {
  slug: string;
  examId: string;
}) {
  const slug = rawSlug.toLowerCase();
  const router = useRouter();
  const [exam, setExam] = useState<LearnerExamDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const load = useCallback(() => {
    getLearnerExam(slug, examId).then(setExam, (err: unknown) =>
      setLoadError(errorMessage(err, vi.common.loadFailed)),
    );
  }, [slug, examId]);

  useEffect(load, [load]);

  async function start() {
    setStarting(true);
    setActionError(null);
    try {
      const attempt = await startAttempt(slug, examId);
      router.push(attemptPath(slug, attempt.id));
    } catch (err) {
      setStarting(false);
      setActionError(errorMessage(err, vi.common.loadFailed));
      // Đã có lượt dở (tab khác) hoặc đề vừa ngừng mở: tải lại để hiện nút đúng.
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
  if (!exam) {
    return (
      <p className="py-24 text-center text-[14px] text-[var(--muted)]">
        {vi.common.loading}
      </p>
    );
  }

  const { category } = exam.blueprint;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-8">
      {back}

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_18px_44px_var(--shadow-1)] sm:p-8">
        <div className="flex items-center gap-2.5">
          <CategoryIcon icon={category.icon} color={category.color} />
          <span className="text-[13px] font-semibold text-[var(--muted)]">
            {category.name} · {exam.blueprint.name}
          </span>
        </div>
        <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-[-0.02em] text-[var(--heading)] sm:text-[30px]">
          {exam.title}
        </h1>
        {exam.description && (
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-[var(--body)]">
            {exam.description}
          </p>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[13.5px] text-[var(--muted)]">
          <Clock size={15} />
          {text.examStats(
            exam.sectionCount,
            exam.questionCount,
            exam.totalDurationMinutes,
          )}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {actionError && <FormAlert tone="error">{actionError}</FormAlert>}
          {!exam.isOpen && !exam.inProgressAttemptId ? (
            <FormAlert tone="warning">{text.closed}</FormAlert>
          ) : exam.inProgressAttemptId ? (
            <>
              <p className="text-[13.5px] text-[var(--body)]">
                {text.inProgressHint}
              </p>
              <Link
                prefetch={false}
                href={attemptPath(slug, exam.inProgressAttemptId)}
                className={`${compactPrimaryButtonClass} self-start`}
              >
                <Play size={15} /> {text.continue}
              </Link>
            </>
          ) : (
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
                <Play size={15} /> {starting ? text.starting : text.start}
              </button>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
          {text.sectionsHeading}
        </h2>
        <ol className="mt-3 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          {exam.sections.map((section, index) => (
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
                {text.questions(section.questionCount)} ·{' '}
                {text.minutes(section.durationMinutes)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
          {text.historyHeading}
        </h2>
        {exam.attempts.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-[var(--border-strong)] px-4 py-8 text-center text-[14px] text-[var(--body)]">
            {text.noAttempts}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            {exam.attempts.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="min-w-0 flex-1 text-[14px]">
                  <p className="font-medium text-[var(--heading)]">
                    {text.startedAt(formatDateTime(item.startedAt))}
                  </p>
                  <p className="text-[12.5px] text-[var(--muted)]">
                    {attemptScoreText(item)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <AttemptStatusBadge status={item.status} />
                  <AttemptActionLink slug={slug} item={item} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href={`/t/${slug}`}
        className={`${secondaryButtonClass} self-start`}
      >
        {text.backToTenant}
      </Link>
    </div>
  );
}
