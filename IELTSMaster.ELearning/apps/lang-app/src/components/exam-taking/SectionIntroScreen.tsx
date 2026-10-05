'use client';

import { useState } from 'react';
import { Check, Play, Send } from 'lucide-react';
import {
  AttemptSectionStatus,
  type AttemptSectionSummary,
  type AttemptView,
} from '@lang/shared';
import { plainText, type ExamElement } from '@lang/exam-core';
import { ExamBlocks } from '@/components/exam-simulator/ExamSimulator';
import {
  ConfirmDialog,
  FormAlert,
  compactPrimaryButtonClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { ThemeToggle } from '@/theme';
import { ApiError } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { finishAttempt, startAttemptSection } from '@/lib/learner-api';
import { ExamHeader } from './ExamHeader';

const text = vi.examTaking;

/**
 * Màn hình trước mỗi section (cũng là màn hình chờ giữa hai section): phần
 * hướng dẫn, nút bắt đầu tính giờ và nút nộp toàn bài.
 */
export function SectionIntroScreen({
  slug,
  view,
  sectionIndex,
  intro,
  exitHref,
  onView,
  onReload,
}: {
  slug: string;
  view: AttemptView;
  sectionIndex: number;
  intro: ExamElement[];
  exitHref: string;
  onView: (view: AttemptView) => void;
  onReload: () => void;
}) {
  const section = view.sections[sectionIndex];
  const previous = sectionIndex > 0 ? view.sections[sectionIndex - 1] : null;
  const remaining = view.sections.filter(
    (item) => item.status !== AttemptSectionStatus.SUBMITTED,
  ).length;
  const [busy, setBusy] = useState<'start' | 'finish' | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Section mới tạo có sẵn một đoạn trống: coi như không có hướng dẫn.
  const hasIntro = intro.some(
    (node) => plainText(node).trim() !== '' || (node.type ?? 'p') !== 'p',
  );

  async function run(kind: 'start' | 'finish') {
    setBusy(kind);
    setError(null);
    try {
      onView(
        kind === 'start'
          ? await startAttemptSection(slug, view.id, section.id)
          : await finishAttempt(slug, view.id),
      );
    } catch (err) {
      setError(errorMessage(err, vi.common.loadFailed));
      // Trạng thái đã đổi ở nơi khác (tab khác, hết giờ): tải lại.
      if (err instanceof ApiError && err.status === 409) onReload();
    } finally {
      setBusy(null);
      setConfirmFinish(false);
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col">
      <ExamHeader
        examTitle={view.exam.title}
        sectionLabel={`${text.sectionOf(sectionIndex + 1, view.sections.length)} · ${section.name}`}
        exitHref={exitHref}
      />

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
          {previous && (
            <FormAlert tone={previous.autoSubmitted ? 'warning' : 'success'}>
              {previous.autoSubmitted
                ? text.justAutoSubmitted(previous.name)
                : text.justSubmitted(previous.name)}
            </FormAlert>
          )}

          <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_18px_44px_var(--shadow-1)] sm:p-8">
            <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--accent)]">
              {text.sectionOf(sectionIndex + 1, view.sections.length)}
            </p>
            <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-[-0.02em] text-[var(--heading)]">
              {section.name}
            </h1>
            <p className="mt-1 text-[14px] text-[var(--muted)]">
              {text.sectionInfo(section.durationMinutes, section.questionCount)}
            </p>

            {/* Đổi giao diện chỉ có ở đây: bấm "Bắt đầu" là đồng hồ chạy, lúc
                đó màn hình thi không có nút nào ngoài việc làm bài (req-4 C2). */}
            <div className="mt-3 flex items-center gap-2 text-[13px] text-[var(--muted)]">
              <ThemeToggle />
              <span>{vi.theme.label}</span>
            </div>

            <div className="mt-5 border-t border-[var(--border)] pt-4">
              {hasIntro ? (
                <ExamBlocks blocks={intro} />
              ) : (
                <p className="text-[14px] text-[var(--muted)]">
                  {text.noIntro}
                </p>
              )}
            </div>

            {error && (
              <div className="mt-5">
                <FormAlert tone="error">{error}</FormAlert>
              </div>
            )}
            <p className="mt-5 text-[13px] text-[var(--muted)]">
              {text.startHint}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => run('start')}
                disabled={busy !== null}
                className={compactPrimaryButtonClass}
              >
                <Play size={15} />
                {busy === 'start' ? text.starting : text.startSection}
              </button>
              <button
                type="button"
                onClick={() => setConfirmFinish(true)}
                disabled={busy !== null}
                className={secondaryButtonClass}
              >
                <Send size={15} /> {text.finish}
              </button>
            </div>
          </section>

          <SectionSteps sections={view.sections} current={sectionIndex} />
        </div>
      </main>

      <ConfirmDialog
        open={confirmFinish}
        title={text.finishTitle}
        message={text.finishMessage(remaining)}
        confirmLabel={text.finish}
        tone="danger"
        loading={busy === 'finish'}
        onConfirm={() => run('finish')}
        onCancel={() => setConfirmFinish(false)}
      />
    </div>
  );
}

function SectionSteps({
  sections,
  current,
}: {
  sections: AttemptSectionSummary[];
  current: number;
}) {
  return (
    <ol className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      {sections.map((item, index) => {
        const done = item.status === AttemptSectionStatus.SUBMITTED;
        return (
          <li
            key={item.id}
            className={`flex items-center gap-3 px-4 py-2.5 text-[14px] ${
              index === current ? 'bg-[var(--accent-soft)]' : ''
            }`}
          >
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
                done
                  ? 'bg-[var(--ok)] text-[var(--on-status)]'
                  : 'bg-[var(--hover)] text-[var(--body)]'
              }`}
            >
              {done ? <Check size={13} /> : index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-[var(--heading)]">
              {item.name}
            </span>
            <span className="shrink-0 text-[12.5px] text-[var(--muted)]">
              {text.sectionStatus[item.status]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
