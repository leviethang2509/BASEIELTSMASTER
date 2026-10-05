'use client';

import { vi } from '@/i18n/vi';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Popup xác nhận tự viết (không dùng window.confirm).
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = vi.common.confirm,
  cancelLabel = vi.common.cancel,
  tone = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmClass =
    tone === 'danger'
      ? 'bg-[var(--danger)] text-[var(--on-status)] hover:brightness-105'
      : 'bg-[var(--accent-bg)] text-white hover:brightness-105';

  return (
    <Modal open={open} onClose={onCancel} title={title} widthClass="max-w-md">
      <div className="text-[14px] leading-relaxed text-[var(--body)]">
        {message}
      </div>
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[var(--border-strong)] px-4 py-2 text-[14px] font-medium text-[var(--body)] transition hover:bg-[var(--hover)]"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`rounded-lg px-4 py-2 text-[14px] font-semibold transition disabled:opacity-60 ${confirmClass}`}
        >
          {loading ? vi.common.processing : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
