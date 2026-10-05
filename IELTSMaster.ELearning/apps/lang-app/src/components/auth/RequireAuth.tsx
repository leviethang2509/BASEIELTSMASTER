'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { vi } from '@/i18n/vi';
import { isSystemManager } from '@/lib/auth-redirect';
import { useAuth } from './AuthProvider';

const CHANGE_PASSWORD_PATH = '/me/account';

/**
 * Chặn phía client cho trang cần đăng nhập (middleware chỉ biết có cookie hay
 * không). Chỉ là lớp giao diện, quyền thật do API kiểm tra.
 */
export function RequireAuth({
  systemManager = false,
  children,
}: {
  /** Chỉ System Owner/Admin (dashboard `/admin`). */
  systemManager?: boolean;
  children: React.ReactNode;
}) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  let redirectTo: string | null = null;
  if (status === 'anonymous') {
    redirectTo = `/login?next=${encodeURIComponent(pathname)}`;
  } else if (user?.mustChangePassword && pathname !== CHANGE_PASSWORD_PATH) {
    redirectTo = CHANGE_PASSWORD_PATH;
  } else if (systemManager && user && !isSystemManager(user)) {
    redirectTo = '/me';
  }

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (status !== 'authenticated' || redirectTo) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-[14px] text-[var(--muted)]">
        {vi.common.loading}
      </div>
    );
  }
  return <>{children}</>;
}
