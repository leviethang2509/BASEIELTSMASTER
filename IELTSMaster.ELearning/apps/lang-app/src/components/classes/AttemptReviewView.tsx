'use client';

import { useMemo, useState } from 'react';
import { buildPlan, type ExamElement } from '@lang/exam-core';
import type { AttemptReview, AttemptReviewSection } from '@lang/shared';
import { ExamDocument } from '@/components/exam-simulator/ExamSimulator';
import { SimulatorProvider } from '@/components/exam-simulator/SimulatorState';
import { reviewFromResult } from '@/components/lesson-viewer/lesson-review';
import { SubmittedRecording } from '@/components/lesson-learning/SubmittedRecording';
import { vi } from '@/i18n/vi';

const text = vi.classStudentAttempts;

/**
 * Xem lại bài làm của học viên (F4): nội dung đề/bài, câu trả lời đã nộp,
 * đúng/sai từng câu, đáp án, giải thích và điểm chấm tay. Chỉ đọc.
 */
export function AttemptReviewView({
  review,
  recordingUrl,
}: {
  review: AttemptReview;
  /** Link nghe lại ghi âm câu Speaking. */
  recordingUrl: (answerId: string) => Promise<{ url: string }>;
}) {
  const [activeId, setActiveId] = useState(review.sections[0]?.id);
  const section =
    review.sections.find((item) => item.id === activeId) ?? review.sections[0];

  if (!section) {
    return (
      <p className="py-10 text-center text-[14px] text-[var(--muted)]">
        {text.notSubmitted}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        className="flex min-w-0 gap-1 overflow-x-auto border-b border-[var(--border)]"
      >
        {review.sections.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === section.id}
            onClick={() => setActiveId(item.id)}
            className={`-mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-[13.5px] font-semibold transition ${
              item.id === section.id
                ? 'border-[var(--accent)] text-[var(--heading)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--body)]'
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>
      <ReviewSection
        key={section.id}
        section={section}
        recordingUrl={recordingUrl}
      />
    </div>
  );
}

function ReviewSection({
  section,
  recordingUrl,
}: {
  section: AttemptReviewSection;
  recordingUrl: (answerId: string) => Promise<{ url: string }>;
}) {
  const plan = useMemo(
    () => buildPlan(section.content as ExamElement[]),
    [section.content],
  );
  // Chỉ đọc lúc dựng: provider giữ trạng thái theo `key` của section.
  const [review] = useState(() => {
    const result = section.result;
    if (!result) return null;
    const recordings = new Map(
      result.questions.map((question) => [
        question.number,
        question.recordingAnswerId,
      ]),
    );
    return {
      ...reviewFromResult(result),
      renderSpeaking: (no: number) => {
        const answerId = recordings.get(no);
        return (
          <SubmittedRecording
            getUrl={answerId ? () => recordingUrl(answerId) : null}
          />
        );
      },
    };
  });

  if (!review) {
    return (
      <p className="py-8 text-center text-[14px] text-[var(--muted)]">
        {text.notSubmitted}
      </p>
    );
  }
  return (
    <SimulatorProvider plan={plan} review={review} flags={false}>
      <ExamDocument plan={plan} />
    </SimulatorProvider>
  );
}
