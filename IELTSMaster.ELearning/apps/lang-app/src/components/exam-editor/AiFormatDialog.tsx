'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import {
  AI_FORMAT_NOTE_MAX_LENGTH,
  AiFormatRunStatus,
  type AiFormatJob,
  type AiStatus,
} from '@lang/shared';
import {
  FormAlert,
  Modal,
  compactPrimaryButtonClass,
  inputClass,
  labelClass,
  labelTextClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import {
  cancelAiFormat,
  getAiFormatJob,
  getAiStatus,
  startAiFormat,
} from '@/lib/ai-format-api';
import { ApiError } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';

const text = vi.aiFormat;

/** Hỏi trạng thái job mỗi 2 giây (plan 1.13). */
const POLL_MS = 2000;

type Phase = 'form' | 'running' | 'cancelling';

interface AiFormatDialogProps {
  slug: string;
  examId: string;
  sectionName: string;
  moduleId: string | null;
  /** Nội dung section lúc bấm Định dạng (chưa lưu cũng được). */
  getValue: () => unknown[];
  onClose: () => void;
  /** Job đã dừng: `succeeded` / `partial` / `cancelled` – editor quyết định áp kết quả. */
  onDone: (job: AiFormatJob) => void;
}

/**
 * Hộp thoại "Định dạng bằng AI" cho section đang mở (req-5 plan 1.8–1.13):
 * ghi chú cho AI → chạy nền, hỏi trạng thái mỗi 2 giây, huỷ được. Lỗi (kể cả
 * phiên bị gián đoạn) hiện ngay trong hộp thoại để bấm lại.
 */
export function AiFormatDialog({
  slug,
  examId,
  sectionName,
  moduleId,
  getValue,
  onClose,
  onDone,
}: AiFormatDialogProps) {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [note, setNote] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<AiFormatJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const loadStatus = useCallback(() => {
    getAiStatus(slug)
      .then(setStatus)
      .catch((err: unknown) => setError(errorMessage(err, text.statusFailed)));
  }, [slug]);

  useEffect(loadStatus, [loadStatus]);

  /** Job dừng vì lỗi: quay lại form để bấm lại, lượt đã dùng có thể đổi. */
  const fail = useCallback(
    (message: string) => {
      setJobId(null);
      setJob(null);
      setPhase('form');
      setError(message);
      loadStatus();
    },
    [loadStatus],
  );

  const finish = useCallback(
    (next: AiFormatJob) => {
      if (next.status === AiFormatRunStatus.FAILED) {
        fail(next.error ?? text.failed);
        return;
      }
      onDoneRef.current(next);
    },
    [fail],
  );

  useEffect(() => {
    if (!jobId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const next = await getAiFormatJob(slug, examId, jobId);
        if (stopped) return;
        if (next.status === AiFormatRunStatus.RUNNING) {
          setJob(next);
          timer = setTimeout(() => void tick(), POLL_MS);
        } else {
          finish(next);
        }
      } catch (err) {
        if (stopped) return;
        if (err instanceof ApiError && err.status === 404) {
          // Job mất khi API khởi động lại hoặc quá 15 phút (plan giả định 1).
          fail(text.interrupted);
        } else if (err instanceof ApiError && err.status === 0) {
          // Mất mạng tạm thời: hỏi lại, job vẫn chạy trên server.
          timer = setTimeout(() => void tick(), POLL_MS);
        } else {
          fail(errorMessage(err, text.failed));
        }
      }
    };
    timer = setTimeout(() => void tick(), POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [jobId, slug, examId, finish, fail]);

  async function start() {
    setError(null);
    setJob(null);
    setPhase('running');
    try {
      const started = await startAiFormat(slug, examId, {
        moduleId,
        value: getValue(),
        note: note.trim() || null,
      });
      setJobId(started.jobId);
    } catch (err) {
      // 403 chưa bật / không sửa được đề, 501, 400 section quá dài, 429 hết lượt.
      setPhase('form');
      setError(errorMessage(err, text.startFailed));
      loadStatus();
    }
  }

  async function cancel() {
    const id = jobId;
    if (!id) return;
    setJobId(null);
    setPhase('cancelling');
    try {
      await cancelAiFormat(slug, examId, id);
    } catch {
      // Job đã mất (404) hay lỗi mạng: editor vẫn giữ nguyên nội dung.
    }
    // Người dùng đã huỷ thì không áp kết quả, kể cả khi job vừa kịp xong.
    onDoneRef.current({
      id,
      status: AiFormatRunStatus.CANCELLED,
      attempt: job?.attempt ?? 0,
      maxAttempts: job?.maxAttempts ?? 0,
      result: null,
      error: null,
    });
  }

  function close() {
    if (phase === 'running') {
      if (jobId) void cancel();
      return;
    }
    if (phase === 'form') onClose();
  }

  const busy = phase !== 'form';
  const exhausted =
    status !== null && status.limit !== null && status.used >= status.limit;

  return (
    <Modal
      open
      onClose={close}
      title={text.title}
      widthClass="max-w-xl"
      footer={
        busy ? (
          <button
            type="button"
            disabled={phase === 'cancelling' || !jobId}
            onClick={() => void cancel()}
            className={secondaryButtonClass}
          >
            {phase === 'cancelling' ? text.cancelling : vi.common.cancel}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onClose}
              className={secondaryButtonClass}
            >
              {vi.common.cancel}
            </button>
            <button
              type="button"
              onClick={() => void start()}
              className={compactPrimaryButtonClass}
            >
              <Sparkles size={16} /> {text.start}
            </button>
          </>
        )
      }
    >
      {busy ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Loader2 size={28} className="animate-spin text-[var(--accent)]" />
          <p className="text-[15px] font-semibold text-[var(--heading)]">
            {phase === 'cancelling'
              ? text.cancelling
              : text.running(job?.attempt ?? 1, job?.maxAttempts ?? 3)}
          </p>
          <p className="max-w-sm text-[13px] text-[var(--muted)]">
            {text.runningHint}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          <p className="text-[13px] font-semibold text-[var(--muted)]">
            {text.sectionLabel(sectionName)}
          </p>
          <FormAlert tone="warning">{text.replaceWarning}</FormAlert>
          {error && <FormAlert tone="error">{error}</FormAlert>}
          <label className={labelClass}>
            <span className={labelTextClass}>
              {text.note} {vi.common.optional}
            </span>
            <textarea
              value={note}
              rows={3}
              maxLength={AI_FORMAT_NOTE_MAX_LENGTH}
              placeholder={text.notePlaceholder}
              onChange={(event) => setNote(event.target.value)}
              className={inputClass}
            />
          </label>
          <div className="grid gap-1 text-[13px]">
            {status && (
              <p
                className={
                  exhausted
                    ? 'font-semibold text-[var(--danger)]'
                    : 'text-[var(--body)]'
                }
              >
                {text.used(status.used, status.limit)}
              </p>
            )}
            <p className="text-[12px] text-[var(--muted)]">{text.quotaHint}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
