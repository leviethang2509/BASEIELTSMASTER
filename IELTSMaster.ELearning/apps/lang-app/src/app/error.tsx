'use client';

import { useEffect } from 'react';
import { StatusPage } from '@/components/StatusPage';
import { compactPrimaryButtonClass } from '@/components/ui';
import { vi } from '@/i18n/vi';

// Lỗi không mong đợi khi render (thay trang lỗi tiếng Anh mặc định của Next.js).
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage title={vi.common.errorTitle} message={vi.common.errorText}>
      <button
        type="button"
        onClick={reset}
        className={compactPrimaryButtonClass}
      >
        {vi.common.retry}
      </button>
    </StatusPage>
  );
}
