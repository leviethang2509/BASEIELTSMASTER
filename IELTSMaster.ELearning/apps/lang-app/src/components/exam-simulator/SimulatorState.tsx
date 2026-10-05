'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Flag, RotateCcw, Send } from 'lucide-react';
import {
  emptyResponses,
  gradeExam,
  type ExamElement,
  type GradeResult,
  type PreviewPlan,
  type Responses,
  type Verdict,
} from '@lang/exam-core';
import type { QuestionType } from '@lang/shared';
import { vi } from '@/i18n/vi';

// Trạng thái làm bài của bản giả lập: câu nào đã trả lời, câu nào gắn cờ, đang
// xem part nào, câu trả lời để chấm và kết quả sau khi nộp. Provider bọc cả
// phần đề lẫn footer (bảng số câu) để cùng đọc một nguồn.
//
// Hai chế độ: xem trước trong dashboard (chấm ngay ở trình duyệt, làm lại được)
// và thi thật (`exam`): câu trả lời ban đầu lấy từ server, mỗi thay đổi báo ra
// ngoài để autosave, nộp bài do trang thi gửi lên server.

const text = vi.simulator;

export type AnswerStatus = 'todo' | 'flagged' | 'answered' | Verdict;

interface Respond {
  value: (no: number, input: string) => void;
  picks: (no: number, indexes: number[]) => void;
  order: (no: number, indexes: number[]) => void;
}

/** Cấu hình chế độ thi thật. */
export interface SimulatorExamMode {
  /** Câu trả lời đã lưu (làm tiếp sau khi tải lại trang). */
  initialResponses: Responses;
  /** Gọi sau mỗi thay đổi câu trả lời, nhận bản đang giữ (không sao chép). */
  onChange: (responses: Responses) => void;
  /** Đổi tab Part: trang thi lưu ngay thay vì chờ debounce. */
  onTabChange?: () => void;
  onSubmit: (responses: Responses) => void;
  /** Đang nộp: khoá mọi ô nhập và nút nộp. */
  locked: boolean;
  /** Ô ghi âm của câu Speaking (component nằm ở trang thi). */
  renderSpeaking?: (no: number, seconds: number | undefined) => ReactNode;
  /** Khoá localStorage để giữ câu gắn cờ khi tải lại trang. */
  flagStorageKey?: string;
}

/** Đáp án của một số câu (`AnswerKey` của exam-core) để hiện sau khi nộp. */
export interface ReviewAnswer {
  qtype: QuestionType;
  answerKey: unknown;
}

/** Điểm chấm tay của một câu Speaking/Writing. */
export interface ReviewManualScore {
  score: number | null;
  maxScore: number;
  comment: string | null;
}

/**
 * Chế độ xem kết quả của bài học: mọi ô khoá, hiện câu trả lời đã nộp, đúng/sai,
 * đáp án đúng và giải thích. Kết quả do server chấm (học thật) hoặc chấm ở
 * client (xem trước trong trình soạn).
 */
export interface SimulatorReview {
  result: GradeResult;
  responses: Responses;
  /** Theo số câu; câu chấm tay không có. */
  answers: ReadonlyMap<number, ReviewAnswer>;
  /** Giải thích theo id indicator (content_public chỉ còn indicator rỗng). */
  explanations: ReadonlyMap<string, readonly ExamElement[]>;
  /** Điểm chấm tay theo số câu (chưa chấm thì `score` là `null`). */
  manual?: ReadonlyMap<number, ReviewManualScore>;
  /** Ô nghe lại ghi âm đã nộp của câu Speaking. */
  renderSpeaking?: (no: number) => ReactNode;
}

interface SimulatorState {
  answered: ReadonlySet<number>;
  flagged: ReadonlySet<number>;
  tab: number;
  setTab: (tab: number) => void;
  /** Cập nhật trạng thái đã trả lời, dạng `{ số câu: đã trả lời? }`. */
  mark: (changes: Record<number, boolean>) => void;
  toggleFlag: (nos: number[]) => void;
  /** Mở tab chứa câu `no`, cuộn tới và focus ô trả lời. */
  goTo: (no: number) => void;
  /** Ghi câu trả lời để chấm — không gây render lại. */
  respond: Respond;
  /** Câu trả lời lúc dựng ô nhập (giá trị ban đầu của từng ô). */
  initial: Responses;
  /** Kết quả sau khi nộp (xem trước hoặc `review`); `null` khi đang làm. */
  result: GradeResult | null;
  /** Đáp án + giải thích của bài học đã nộp; `null` ở đề thi. */
  review: SimulatorReview | null;
  /** Bấm số câu để gắn cờ (bài học không dùng). */
  flags: boolean;
  /** Có kết quả hoặc đang nộp bài thi: mọi ô bị khoá. */
  locked: boolean;
  exam: SimulatorExamMode | null;
  /** Tăng mỗi lần làm lại — làm key để dựng lại toàn bộ ô nhập. */
  attempt: number;
  submit: () => void;
  retry: () => void;
}

const SimulatorContext = createContext<SimulatorState | null>(null);

export function useSimulator(): SimulatorState {
  const state = useContext(SimulatorContext);
  if (!state) throw new Error('useSimulator phải nằm trong SimulatorProvider');
  return state;
}

const cloneResponses = (responses: Responses): Responses =>
  JSON.parse(JSON.stringify(responses)) as Responses;

function readFlags(key: string | undefined): ReadonlySet<number> {
  if (!key) return new Set();
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return new Set(
      Array.isArray(saved) ? saved.filter((n) => Number.isInteger(n)) : [],
    );
  } catch {
    return new Set();
  }
}

export function SimulatorProvider({
  plan,
  exam = null,
  review = null,
  flags = true,
  children,
}: {
  plan: PreviewPlan;
  exam?: SimulatorExamMode | null;
  /** Hiện kết quả đã có (chỉ đọc lúc dựng: đổi thì dựng lại provider bằng `key`). */
  review?: SimulatorReview | null;
  flags?: boolean;
  children: ReactNode;
}) {
  const flagKey = exam?.flagStorageKey;
  const [answered, setAnswered] = useState<ReadonlySet<number>>(new Set());
  const [flagged, setFlagged] = useState<ReadonlySet<number>>(() =>
    readFlags(flagKey),
  );
  const [tab, setTabState] = useState(0);
  const [reviewed] = useState(review);
  const [result, setResult] = useState<GradeResult | null>(
    reviewed?.result ?? null,
  );
  const [attempt, setAttempt] = useState(0);
  // Chỉ đọc lúc dựng: trang thi truyền lại object mới mỗi lần render.
  const [initial] = useState(() =>
    reviewed
      ? cloneResponses(reviewed.responses)
      : exam
        ? cloneResponses(exam.initialResponses)
        : emptyResponses(),
  );
  const responses = useRef<Responses>(cloneResponses(initial));
  const examRef = useRef(exam);
  examRef.current = exam;

  useEffect(() => {
    if (!flagKey) return;
    try {
      localStorage.setItem(flagKey, JSON.stringify([...flagged]));
    } catch {
      // Trình duyệt chặn localStorage: chỉ mất cờ khi tải lại trang.
    }
  }, [flagKey, flagged]);

  const mark = useCallback((changes: Record<number, boolean>) => {
    setAnswered((prev) => {
      const next = new Set(prev);
      for (const [key, done] of Object.entries(changes)) {
        if (done) next.add(Number(key));
        else next.delete(Number(key));
      }
      return next.size === prev.size && [...next].every((n) => prev.has(n))
        ? prev
        : next;
    });
  }, []);

  const toggleFlag = useCallback((nos: number[]) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      const on = !nos.every((n) => prev.has(n));
      for (const n of nos) {
        if (on) next.add(n);
        else next.delete(n);
      }
      return next;
    });
  }, []);

  const setTab = useCallback((next: number) => {
    setTabState((prev) => {
      if (prev !== next) examRef.current?.onTabChange?.();
      return next;
    });
  }, []);

  const goTo = useCallback(
    (no: number) => {
      const part = plan.parts.findIndex((p) => p.numbers.includes(no));
      if (part >= 0) setTab(part);
      // Đợi tab mới được hiện ra rồi mới cuộn được.
      requestAnimationFrame(() => {
        const badge = document.querySelector<HTMLElement>(
          `[data-sim-q~="${no}"]`,
        );
        badge?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const field =
          document.querySelector<HTMLElement>(`[data-sim-field="${no}"]`) ??
          badge;
        field?.focus({ preventScroll: true });
      });
    },
    [plan, setTab],
  );

  const respond = useMemo<Respond>(() => {
    const changed = () => examRef.current?.onChange(responses.current);
    return {
      value: (no, input) => {
        responses.current.value[no] = input;
        changed();
      },
      picks: (no, indexes) => {
        responses.current.picks[no] = indexes;
        changed();
      },
      order: (no, indexes) => {
        responses.current.order[no] = indexes;
        changed();
      },
    };
  }, []);

  const submit = useCallback(() => {
    if (examRef.current) examRef.current.onSubmit(responses.current);
    else setResult(gradeExam(plan, responses.current));
  }, [plan]);

  const retry = useCallback(() => {
    responses.current = emptyResponses();
    setAnswered(new Set());
    setFlagged(new Set());
    setResult(null);
    setAttempt((a) => a + 1);
  }, []);

  const examLocked = !!exam?.locked;
  const value = useMemo(
    () => ({
      answered,
      flagged,
      tab,
      setTab,
      mark,
      toggleFlag,
      goTo,
      respond,
      initial,
      result,
      review: result ? reviewed : null,
      flags,
      locked: !!result || examLocked,
      exam: examRef.current,
      attempt,
      submit,
      retry,
    }),
    [
      answered,
      flagged,
      tab,
      setTab,
      mark,
      toggleFlag,
      goTo,
      respond,
      initial,
      result,
      reviewed,
      flags,
      examLocked,
      attempt,
      submit,
      retry,
    ],
  );

  return (
    <SimulatorContext.Provider value={value}>
      {children}
    </SimulatorContext.Provider>
  );
}

function statusOf(state: SimulatorState, nos: number[]): AnswerStatus {
  if (state.result) {
    const verdicts = nos.map((n) => state.result!.verdicts[n] ?? 'wrong');
    if (verdicts.every((v) => v === 'correct')) return 'correct';
    if (verdicts.every((v) => v === 'manual')) return 'manual';
    return 'wrong';
  }
  // Gắn cờ được ưu tiên hiển thị: người làm bài cờ lại để xem lại sau.
  if (nos.some((n) => state.flagged.has(n))) return 'flagged';
  if (nos.every((n) => state.answered.has(n))) return 'answered';
  return 'todo';
}

const STATUS_CLASS: Record<AnswerStatus, string> = {
  todo: 'border-[var(--border-strong)] bg-[var(--card)] text-[var(--heading)] hover:border-[var(--accent)]',
  answered: 'border-[var(--info)] bg-[var(--info)] text-[var(--on-status)]',
  flagged: 'border-[var(--warn)] bg-[var(--warn)] text-[var(--on-status)]',
  correct: 'border-[var(--ok)] bg-[var(--ok)] text-[var(--on-status)]',
  wrong: 'border-[var(--danger)] bg-[var(--danger)] text-[var(--on-status)]',
  manual:
    'border-dashed border-[var(--border-strong)] bg-[var(--sidebar)] text-[var(--muted)]',
};

/** Badge số câu nằm inline trong đề. Đang làm bài: bấm để gắn / gỡ cờ. */
export function QuestionBadge({ nos }: { nos: number[] }) {
  const state = useSimulator();
  if (nos.length === 0) return null;

  const status = statusOf(state, nos);
  const label =
    nos.length > 1 ? `${nos[0]}–${nos[nos.length - 1]}` : String(nos[0]);

  return (
    <button
      type="button"
      data-sim-q={nos.join(' ')}
      onClick={() => {
        if (!state.result && state.flags) state.toggleFlag(nos);
      }}
      title={
        state.result || !state.flags
          ? text.badgeResult(label, text.status[status])
          : text.badgeFlag(label, status === 'flagged')
      }
      className={`mr-1.5 inline-flex h-[22px] min-w-[26px] items-center justify-center gap-1 rounded-md border px-1.5 align-middle text-[12.5px] font-bold leading-none tabular-nums transition ${STATUS_CLASS[status]}`}
    >
      {status === 'flagged' && <Flag size={11} strokeWidth={2.5} />}
      {label}
    </button>
  );
}

/** Dải kết quả phía trên đề sau khi nộp. */
export function ResultSummary() {
  const { result } = useSimulator();
  if (!result) return null;
  return (
    <div className="flex shrink-0 flex-wrap items-baseline gap-x-2 border-b border-[var(--border)] bg-[var(--card)] px-5 py-2.5">
      <span className="text-[20px] font-bold tabular-nums text-[var(--heading)]">
        {result.correct} / {result.total}
      </span>
      <span className="text-[13.5px] text-[var(--body)]">
        {text.correctSummary(result.manual)}
      </span>
    </div>
  );
}

const buttonClass =
  'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';

/** Footer: toàn bộ số câu theo từng part, bấm để nhảy tới; nút nộp / làm lại. */
export function AnswerNav({ plan }: { plan: PreviewPlan }) {
  const state = useSimulator();
  const [confirming, setConfirming] = useState(false);

  const numbers = plan.parts.flatMap((p) => p.numbers);
  const done = numbers.filter((n) => state.answered.has(n)).length;
  const legend: AnswerStatus[] = state.result
    ? ['correct', 'wrong', 'manual']
    : ['todo', 'flagged', 'answered'];
  const submitLabel = state.exam ? text.submitSection : text.submit;

  const submit = () => {
    setConfirming(false);
    state.submit();
  };

  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex max-h-[92px] flex-wrap items-center gap-x-5 gap-y-1.5 overflow-auto">
        {plan.parts.map((part, p) =>
          part.numbers.length === 0 ? null : (
            <div key={part.key} className="flex flex-wrap items-center gap-1">
              <span
                className={`mr-1 text-[11.5px] font-semibold uppercase tracking-wide ${
                  p === state.tab
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--muted)]'
                }`}
              >
                Part {p + 1}
              </span>
              {part.numbers.map((no) => {
                const status = statusOf(state, [no]);
                return (
                  <button
                    key={no}
                    type="button"
                    onClick={() => state.goTo(no)}
                    title={text.badgeResult(String(no), text.status[status])}
                    className={`inline-flex h-[26px] min-w-[28px] items-center justify-center rounded-md border px-1 text-[12.5px] font-bold tabular-nums transition ${STATUS_CLASS[status]}`}
                  >
                    {no}
                  </button>
                );
              })}
            </div>
          ),
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[var(--muted)]">
        {legend.map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              className={`inline-block h-[12px] w-[12px] rounded-[3px] border ${STATUS_CLASS[status]}`}
            />
            {text.status[status]}
          </span>
        ))}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {state.result ? (
            <>
              <span>{text.reviewHint}</span>
              <button
                type="button"
                onClick={state.retry}
                className={`${buttonClass} border border-[var(--border-strong)] text-[var(--body)] hover:bg-[var(--hover)]`}
              >
                <RotateCcw size={14} /> {text.retry}
              </button>
            </>
          ) : confirming ? (
            <>
              <span className="text-[var(--warn)]">
                {done < numbers.length
                  ? text.unanswered(numbers.length - done)
                  : text.confirmSubmit}
              </span>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className={`${buttonClass} border border-[var(--border-strong)] text-[var(--body)] hover:bg-[var(--hover)]`}
              >
                {text.keepGoing}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={state.locked}
                className={`${buttonClass} bg-[var(--accent-bg)] text-white hover:opacity-90`}
              >
                <Send size={14} /> {text.submitAnyway}
              </button>
            </>
          ) : (
            <>
              <span>{text.progress(done, numbers.length)}</span>
              <button
                type="button"
                disabled={state.locked}
                onClick={() =>
                  // Thi thật luôn hỏi lại: nộp xong không sửa được nữa.
                  done < numbers.length || state.exam
                    ? setConfirming(true)
                    : submit()
                }
                className={`${buttonClass} bg-[var(--accent-bg)] text-white hover:opacity-90`}
              >
                <Send size={14} /> {submitLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
