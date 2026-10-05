'use client';

import { useEffect, useState } from 'react';
import { vi } from '@/i18n/vi';
import { Modal } from './Modal';

interface PromptDialogProps {
  open: boolean;
  title: string;
  /** Nhãn phía trên ô nhập. */
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  hint?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Mặc định bắt buộc nhập — để trống thì chặn nút xác nhận. */
  required?: boolean;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

// Popup nhập một dòng, thay cho window.prompt để đồng bộ giao diện.
export function PromptDialog({
  open,
  title,
  label,
  placeholder,
  defaultValue = '',
  hint,
  confirmLabel = vi.common.confirm,
  cancelLabel = vi.common.cancel,
  required = true,
  onSubmit,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  const invalid = required && !value.trim();
  const submit = () => {
    if (!invalid) onSubmit(value.trim());
  };

  return (
    <Modal open={open} onClose={onCancel} title={title} widthClass="max-w-md">
      {label && (
        <span className="mb-1.5 block text-[13px] font-semibold text-[var(--body)]">
          {label}
        </span>
      )}
      <input
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          }
        }}
        className="h-[42px] w-full rounded-xl border border-[var(--border-strong)] bg-[var(--sidebar)] px-3 text-[14px] text-[var(--heading)] outline-none transition focus:border-[var(--accent)] focus:bg-[var(--bg)]"
      />
      {hint && (
        <p className="mt-1.5 text-[12.5px] text-[var(--muted)]">{hint}</p>
      )}
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
          disabled={invalid}
          onClick={submit}
          className="rounded-lg bg-[var(--accent-bg)] px-4 py-2 text-[14px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
