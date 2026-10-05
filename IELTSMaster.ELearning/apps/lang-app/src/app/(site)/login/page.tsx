import { Suspense } from 'react';
import type { Metadata } from 'next';
import { vi } from '@/i18n/vi';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: `${vi.auth.login} · ${vi.app.name}`,
};

// LoginForm đọc `?next=` bằng useSearchParams nên cần Suspense.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
