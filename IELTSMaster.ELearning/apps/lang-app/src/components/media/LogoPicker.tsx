'use client';

import { useRef, useState } from 'react';
import { TenantAvatar } from '@/components/tenant/TenantAvatar';
import { secondaryButtonClass } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { uploadBrandingImage } from '@/lib/media-api';

// Chọn logo trung tâm: upload ngay khi chọn file rồi giữ URL trong form. Key
// trên R2 đặt theo người upload nên dùng được cả lúc đăng ký (chưa có tenant).

const text = vi.tenantForm;

interface LogoPickerProps {
  value: string | null;
  /** Tên trung tâm, dùng làm chữ cái đầu khi chưa có logo. */
  name: string;
  onChange: (logoUrl: string | null) => void;
}

export function LogoPicker({ value, name, onChange }: LogoPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const media = await uploadBrandingImage(file);
      onChange(media.url);
    } catch (err) {
      setError(errorMessage(err, text.logoFailed));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <TenantAvatar name={name.trim() || '?'} logoUrl={value} size="lg" />
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className={secondaryButtonClass}
          >
            {busy
              ? vi.media.uploading
              : value
                ? text.logoChange
                : text.logoUpload}
          </button>
          {value && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onChange(null)}
              className={secondaryButtonClass}
            >
              {text.logoRemove}
            </button>
          )}
        </div>
        <span className="text-[12.5px] text-[var(--muted)]">
          {text.logoHint}
        </span>
        {error && (
          <span className="text-[12.5px] text-[var(--danger)]">{error}</span>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          void pickFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
