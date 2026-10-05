'use client';

import { useState } from 'react';
import { Headphones } from 'lucide-react';
import { secondaryButtonClass } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';

const text = vi.lessonLearning;

/** Nghe lại bài nói đã nộp (link presigned lấy khi bấm). */
export function SubmittedRecording({
  getUrl,
}: {
  /** `null` khi câu Speaking nộp mà không có ghi âm. */
  getUrl: (() => Promise<{ url: string }>) | null;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!getUrl) {
    return (
      <p className="my-3 text-[13.5px] text-[var(--muted)]">
        {text.noRecording}
      </p>
    );
  }
  return (
    <div className="my-3 flex flex-col gap-2">
      {url ? (
        <audio src={url} controls autoPlay className="w-full max-w-[420px]" />
      ) : (
        <button
          type="button"
          onClick={() =>
            getUrl().then(
              (result) => setUrl(result.url),
              (err: unknown) =>
                setError(errorMessage(err, vi.common.loadFailed)),
            )
          }
          className={`${secondaryButtonClass} self-start`}
        >
          <Headphones size={15} /> {text.listenSubmitted}
        </button>
      )}
      {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}
    </div>
  );
}
