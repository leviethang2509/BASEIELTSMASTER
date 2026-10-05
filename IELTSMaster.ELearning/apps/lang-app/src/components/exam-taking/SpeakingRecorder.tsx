'use client';

import { useEffect, useRef, useState } from 'react';
import { Headphones, Mic, RotateCcw, Square, Upload } from 'lucide-react';
import { useSimulator } from '@/components/exam-simulator/SimulatorState';
import { secondaryButtonClass } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { formatDateTime } from '@/lib/format';

const text = vi.examTaking.recorder;

/** Định dạng thử theo thứ tự: Chrome/Firefox ghi webm, Safari chỉ ghi mp4. */
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

type Phase = 'idle' | 'requesting' | 'recording' | 'uploading';

const buttonClass = `${secondaryButtonClass} !px-3 !py-1.5 !text-[13px]`;

function canRecord(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

/** Bản ghi đã lưu trên server. */
export interface SavedRecording {
  uploadedAt: string;
}

/**
 * Ghi âm câu Speaking: ghi tối đa `seconds` giây, nghe lại, ghi lại (bản cũ bị
 * thay trên server). Bản ghi tải lên ngay khi dừng. Trang thi và trang học bài
 * truyền hàm tải lên / lấy link nghe riêng.
 */
export function SpeakingRecorder({
  no,
  seconds,
  initial,
  upload: uploadFile,
  getUrl,
}: {
  no: number;
  seconds?: number;
  initial?: SavedRecording;
  upload: (file: File) => Promise<SavedRecording>;
  getUrl: () => Promise<{ url: string }>;
}) {
  const { mark, locked } = useSimulator();
  const [supported] = useState(canRecord);
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [saved, setSaved] = useState<SavedRecording | null>(initial ?? null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval>>();
  const blobUrlRef = useRef<string | null>(null);

  const stopStream = () => {
    clearInterval(tickRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (initial) mark({ [no]: true });
    return () => {
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      stopStream();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
    // Chỉ chạy lúc dựng / gỡ ô ghi âm.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showBlob = (blob: Blob) => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = URL.createObjectURL(blob);
    setAudioUrl(blobUrlRef.current);
  };

  async function upload(file: File) {
    setPhase('uploading');
    setPendingFile(file);
    setError(null);
    try {
      const recording = await uploadFile(file);
      setSaved(recording);
      setPendingFile(null);
      mark({ [no]: true });
    } catch (err) {
      setError(errorMessage(err, text.uploadFailed));
    } finally {
      setPhase('idle');
    }
  }

  async function start() {
    setError(null);
    setPhase('requesting');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setPhase('idle');
      setError(text.permissionDenied);
      return;
    }
    streamRef.current = stream;
    const mimeType = MIME_CANDIDATES.find((type) =>
      MediaRecorder.isTypeSupported(type),
    );
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    recorderRef.current = recorder;
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stopStream();
      const type = recorder.mimeType || mimeType || 'audio/webm';
      const blob = new Blob(chunks, { type });
      showBlob(blob);
      const extension = type.startsWith('audio/mp4') ? 'm4a' : 'webm';
      void upload(new File([blob], `speaking-${no}.${extension}`, { type }));
    };

    const startedAt = Date.now();
    setElapsed(0);
    recorder.start();
    setPhase('recording');
    tickRef.current = setInterval(() => {
      const secondsSoFar = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(secondsSoFar);
      if (seconds !== undefined && secondsSoFar >= seconds) stop();
    }, 250);
  }

  function stop() {
    clearInterval(tickRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  async function play() {
    if (!saved) return;
    setError(null);
    try {
      const { url } = await getUrl();
      setAudioUrl(url);
    } catch (err) {
      setError(errorMessage(err, vi.common.loadFailed));
    }
  }

  const hasRecording = !!saved || !!pendingFile;

  return (
    <div
      data-sim-field={no}
      tabIndex={-1}
      className="my-3 rounded-xl border border-[var(--border-strong)] bg-[var(--sidebar)] px-4 py-3 text-[13.5px] outline-none"
    >
      <p className="text-[12.5px] text-[var(--muted)]">{text.limit(seconds)}</p>

      {!supported ? (
        <p className="mt-2 text-[var(--warn-text)]">{text.unsupported}</p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {phase === 'recording' ? (
            <>
              <button
                type="button"
                onClick={stop}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--danger)] px-3 py-1.5 text-[13px] font-semibold text-[var(--on-status)] transition hover:brightness-105"
              >
                <Square size={13} fill="currentColor" /> {text.stop}
              </button>
              <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums text-[var(--danger)]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--danger)]" />
                {text.recording(elapsed, seconds)}
              </span>
            </>
          ) : (
            <button
              type="button"
              onClick={start}
              disabled={locked || phase !== 'idle'}
              className={buttonClass}
            >
              {hasRecording ? <RotateCcw size={14} /> : <Mic size={14} />}
              {hasRecording ? text.rerecord : text.record}
            </button>
          )}
          {pendingFile && phase === 'idle' && (
            <button
              type="button"
              onClick={() => void upload(pendingFile)}
              disabled={locked}
              className={buttonClass}
            >
              <Upload size={14} /> {text.retryUpload}
            </button>
          )}
          {saved && !audioUrl && phase === 'idle' && (
            <button type="button" onClick={play} className={buttonClass}>
              <Headphones size={14} /> {text.play}
            </button>
          )}
        </div>
      )}

      {phase === 'uploading' && (
        <p className="mt-2 text-[var(--muted)]">{text.uploading}</p>
      )}
      {saved && !pendingFile && phase !== 'uploading' && (
        <p className="mt-2 text-[var(--ok-text)]">
          {text.uploaded(formatDateTime(saved.uploadedAt))}
        </p>
      )}
      {audioUrl && phase !== 'recording' && (
        <audio controls src={audioUrl} className="mt-2 w-full max-w-[420px]" />
      )}
      {error && <p className="mt-2 text-[var(--danger)]">{error}</p>}
    </div>
  );
}
