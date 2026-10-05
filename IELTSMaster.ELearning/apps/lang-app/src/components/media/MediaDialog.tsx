'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { MEDIA_SIZE_LIMITS, type MediaKind } from '@lang/shared';
import {
  Modal,
  compactPrimaryButtonClass,
  inputClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { uploadMedia } from '@/lib/media-api';

// Chèn media vào đề: upload lên R2, hoặc dán URL sẵn có (dùng khi R2 chưa cấu
// hình và để nhúng link ngoài). Trình soạn đề ở Step 12 dùng lại dialog này.

const ACCEPT: Record<MediaKind, string> = {
  image: 'image/*',
  audio: 'audio/*',
  video: 'video/*',
};

interface MediaDialogProps {
  open: boolean;
  kind: MediaKind;
  /** Tenant sở hữu file (key trên R2 đặt theo tenant). */
  slug: string;
  onInsert: (url: string, name?: string) => void;
  onClose: () => void;
}

export function MediaDialog({
  open,
  kind,
  slug,
  onInsert,
  onClose,
}: MediaDialogProps) {
  const text = vi.media;
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setUrl('');
      setError(null);
      setBusy(false);
    }
  }, [open]);

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const media = await uploadMedia(slug, file);
      onInsert(media.url, file.name);
    } catch (err) {
      setError(errorMessage(err, text.uploadFailed));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={text.insertTitle[kind]}
      widthClass="max-w-md"
      footer={
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
            disabled={!url.trim()}
            onClick={() => onInsert(url.trim())}
            className={compactPrimaryButtonClass}
          >
            {text.insertUrl}
          </button>
        </>
      }
    >
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-6 text-[14px] font-medium text-[var(--body)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
      >
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Upload size={16} />
        )}
        {busy ? text.uploading : text.pickFile}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT[kind]}
        hidden
        onChange={(event) => {
          void pickFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <p className="mt-1.5 text-[12.5px] text-[var(--muted)]">
        {text.sizeHint[kind](MEDIA_SIZE_LIMITS[kind])}
      </p>

      <div className="my-4 flex items-center gap-3 text-[12px] text-[var(--muted)]">
        <span className="h-px flex-1 bg-[var(--border)]" />
        {text.orPasteUrl}
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <input
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://…"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && url.trim()) onInsert(url.trim());
        }}
        className={inputClass}
      />

      {error && (
        <p className="mt-3 rounded-lg bg-[var(--danger-bg)] px-3 py-2 text-[13px] text-[var(--danger)]">
          {error}
        </p>
      )}
    </Modal>
  );
}
