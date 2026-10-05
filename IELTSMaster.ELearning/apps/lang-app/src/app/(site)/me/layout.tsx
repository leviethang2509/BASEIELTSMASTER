import { RequireAuth } from '@/components/auth/RequireAuth';

// Mọi trang /me/* cần đăng nhập.
export default function MeLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
