import Link from 'next/link';
import { vi } from '@/i18n/vi';

const tabBase =
  'flex-1 rounded-[9px] py-2.5 text-center text-[14px] transition';
const tabActive = `${tabBase} bg-[var(--raised)] font-semibold text-[var(--heading)] shadow-[0_2px_6px_var(--shadow-1)]`;
const tabIdle = `${tabBase} font-medium text-[var(--muted)] hover:text-[var(--body)]`;

// Khung trang đăng nhập/đăng ký theo design/Auth.html (tab + tiêu đề + form),
// bỏ nút OAuth và cột giới thiệu.
export function AuthPanel({
  mode,
  nextPath,
  title,
  subtitle,
  children,
}: {
  mode: 'login' | 'register';
  /** Giữ `?next=` khi chuyển tab. */
  nextPath: string | null;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const query = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
  return (
    <div className="flex justify-center px-5 py-12 sm:py-16">
      <div className="flex w-full max-w-[436px] flex-col gap-6">
        <nav className="flex rounded-xl border border-[var(--border)] bg-[var(--sidebar)] p-1">
          <Link
            href={`/login${query}`}
            aria-current={mode === 'login' ? 'page' : undefined}
            className={mode === 'login' ? tabActive : tabIdle}
          >
            {vi.auth.login}
          </Link>
          <Link
            href={`/register${query}`}
            aria-current={mode === 'register' ? 'page' : undefined}
            className={mode === 'register' ? tabActive : tabIdle}
          >
            {vi.auth.register}
          </Link>
        </nav>

        <div className="flex flex-col gap-2">
          <h1 className="text-[32px] font-bold leading-tight tracking-tight text-[var(--heading)]">
            {title}
          </h1>
          <p className="text-[15px] leading-relaxed text-[var(--body)]">
            {subtitle}
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
