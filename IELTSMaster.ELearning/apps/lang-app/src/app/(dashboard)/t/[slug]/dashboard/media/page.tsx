'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, ExternalLink, Loader2, Trash2, Upload } from 'lucide-react';
import type { MediaItem, MediaStatus } from '@lang/shared';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import {
  Badge,
  ConfirmDialog,
  DataTable,
  FormAlert,
  compactPrimaryButtonClass,
  iconButtonClass,
  type DataColumn,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { copyToClipboard } from '@/lib/clipboard';
import { errorMessage } from '@/lib/error-message';
import { formatBytes, formatDateTime } from '@/lib/format';
import {
  deleteMedia,
  getMediaStatus,
  listMedia,
  uploadMedia,
} from '@/lib/media-api';

// Thư viện media của tenant: danh sách đọc thẳng từ R2 (không có bảng riêng),
// dùng để tải sẵn ảnh/audio/video trước khi soạn đề (Step 12).

const GRID = 'sm:grid-cols-[minmax(0,2.2fr)_100px_120px_180px_110px]';

const KIND_TONE = {
  image: 'accent',
  audio: 'success',
  video: 'warning',
} as const;

const text = vi.media;

export default function TenantMediaPage() {
  const { tenant } = useTenantDashboard();
  const slug = tenant.slug;
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [status, setStatus] = useState<MediaStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<MediaItem | null>(null);
  const [removing, setRemoving] = useState(false);

  const reload = useCallback(async () => {
    try {
      setItems(await listMedia(slug));
    } catch (err) {
      setError(errorMessage(err, vi.common.loadFailed));
      setItems([]);
    }
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    getMediaStatus(slug).then(
      (result) => {
        if (!cancelled) setStatus(result);
      },
      () => {
        if (!cancelled) setStatus(null);
      },
    );
    void reload();
    return () => {
      cancelled = true;
    };
  }, [slug, reload]);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      // Tuần tự: mỗi file có thể tới 100MB.
      for (const file of Array.from(files)) {
        await uploadMedia(slug, file);
      }
      await reload();
    } catch (err) {
      setError(errorMessage(err, text.uploadFailed));
    } finally {
      setUploading(false);
    }
  }

  async function confirmRemove() {
    if (!pendingRemove) return;
    setRemoving(true);
    setError(null);
    try {
      await deleteMedia(slug, pendingRemove.key);
      setPendingRemove(null);
      setNotice(text.removed);
      await reload();
    } catch (err) {
      setError(errorMessage(err, text.removeFailed));
    } finally {
      setRemoving(false);
    }
  }

  async function copyUrl(url: string) {
    const copied = await copyToClipboard(url);
    setError(copied ? null : text.copyFailed);
    setNotice(copied ? text.copied : null);
  }

  const columns: DataColumn<MediaItem>[] = [
    {
      header: text.columns.file,
      render: (item) => (
        <span
          className="block truncate font-mono text-[13px] text-[var(--heading)]"
          title={item.key}
        >
          {item.key.slice(item.key.lastIndexOf('/') + 1)}
        </span>
      ),
    },
    {
      header: text.columns.kind,
      render: (item) => (
        <Badge tone={KIND_TONE[item.kind]}>{text.kinds[item.kind]}</Badge>
      ),
    },
    {
      header: text.columns.size,
      render: (item) => (
        <span className="text-[13.5px] text-[var(--body)]">
          {formatBytes(item.size)}
        </span>
      ),
    },
    {
      header: text.columns.uploadedAt,
      render: (item) => (
        <span className="text-[13.5px] text-[var(--body)]">
          {formatDateTime(item.uploadedAt)}
        </span>
      ),
    },
    {
      header: text.columns.actions,
      className: 'sm:justify-self-end',
      render: (item) => (
        <span className="flex items-center gap-1">
          <button
            type="button"
            title={text.copyUrl}
            aria-label={text.copyUrl}
            onClick={() => void copyUrl(item.url)}
            className={iconButtonClass}
          >
            <Copy size={16} />
          </button>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            title={text.openInNewTab}
            aria-label={text.openInNewTab}
            className={iconButtonClass}
          >
            <ExternalLink size={16} />
          </a>
          <button
            type="button"
            title={text.remove}
            aria-label={text.remove}
            onClick={() => setPendingRemove(item)}
            className={iconButtonClass}
          >
            <Trash2 size={16} />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--heading)]">
            {text.title}
          </h1>
          <p className="mt-1 text-[13.5px] text-[var(--body)]">
            {text.subtitle}
          </p>
        </div>
        <button
          type="button"
          disabled={uploading || status?.configured === false}
          onClick={() => fileRef.current?.click()}
          className={compactPrimaryButtonClass}
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          {uploading ? text.uploading : text.upload}
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,audio/*,video/*"
          hidden
          onChange={(event) => {
            void upload(event.target.files);
            event.target.value = '';
          }}
        />
      </div>

      {status && !status.configured && (
        <FormAlert tone="warning">
          {text.notConfigured(status.reason ?? '')}
        </FormAlert>
      )}
      {error && <FormAlert tone="error">{error}</FormAlert>}
      {notice && <FormAlert tone="success">{notice}</FormAlert>}

      <DataTable
        columns={columns}
        rows={items ?? []}
        rowKey={(item) => item.key}
        gridClass={GRID}
        loading={items === null}
        emptyText={text.empty}
      />

      <ConfirmDialog
        open={pendingRemove !== null}
        title={text.removeTitle}
        message={text.removeText}
        confirmLabel={text.remove}
        tone="danger"
        loading={removing}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  );
}
