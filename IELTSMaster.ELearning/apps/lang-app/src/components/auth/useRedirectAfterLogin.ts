'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { destinationAfterLogin } from '@/lib/auth-redirect';
import { useAuth } from './AuthProvider';

/**
 * Đã có phiên thì chuyển tới trang đích sau đăng nhập. Chờ tải xong
 * `GET /me/contexts` (trừ khi còn phải đổi mật khẩu) vì trang đích phụ thuộc
 * danh sách tenant.
 */
export function useRedirectAfterLogin(
  nextPath: string | null,
  enabled = true,
): void {
  const router = useRouter();
  const { status, user, tenantContexts, contextsReady } = useAuth();

  useEffect(() => {
    if (!enabled || status !== 'authenticated' || !user) return;
    if (!user.mustChangePassword && !contextsReady) return;
    router.replace(destinationAfterLogin(user, tenantContexts, nextPath));
  }, [enabled, status, user, tenantContexts, contextsReady, nextPath, router]);
}
