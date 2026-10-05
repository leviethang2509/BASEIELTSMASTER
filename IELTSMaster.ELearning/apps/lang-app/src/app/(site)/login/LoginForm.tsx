'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthPanel } from '@/components/auth/AuthPanel';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRedirectAfterLogin } from '@/components/auth/useRedirectAfterLogin';
import {
  FormAlert,
  PasswordInput,
  inputClass,
  labelClass,
  labelTextClass,
  primaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { safeNextPath } from '@/lib/auth-redirect';
import { errorMessage } from '@/lib/error-message';

export function LoginForm() {
  const nextPath = safeNextPath(useSearchParams().get('next'));
  const { status, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Đã đăng nhập (vừa gửi form, hoặc mở lại /login khi còn phiên) thì chuyển trang.
  useRedirectAfterLogin(nextPath);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(errorMessage(err, vi.auth.loginFailed));
      setSubmitting(false);
    }
  }

  return (
    <AuthPanel
      mode="login"
      nextPath={nextPath}
      title={vi.auth.loginTitle}
      subtitle={vi.auth.loginSubtitle}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className={labelClass}>
          <span className={labelTextClass}>{vi.auth.email}</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={vi.auth.emailPlaceholder}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>{vi.auth.password}</span>
          <PasswordInput
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error && <FormAlert tone="error">{error}</FormAlert>}

        <button
          type="submit"
          disabled={submitting || status === 'loading'}
          className={`mt-1 ${primaryButtonClass}`}
        >
          {submitting ? vi.auth.loggingIn : vi.auth.login}
        </button>
      </form>
    </AuthPanel>
  );
}
