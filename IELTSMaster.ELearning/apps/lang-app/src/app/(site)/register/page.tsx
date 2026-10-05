import { Suspense } from 'react';
import type { Metadata } from 'next';
import { vi } from '@/i18n/vi';
import { RegisterForm } from './RegisterForm';

export const metadata: Metadata = {
  title: `${vi.auth.register} · ${vi.app.name}`,
};

// RegisterForm đọc `?next=` bằng useSearchParams nên cần Suspense.
export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
