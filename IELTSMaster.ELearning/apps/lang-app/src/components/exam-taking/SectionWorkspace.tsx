'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CloudOff, Loader2, Send } from 'lucide-react';
import { buildPlan, type ExamElement, type Responses } from '@lang/exam-core';
import type { AttemptCurrentSection, AttemptView } from '@lang/shared';
import { ExamSimulator } from '@/components/exam-simulator/ExamSimulator';
import {
  AnswerNav,
  SimulatorProvider,
  type SimulatorExamMode,
} from '@/components/exam-simulator/SimulatorState';
import { FormAlert, compactPrimaryButtonClass } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { ApiError } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import {
  getRecordingUrl,
  saveAttemptResponses,
  submitAttemptSection,
  uploadRecording,
} from '@/lib/learner-api';
import { Countdown } from './Countdown';
import { ExamHeader } from './ExamHeader';
import { SpeakingRecorder } from './SpeakingRecorder';

const text = vi.examTaking;

/** Autosave sau khi ngừng trả lời (plan giả định 7). */
const AUTOSAVE_DELAY_MS = 3000;
const RETRY_DELAY_MS = 5000;

type SaveState = keyof typeof text.saveState;
type InProgress = Extract<AttemptCurrentSection, { status: 'in_progress' }>;

const clone = (responses: Responses): Responses =>
  JSON.parse(JSON.stringify(responses)) as Responses;

const flagStorageKey = (attemptId: string, sectionId: string) =>
  `attempt:${attemptId}:${sectionId}:flags`;

/**
 * Section đang làm: đề (content_public), autosave câu trả lời, đồng hồ theo
 * `deadline_at` của server, nộp sớm / tự nộp khi hết giờ.
 */
export function SectionWorkspace({
  slug,
  view,
  current,
  sectionIndex,
  clockOffsetMs,
  exitHref,
  onView,
  onReload,
}: {
  slug: string;
  view: AttemptView;
  current: InProgress;
  sectionIndex: number;
  clockOffsetMs: number;
  exitHref: string;
  onView: (view: AttemptView) => void;
  onReload: () => void;
}) {
  const section = view.sections[sectionIndex];
  const attemptId = view.id;
  const { sectionId } = current;
  const plan = useMemo(
    () => buildPlan(current.content as ExamElement[]),
    [current.content],
  );
  const hasNumbers = plan.parts.some((part) => part.numbers.length > 0);

  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [submitting, setSubmitting] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const latest = useRef<Responses>(current.responses as Responses);
  const dirty = useRef(false);
  const saving = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const submittingRef = useRef(false);
  const unmounted = useRef(false);
  // Hàm mới nhất cho setTimeout/listener mà không phải đăng ký lại.
  const actions = useRef({
    save: async () => undefined as void,
    submit: async (_responses: Responses, _auto: boolean) => undefined as void,
  });

  actions.current.save = async () => {
    clearTimeout(timer.current);
    // Mỗi lúc chỉ một request lưu để bản cũ không ghi đè bản mới.
    if (saving.current) await saving.current;
    if (!dirty.current || submittingRef.current || unmounted.current) return;
    dirty.current = false;
    setSaveState('saving');
    const request = saveAttemptResponses(
      slug,
      attemptId,
      sectionId,
      clone(latest.current),
    ).then(
      () => {
        if (!unmounted.current) setSaveState(dirty.current ? 'dirty' : 'saved');
      },
      (err: unknown) => {
        dirty.current = true;
        if (unmounted.current) return;
        // Hết giờ hoặc section đã được chốt: lấy trạng thái mới từ server.
        if (err instanceof ApiError && err.status === 409) {
          onReload();
          return;
        }
        setSaveState('error');
        timer.current = setTimeout(
          () => void actions.current.save(),
          RETRY_DELAY_MS,
        );
      },
    );
    saving.current = request.finally(() => {
      saving.current = null;
    });
    await saving.current;
  };

  actions.current.submit = async (responses, auto) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    clearTimeout(timer.current);
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (saving.current) await saving.current;
      const next = await submitAttemptSection(
        slug,
        attemptId,
        sectionId,
        clone(responses),
      );
      dirty.current = false;
      try {
        localStorage.removeItem(flagStorageKey(attemptId, sectionId));
      } catch {
        // Không xoá được thì thôi.
      }
      onView(next);
    } catch (err) {
      submittingRef.current = false;
      if (unmounted.current) return;
      setSubmitting(false);
      setSubmitError(errorMessage(err, text.submitFailed));
      // Tự nộp lúc hết giờ mà lỗi mạng: thử lại, server vẫn nhận trong thời gian trễ
      // và nếu quá hạn thì tự chốt bằng câu trả lời đã lưu.
      if (auto) {
        timer.current = setTimeout(
          () => void actions.current.submit(latest.current, true),
          RETRY_DELAY_MS,
        );
      }
    }
  };

  const onChange = useCallback((responses: Responses) => {
    latest.current = responses;
    dirty.current = true;
    setSaveState('dirty');
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => void actions.current.save(),
      AUTOSAVE_DELAY_MS,
    );
  }, []);

  const flush = useCallback(() => void actions.current.save(), []);

  const onSubmit = useCallback(
    (responses: Responses) => void actions.current.submit(responses, false),
    [],
  );

  const onExpire = useCallback(() => {
    setTimeUp(true);
    void actions.current.submit(latest.current, true);
  }, []);

  useEffect(() => {
    // StrictMode (dev) gỡ rồi dựng lại effect: đặt lại cờ mỗi lần dựng.
    unmounted.current = false;
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      flush();
      event.preventDefault();
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      unmounted.current = true;
      clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [flush]);

  const recordings = useMemo(
    () => new Map(current.recordings.map((item) => [item.number, item])),
    [current.recordings],
  );
  const answerIds = useRef(new Map<number, string>());
  const renderSpeaking = useCallback(
    (no: number, seconds: number | undefined) => (
      <SpeakingRecorder
        no={no}
        seconds={seconds}
        initial={recordings.get(no)}
        upload={async (file) => {
          const recording = await uploadRecording(
            slug,
            attemptId,
            sectionId,
            no,
            file,
          );
          // Nghe lại bản vừa tải lên cần id câu trả lời mới.
          answerIds.current.set(no, recording.answerId);
          return recording;
        }}
        getUrl={() =>
          getRecordingUrl(
            slug,
            attemptId,
            answerIds.current.get(no) ?? recordings.get(no)?.answerId ?? '',
          )
        }
      />
    ),
    [slug, attemptId, sectionId, recordings],
  );

  const exam = useMemo<SimulatorExamMode>(
    () => ({
      initialResponses: current.responses as Responses,
      onChange,
      onTabChange: flush,
      onSubmit,
      locked: submitting,
      renderSpeaking,
      flagStorageKey: flagStorageKey(attemptId, sectionId),
    }),
    [
      current.responses,
      onChange,
      flush,
      onSubmit,
      submitting,
      renderSpeaking,
      attemptId,
      sectionId,
    ],
  );

  return (
    <div className="flex h-[100dvh] flex-col">
      <ExamHeader
        examTitle={view.exam.title}
        sectionLabel={`${text.sectionOf(sectionIndex + 1, view.sections.length)} · ${section.name}`}
        exitHref={exitHref}
        onExit={flush}
      >
        <SaveIndicator state={saveState} />
        {section.deadlineAt && (
          <Countdown
            deadlineAt={section.deadlineAt}
            offsetMs={clockOffsetMs}
            onExpire={onExpire}
          />
        )}
      </ExamHeader>

      {(submitting || submitError) && (
        <div className="shrink-0 px-3 pt-2 sm:px-5">
          {submitError ? (
            <FormAlert tone="error">{submitError}</FormAlert>
          ) : (
            <FormAlert tone="info">
              {timeUp ? text.timeUp : text.submitting}
            </FormAlert>
          )}
        </div>
      )}

      <SimulatorProvider plan={plan} exam={exam}>
        <div className="flex min-h-0 flex-1 flex-col">
          <ExamSimulator plan={plan} />
        </div>
        <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--card)] px-3 py-2.5 sm:px-5">
          {hasNumbers ? (
            <AnswerNav plan={plan} />
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={submitting}
                onClick={() => onSubmit(latest.current)}
                className={compactPrimaryButtonClass}
              >
                <Send size={15} /> {vi.simulator.submitSection}
              </button>
            </div>
          )}
        </footer>
      </SimulatorProvider>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const label = text.saveState[state];
  return (
    <span
      aria-live="polite"
      className={`hidden items-center gap-1.5 text-[12.5px] sm:inline-flex ${
        state === 'error' ? 'text-[var(--danger)]' : 'text-[var(--muted)]'
      }`}
    >
      {state === 'saving' && <Loader2 size={13} className="animate-spin" />}
      {state === 'error' && <CloudOff size={13} />}
      {label}
    </span>
  );
}
