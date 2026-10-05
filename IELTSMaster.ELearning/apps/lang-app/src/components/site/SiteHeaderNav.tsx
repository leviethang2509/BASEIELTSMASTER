'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { vi } from '@/i18n/vi';
import { initials } from '@/lib/initials';
import { ThemeToggle } from '@/theme';

const ghostLinkClass =
  'whitespace-nowrap rounded-lg px-3 py-2 text-[14px] font-medium text-[var(--body)] transition hover:bg-[var(--hover)] sm:px-4';

// Menu góc phải header khu vực chính, đổi theo trạng thái đăng nhập.
export function SiteHeaderNav() {
  const { status, user, logout } = useAuth();

  // Chưa biết có đăng nhập hay không: vẫn cho đổi giao diện (khách cũng đổi
  // được), chỗ còn lại để trống cho khỏi nhảy layout khi biết trạng thái.
  if (status === 'loading') {
    return (
      <nav className="ml-auto flex h-9 items-center">
        <ThemeToggle />
      </nav>
    );
  }

  if (user) {
    return (
      <nav className="ml-auto flex items-center gap-1.5">
        <Link href="/me" className={ghostLinkClass}>
          {vi.site.myWorkspace}
        </Link>
        <ThemeToggle />
        <NotificationBell />
        <Link
          href="/me/account"
          title={vi.account.title}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-[var(--hover)]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--accent-soft)] text-[12px] font-semibold text-[var(--accent)]">
            {initials(user.fullName)}
          </span>
          <span className="hidden max-w-[160px] truncate text-[13.5px] font-semibold text-[var(--fg)] sm:block">
            {user.fullName}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          aria-label={vi.auth.logout}
          title={vi.auth.logout}
          className="grid h-9 w-9 place-items-center rounded-[10px] text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--accent)]"
        >
          <LogOut size={18} />
        </button>
      </nav>
    );
  }

  return (
    <nav className="ml-auto flex items-center gap-2">
      <ThemeToggle />
      <Link href="/login" className={ghostLinkClass}>
        {vi.auth.login}
      </Link>
      <Link
        href="/register"
        className="whitespace-nowrap rounded-lg bg-[var(--accent-bg)] px-3 py-2 text-[14px] font-semibold text-white transition hover:brightness-105 sm:px-4"
      >
        {vi.auth.register}
      </Link>
    </nav>
  );
}
