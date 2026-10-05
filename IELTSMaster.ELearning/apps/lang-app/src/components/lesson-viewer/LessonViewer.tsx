'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, History, RotateCcw, Send, Undo2 } from 'lucide-react';
import {
  buildPlan,
  type ExamElement,
  type PreviewPlan,
  type Responses,
} from '@lang/exam-core';
import { ExamDocument } from '@/components/exam-simulator/ExamSimulator';
import {
  SimulatorProvider,
  useSimulator,
  type SimulatorExamMode,
  type SimulatorReview,
} from '@/components/exam-simulator/SimulatorState';
import {
  FormAlert,
  compactPrimaryButtonClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { formatDateTime } from '@/lib/format';

// Màn hình học bài dạng tài liệu (A6): tab theo section, nội dung liền mạch,
// không đồng hồ / lưới số câu. Section có câu hỏi: "Nộp phần này" → đúng/sai,
// đáp án, giải thích; "Làm lại" mở lại bài làm trống, kết quả lần trước vẫn
// xem được tới khi nộp lần mới. Dùng cho học thật (server chấm) và xem trước
// trong trình soạn (chấm ở trình duyệt).

const text = vi.lessonLearning;

export interface LessonViewerSection {
  id: string;
  name: string;
  /** content_public (học thật) hoặc raw_data (xem trước). */
  content: readonly unknown[];
  questionCount: number;
  /** Đang hiện kết quả lần nộp gần nhất (chưa bấm Làm lại). */
  submitted: boolean;
  submitCount: number;
  submittedAt: string | null;
  viewed: boolean;
  /** Câu trả lời đang làm. */
  responses: Responses;
  /** Kết quả lần nộp gần nhất; `null` khi chưa nộp. */
  review: SimulatorReview | null;
  /** Số câu chấm tay đã có điểm (học thật). */
  manualGradedCount?: number;
}

interface LessonViewerProps {
  sections: LessonViewerSection[];
  /** `false`: chỉ xem lại (không nộp/làm lại). */
  canSubmit: boolean;
  initialSectionId?: string;
  onView?: (sectionId: string) => void;
  onChange?: (sectionId: string, responses: Responses) => void;
  /** Đổi tab: lưu ngay bản đang làm. */
  onLeave?: (sectionId: string) => void;
  onSubmit: (sectionId: string, responses: Responses) => Promise<void>;
  onRetry: (sectionId: string) => Promise<void>;
  renderSpeaking?: (
    sectionId: string,
    no: number,
    seconds: number | undefined,
  ) => ReactNode;
  /** Chú thích / trạng thái lưu đặt cuối thanh tab. */
  aside?: ReactNode;
}

export function LessonViewer({
  sections,
  canSubmit,
  initialSectionId,
  onView,
  onChange,
  onLeave,
  onSubmit,
  onRetry,
  renderSpeaking,
  aside,
}: LessonViewerProps) {
  const [activeId, setActiveId] = useState(
    sections.some((s) => s.id === initialSectionId)
      ? initialSectionId!
      : sections[0]?.id,
  );
  const [showPrevious, setShowPrevious] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const section = sections.find((s) => s.id === activeId) ?? sections[0];

  const plan = useMemo(
    () => buildPlan((section?.content ?? []) as ExamElement[]),
    [section?.content],
  );

  // Mở tab lần đầu: ghi nhận đã xem (điều kiện học xong).
  const viewed = section?.viewed ?? true;
  useEffect(() => {
    if (section && !viewed) onView?.(section.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section?.id, viewed]);

  if (!section) return null;

  const select = (id: string) => {
    if (id === section.id) return;
    onLeave?.(section.id);
    setActiveId(id);
    setShowPrevious(false);
    setError(null);
  };

  const run = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setShowPrevious(false);
    } catch (err) {
      setError(errorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const reviewing =
    section.review !== null && (section.submitted || showPrevious);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 border-b border-[var(--border)]">
        <div role="tablist" className="flex min-w-0 gap-1 overflow-x-auto">
          {sections.map((item) => {
            const selected = item.id === section.id;
            const done =
              item.questionCount > 0 ? item.submitCount > 0 : item.viewed;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => select(item.id)}
                className={`-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13.5px] font-semibold transition ${
                  selected
                    ? 'border-[var(--accent)] text-[var(--heading)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--body)]'
                }`}
              >
                {done && (
                  <CheckCircle2
                    size={14}
                    className="text-[var(--ok)]"
                    aria-label={text.status.completed}
                  />
                )}
                {item.name}
              </button>
            );
          })}
        </div>
        {aside && (
          <div className="ml-auto pb-2.5 text-[12.5px] text-[var(--muted)]">
            {aside}
          </div>
        )}
      </div>

      {error && <FormAlert tone="error">{error}</FormAlert>}

      {reviewing ? (
        <SimulatorProvider
          key={`${section.id}:review:${section.submitCount}`}
          plan={plan}
          review={section.review}
          flags={false}
        >
          <ReviewBar
            section={section}
            previous={!section.submitted}
            actions={
              section.submitted ? (
                canSubmit && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(() => onRetry(section.id), vi.common.loadFailed)
                    }
                    className={secondaryButtonClass}
                  >
                    <RotateCcw size={15} />
                    {busy ? text.retrying : text.retry}
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPrevious(false)}
                  className={secondaryButtonClass}
                >
                  <Undo2 size={15} /> {text.backToDraft}
                </button>
              )
            }
          />
          <ExamDocument plan={plan} />
        </SimulatorProvider>
      ) : (
        <DraftSection
          key={`${section.id}:draft:${section.submitCount}`}
          section={section}
          plan={plan}
          canSubmit={canSubmit}
          busy={busy}
          onChange={onChange}
          onSubmit={(responses) =>
            run(
              () => onSubmit(section.id, responses),
              vi.examTaking.submitFailed,
            )
          }
          onShowPrevious={() => setShowPrevious(true)}
          renderSpeaking={renderSpeaking}
        />
      )}
    </div>
  );
}

function DraftSection({
  section,
  plan,
  canSubmit,
  busy,
  onChange,
  onSubmit,
  onShowPrevious,
  renderSpeaking,
}: {
  section: LessonViewerSection;
  plan: PreviewPlan;
  canSubmit: boolean;
  busy: boolean;
  onChange?: (sectionId: string, responses: Responses) => void;
  onSubmit: (responses: Responses) => void;
  onShowPrevious: () => void;
  renderSpeaking?: LessonViewerProps['renderSpeaking'];
}) {
  const { id } = section;
  // Chỉ đọc lúc dựng (provider giữ bản đang làm); `key` đổi khi nộp/làm lại.
  const [exam] = useState<SimulatorExamMode>(() => ({
    initialResponses: section.responses,
    onChange: (responses) => onChange?.(id, responses),
    onSubmit,
    locked: false,
    renderSpeaking: renderSpeaking
      ? (no, seconds) => renderSpeaking(id, no, seconds)
      : undefined,
  }));
  const mode = useMemo(
    () => ({ ...exam, onSubmit, locked: busy || !canSubmit }),
    [exam, onSubmit, busy, canSubmit],
  );

  return (
    <SimulatorProvider plan={plan} exam={mode} flags={false}>
      {section.review && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--sidebar)] px-4 py-2.5 text-[13.5px] text-[var(--body)]">
          <span className="min-w-0 flex-1">
            {text.submitCount(section.submitCount)}
          </span>
          <button
            type="button"
            onClick={onShowPrevious}
            className={secondaryButtonClass}
          >
            <History size={15} /> {text.viewPrevious}
          </button>
        </div>
      )}
      <ExamDocument plan={plan} />
      {section.questionCount === 0 ? (
        <p className="border-t border-[var(--border)] pt-3 text-[13px] text-[var(--muted)]">
          {text.noSubmitNeeded}
        </p>
      ) : (
        canSubmit && <SubmitBar plan={plan} busy={busy} />
      )}
    </SimulatorProvider>
  );
}

/** Cuối section: nộp (hỏi lại khi còn câu chưa làm). */
function SubmitBar({ plan, busy }: { plan: PreviewPlan; busy: boolean }) {
  const state = useSimulator();
  const [confirming, setConfirming] = useState(false);
  const numbers = plan.parts.flatMap((part) => part.numbers);
  const left = numbers.filter((n) => !state.answered.has(n)).length;

  return (
    <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--bg)] py-3">
      {confirming ? (
        <>
          <span className="text-[13px] text-[var(--warn)]">
            {left > 0 ? text.unanswered(left) : text.confirmSubmit}
          </span>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className={secondaryButtonClass}
          >
            {vi.simulator.keepGoing}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setConfirming(false);
              state.submit();
            }}
            className={compactPrimaryButtonClass}
          >
            <Send size={15} /> {busy ? text.submitting : text.submitSection}
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => (left > 0 ? setConfirming(true) : state.submit())}
          className={compactPrimaryButtonClass}
        >
          <Send size={15} /> {busy ? text.submitting : text.submitSection}
        </button>
      )}
    </div>
  );
}

/** Dải kết quả phía trên nội dung đã nộp. */
function ReviewBar({
  section,
  previous,
  actions,
}: {
  section: LessonViewerSection;
  previous: boolean;
  actions: ReactNode;
}) {
  const result = section.review!.result;
  const graded = section.manualGradedCount ?? 0;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
      <div className="min-w-0 flex-1">
        {result.total > 0 && (
          <p className="text-[18px] font-bold tabular-nums text-[var(--heading)]">
            {text.resultSummary(result.correct, result.total)}
          </p>
        )}
        <p className="text-[12.5px] text-[var(--muted)]">
          {[
            result.manual > 0 &&
              (graded >= result.manual
                ? text.manualDone(graded, result.manual)
                : text.manualPending(result.manual - graded)),
            section.submittedAt &&
              text.submittedAt(formatDateTime(section.submittedAt)),
            text.submitCount(section.submitCount),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {previous && (
          <p className="text-[12.5px] text-[var(--warn)]">
            {text.previousHint}
          </p>
        )}
      </div>
      {actions}
    </div>
  );
}
