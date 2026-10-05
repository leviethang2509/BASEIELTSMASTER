'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { vi } from '@/i18n/vi';
import { compactPrimaryButtonClass, secondaryButtonClass } from './form-styles';
import { Modal } from './Modal';

interface TemporaryPasswordDialogProps {
  open: boolean;
  title: string;
  email: string;
  /** Mật khẩu hệ thống sinh; `null` khi admin tự nhập. */
  password: string | null;
  onClose: () => void;
}

// Hiện mật khẩu tạm đúng một lần sau khi tạo account / reset mật khẩu.
export function TemporaryPasswordDialog({
  open,
  title,
  email,
  password,
  onClose,
}: TemporaryPasswordDialogProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) setCopied(false);
  }, [open]);

  // Clipboard API chỉ có trên HTTPS/localhost; VPS đang chạy HTTP thì người
  // dùng tự bôi đen (ô mật khẩu có `select-all`).
  const copy = () => {
    if (!password || !navigator.clipboard) return;
    navigator.clipboard.writeText(password).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      widthClass="max-w-md"
      footer={
        <button
          type="button"
          onClick={onClose}
          className={compactPrimaryButtonClass}
        >
          {vi.common.close}
        </button>
      }
    >
      <p className="text-[14px] text-[var(--body)]">
        {vi.admin.password.account}:{' '}
        <span className="font-mono text-[var(--heading)]">{email}</span>
      </p>
      {password ? (
        <>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--sidebar)] py-2 pl-3 pr-2">
            <code className="min-w-0 flex-1 select-all break-all font-mono text-[17px] tracking-wide text-[var(--heading)]">
              {password}
            </code>
            <button
              type="button"
              onClick={copy}
              className={secondaryButtonClass}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? vi.admin.password.copied : vi.admin.password.copy}
            </button>
          </div>
          <p className="mt-2 text-[12.5px] text-[var(--muted)]">
            {vi.admin.password.showOnce}
          </p>
        </>
      ) : (
        <p className="mt-3 text-[14px] text-[var(--body)]">
          {vi.admin.password.setByAdmin}
        </p>
      )}
      <p className="mt-3 text-[13.5px] text-[var(--body)]">
        {vi.admin.password.mustChange}
      </p>
    </Modal>
  );
}
