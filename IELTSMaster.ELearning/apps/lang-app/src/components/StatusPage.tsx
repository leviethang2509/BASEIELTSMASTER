import Link from 'next/link';
import { Brand } from '@/components/Brand';
import { vi } from '@/i18n/vi';

// Trang báo trạng thái toàn màn hình (404, lỗi không mong đợi) khi không có
// layout nào bao ngoài.
export function StatusPage({
  code,
  title,
  message,
  children,
}: {
  code?: string;
  title: string;
  message: string;
  /** Nút hành động thêm, đặt trước "Về trang chủ". */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center">
      <Link href="/" aria-label={vi.app.name}>
        <Brand />
      </Link>
      {code && (
        <p className="mt-10 font-mono text-[13px] tracking-[0.12em] text-[var(--muted)]">
          {code}
        </p>
      )}
      <h1 className="mt-2 text-[24px] font-bold text-[var(--heading)]">
        {title}
      </h1>
      <p className="mt-2 max-w-md text-[14.5px] text-[var(--body)]">
        {message}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        {children}
        <Link
          href="/"
          className="rounded-lg border border-[var(--border-strong)] px-4 py-2 text-[14px] font-medium text-[var(--body)] transition hover:bg-[var(--hover)]"
        >
          {vi.common.backHome}
        </Link>
      </div>
    </div>
  );
}
