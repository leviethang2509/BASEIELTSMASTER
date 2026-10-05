'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CloudOff, Loader2 } from 'lucide-react';
import type { Responses } from '@lang/exam-core';
import {
  LessonAttemptSectionStatus,
  LessonAttemptStatus,
  type LessonAttemptSectionView,
  type LessonAttemptView,
} from '@lang/shared';
import { SpeakingRecorder } from '@/components/exam-taking/SpeakingRecorder';
import { reviewFromResult } from '@/components/lesson-viewer/lesson-review';
import {
  LessonViewer,
  type LessonViewerSection,
} from '@/components/lesson-viewer/LessonViewer';
import { FormAlert } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { ApiError } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import {
  getLessonAnswerRecordingUrl,
  getLessonAttempt,
  getLessonDraftRecordingUrl,
  learnerLessonPath,
  retryLessonSection,
  saveLessonResponses,
  submitLessonSection,
  uploadLessonRecording,
  viewLessonSection,
} from '@/lib/lesson-learner-api';
import { LessonStatusBadge } from './LessonStatusBadge';
import { SubmittedRecording } from './SubmittedRecording';

const text = vi.lessonLearning;

/** Autosave sau khi ngừng trả lời. */
const AUTOSAVE_DELAY_MS = 2000;
const RETRY_DELAY_MS = 5000;

type SaveState = keyof typeof text.saveState;

const clone = (responses: Responses): Responses =>
  JSON.parse(JSON.stringify(responses)) as Responses;

/** Màn hình học bài (`/t/{slug}/lesson-attempts/{id}`). */
export function LessonAttemptScreen({
  slug: rawSlug,
  attemptId,
}: {
  slug: string;
  attemptId: string;
}) {
  const slug = rawSlug.toLowerCase();
  const [view, setView] = useState<LessonAttemptView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');

  // Bản đang làm chưa lưu, theo section.
  const pending = useRef(new Map<string, Responses>());
  const saving = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(() => {
    getLessonAttempt(slug, attemptId).then(
      (next) => {
        pending.current.clear();
        setView(next);
        setLoadError(null);
      },
      (err: unknown) => setLoadError(errorMessage(err, vi.common.loadFailed)),
    );
  }, [slug, attemptId]);

  useEffect(load, [load]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    // Mỗi lúc chỉ một lượt lưu để bản cũ không ghi đè bản mới.
    if (saving.current) await saving.current;
    const entries = [...pending.current.entries()];
    if (entries.length === 0) return;
    pending.current.clear();
    setSaveState('saving');
    const run = Promise.all(
      entries.map(([sectionId, responses]) =>
        saveLessonResponses(slug, attemptId, sectionId, responses).catch(
          (err: unknown) => {
            // Section đã nộp / lượt chỉ xem lại: lấy trạng thái mới từ server.
            if (err instanceof ApiError && err.status === 409) {
              load();
              return;
            }
            if (!pending.current.has(sectionId)) {
              pending.current.set(sectionId, responses);
            }
            throw err;
          },
        ),
      ),
    ).then(
      () => setSaveState(pending.current.size > 0 ? 'dirty' : 'saved'),
      () => {
        setSaveState('error');
        timer.current = setTimeout(() => void flush(), RETRY_DELAY_MS);
      },
    );
    saving.current = run.finally(() => {
      saving.current = null;
    });
    await saving.current;
  }, [slug, attemptId, load]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (pending.current.size === 0) return;
      void flush();
      event.preventDefault();
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [flush]);

  const onChange = useCallback(
    (sectionId: string, responses: Responses) => {
      pending.current.set(sectionId, clone(responses));
      setSaveState('dirty');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
    },
    [flush],
  );

  const onView = useCallback(
    (sectionId: string) => {
      viewLessonSection(slug, attemptId, sectionId).then(
        (result) =>
          setView(
            (prev) =>
              prev && {
                ...prev,
                status: result.status,
                completedAt: result.completedAt,
                sections: prev.sections.map((section) =>
                  section.id === sectionId
                    ? { ...section, viewedAt: result.viewedAt }
                    : section,
                ),
              },
          ),
        // Chỉ để tính "học xong": lỗi thì lần mở sau gửi lại.
        () => undefined,
      );
    },
    [slug, attemptId],
  );

  const onSubmit = useCallback(
    async (sectionId: string, responses: Responses) => {
      // Lần nộp mang câu trả lời mới nhất: bỏ bản chờ lưu của section này.
      pending.current.delete(sectionId);
      if (saving.current) await saving.current;
      const next = await submitLessonSection(
        slug,
        attemptId,
        sectionId,
        clone(responses),
      );
      setView(next);
      setSaveState(pending.current.size > 0 ? 'dirty' : 'saved');
    },
    [slug, attemptId],
  );

  const onRetry = useCallback(
    async (sectionId: string) => {
      setView(await retryLessonSection(slug, attemptId, sectionId));
    },
    [slug, attemptId],
  );

  const renderSpeaking = useCallback(
    (sectionId: string, no: number, seconds: number | undefined) => {
      const initial = view?.sections
        .find((section) => section.id === sectionId)
        ?.recordings.find((item) => item.number === no);
      return (
        <SpeakingRecorder
          no={no}
          seconds={seconds}
          initial={initial}
          upload={(file) =>
            uploadLessonRecording(slug, attemptId, sectionId, no, file)
          }
          getUrl={() =>
            getLessonDraftRecordingUrl(slug, attemptId, sectionId, no)
          }
        />
      );
    },
    [slug, attemptId, view?.sections],
  );

  const sections = useMemo(
    () =>
      (view?.sections ?? []).map((section) =>
        toViewerSection(section, (answerId) =>
          getLessonAnswerRecordingUrl(slug, attemptId, answerId),
        ),
      ),
    [view?.sections, slug, attemptId],
  );

  const back = view ? learnerLessonPath(slug, view.lesson.id) : `/t/${slug}`;

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-16">
        <FormAlert tone="error">{loadError}</FormAlert>
        <Link
          href={`/t/${slug}`}
          className="text-[13.5px] font-medium text-[var(--accent)]"
        >
          {text.backToTenant}
        </Link>
      </div>
    );
  }
  if (!view) {
    return (
      <p className="py-24 text-center text-[14px] text-[var(--muted)]">
        {vi.common.loading}
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-6">
      <Link
        href={back}
        onClick={() => void flush()}
        className="inline-flex items-center gap-1.5 self-start text-[13.5px] font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
      >
        <ArrowLeft size={15} /> {text.backToLesson}
      </Link>

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 flex-1 text-[24px] font-bold leading-tight tracking-[-0.02em] text-[var(--heading)]">
          {view.lesson.title}
        </h1>
        <LessonStatusBadge status={view.status} />
      </header>

      {!view.canSubmit ? (
        <FormAlert tone="warning">{text.readOnly}</FormAlert>
      ) : view.status === LessonAttemptStatus.COMPLETED ? (
        <FormAlert tone="success">{text.completedBanner}</FormAlert>
      ) : (
        <p className="text-[13.5px] text-[var(--muted)]">{text.completeHint}</p>
      )}

      <LessonViewer
        sections={sections}
        canSubmit={view.canSubmit}
        initialSectionId={firstUnfinished(view)}
        aside={view.canSubmit && <SaveIndicator state={saveState} />}
        onView={view.canSubmit ? onView : undefined}
        onChange={onChange}
        onLeave={() => void flush()}
        onSubmit={onSubmit}
        onRetry={onRetry}
        renderSpeaking={renderSpeaking}
      />
    </div>
  );
}

/** Mở sẵn section đầu tiên chưa xong. */
function firstUnfinished(view: LessonAttemptView): string | undefined {
  return (
    view.sections.find((section) =>
      section.questionCount > 0 ? section.submitCount === 0 : !section.viewedAt,
    ) ?? view.sections[0]
  )?.id;
}

function toViewerSection(
  section: LessonAttemptSectionView,
  answerUrl: (answerId: string) => Promise<{ url: string }>,
): LessonViewerSection {
  const result = section.result;
  const recordings = new Map(
    (result?.questions ?? []).map((q) => [q.number, q.recordingAnswerId]),
  );
  return {
    id: section.id,
    name: section.name,
    content: section.content,
    questionCount: section.questionCount,
    submitted: section.status === LessonAttemptSectionStatus.SUBMITTED,
    submitCount: section.submitCount,
    submittedAt: result?.submittedAt ?? null,
    viewed: section.viewedAt !== null,
    responses: section.responses as Responses,
    manualGradedCount: result?.manualGradedCount,
    review: result
      ? {
          ...reviewFromResult(result),
          renderSpeaking: (no) => {
            const answerId = recordings.get(no);
            return (
              <SubmittedRecording
                getUrl={answerId ? () => answerUrl(answerId) : null}
              />
            );
          },
        }
      : null,
  };
}

function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <span
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 ${
        state === 'error' ? 'text-[var(--danger)]' : ''
      }`}
    >
      {state === 'saving' && <Loader2 size={13} className="animate-spin" />}
      {state === 'error' && <CloudOff size={13} />}
      {text.saveState[state]}
    </span>
  );
}
