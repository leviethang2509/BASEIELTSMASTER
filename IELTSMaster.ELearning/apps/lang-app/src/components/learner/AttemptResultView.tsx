'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Timer } from 'lucide-react';
import type { AttemptResult } from '@lang/shared';
import { Badge, FormAlert, secondaryButtonClass } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { formatDateTime } from '@/lib/format';
import { getAttemptResult, learnerExamPath } from '@/lib/learner-api';
import { AttemptStatusBadge } from './AttemptStatusBadge';

const text = vi.learner;

/** Kết quả lượt làm: số câu đúng theo section và phần chấm tay, không có đáp án. */
export function AttemptResultView({
  slug: rawSlug,
  attemptId,
}: {
  slug: string;
  attemptId: string;
}) {
  const slug = rawSlug.toLowerCase();
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAttemptResult(slug, attemptId).then(
      (data) => {
        if (!cancelled) setResult(data);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, attemptId]);

  if (error) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-16">
        <FormAlert tone="error">{error}</FormAlert>
        <Link
          href={`/t/${slug}`}
          className={`${secondaryButtonClass} self-start`}
        >
          {text.backToTenant}
        </Link>
      </div>
    );
  }
  if (!result) {
    return (
      <p className="py-24 text-center text-[14px] text-[var(--muted)]">
        {vi.common.loading}
      </p>
    );
  }

  // Tổng điểm tự luận chỉ hiện khi mọi câu đã được chấm.
  const manualItems = result.sections.flatMap((section) => section.manual);
  const manualTotal =
    manualItems.length > 0 && manualItems.every((item) => item.score !== null)
      ? {
          score: manualItems.reduce((sum, item) => sum + (item.score ?? 0), 0),
          max: manualItems.reduce((sum, item) => sum + item.maxScore, 0),
        }
      : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8">
      <Link
        prefetch={false}
        href={learnerExamPath(slug, result.exam.id)}
        className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
      >
        <ArrowLeft size={15} /> {result.exam.title}
      </Link>

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_18px_44px_var(--shadow-1)] sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[24px] font-bold tracking-[-0.02em] text-[var(--heading)]">
            {text.resultTitle}
          </h1>
          <AttemptStatusBadge status={result.status} />
        </div>
        <p className="mt-1 text-[13.5px] text-[var(--muted)]">
          {text.startedAt(formatDateTime(result.startedAt))} ·{' '}
          {text.submittedAt(formatDateTime(result.submittedAt))}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[var(--sidebar)] px-4 py-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
              {text.autoTotal}
            </p>
            <p className="mt-1 text-[28px] font-bold tabular-nums text-[var(--heading)]">
              {text.score(result.autoCorrect, result.autoTotal)}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--sidebar)] px-4 py-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
              {text.manualHeading}
            </p>
            <p className="mt-2 text-[15px] font-semibold text-[var(--heading)]">
              {result.manualCount > 0
                ? text.manualProgress(
                    result.manualGradedCount,
                    result.manualCount,
                  )
                : text.noManual}
            </p>
            {manualTotal && (
              <p className="mt-1 text-[22px] font-bold tabular-nums text-[var(--heading)]">
                {text.manualTotal(manualTotal.score, manualTotal.max)}
              </p>
            )}
          </div>
        </div>
        <p className="mt-4 text-[13px] text-[var(--muted)]">
          {text.resultNote}
        </p>
      </section>

      <ol className="flex flex-col gap-3">
        {result.sections.map((section, index) => (
          <li
            key={section.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[12.5px] font-bold text-[var(--accent)]">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 font-semibold text-[var(--heading)]">
                {section.name}
              </span>
              {section.autoSubmitted && (
                <Badge tone="warning">
                  <Timer size={12} className="mr-1" /> {text.autoSubmitted}
                </Badge>
              )}
              {section.total > 0 && (
                <span className="text-[18px] font-bold tabular-nums text-[var(--heading)]">
                  {text.score(section.correct, section.total)}
                </span>
              )}
            </div>
            {section.manual.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2 border-t border-[var(--border)] pt-3">
                {section.manual.map((item) => (
                  <li key={item.number} className="text-[14px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-[var(--body)]">
                        {text.manualItem(
                          item.number,
                          text.qtypes[item.qtype] ?? item.qtype,
                        )}
                      </span>
                      {item.score === null ? (
                        <Badge tone="neutral">{text.waitingGrade}</Badge>
                      ) : (
                        <Badge tone="success">
                          {text.manualScore(item.score, item.maxScore)}
                        </Badge>
                      )}
                    </div>
                    {item.comment && (
                      <p className="mt-1 whitespace-pre-line rounded-lg bg-[var(--sidebar)] px-3 py-2 text-[13.5px] text-[var(--body)]">
                        {item.comment}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
