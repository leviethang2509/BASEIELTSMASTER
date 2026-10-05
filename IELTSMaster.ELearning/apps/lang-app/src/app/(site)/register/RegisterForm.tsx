'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  DEFAULT_TIMEZONE,
  MIN_DATE_OF_BIRTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  isValidDateOfBirth,
  todayInTimeZone,
} from '@lang/shared';
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
import { passwordStrength } from '@/lib/password-strength';
import { errorMessage } from '@/lib/error-message';

const strengthColors = [
  'var(--muted)',
  'var(--danger)',
  'var(--warn)',
  'var(--ok)',
];

function PasswordStrengthMeter({ password }: { password: string }) {
  const score = password ? passwordStrength(password) : 0;
  return (
    <div className="flex flex-col gap-1.5" aria-live="polite">
      <div className="flex gap-1.5">
        {[1, 2, 3].map((level) => (
          <span
            key={level}
            className="h-[5px] flex-1 rounded-full bg-[var(--border-strong)]"
            style={
              score >= level ? { background: strengthColors[score] } : undefined
            }
          />
        ))}
      </div>
      <span className="text-[12.5px]" style={{ color: strengthColors[score] }}>
        {vi.auth.passwordStrength[password ? score : 0]}
      </span>
    </div>
  );
}

export function RegisterForm() {
  const nextPath = safeNextPath(useSearchParams().get('next'));
  const { status, register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const today = todayInTimeZone(DEFAULT_TIMEZONE);

  useRedirectAfterLogin(nextPath);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!isValidDateOfBirth(dateOfBirth, today)) {
      setError(vi.auth.invalidDateOfBirth);
      return;
    }
    setSubmitting(true);
    try {
      await register({ fullName, email, password, dateOfBirth });
    } catch (err) {
      setError(errorMessage(err, vi.auth.registerFailed));
      setSubmitting(false);
    }
  }

  return (
    <AuthPanel
      mode="register"
      nextPath={nextPath}
      title={vi.auth.registerTitle}
      subtitle={vi.auth.registerSubtitle}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className={labelClass}>
          <span className={labelTextClass}>{vi.auth.fullName}</span>
          <input
            required
            maxLength={150}
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder={vi.auth.fullNamePlaceholder}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>{vi.auth.email}</span>
          <input
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={vi.auth.emailPlaceholder}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>{vi.auth.dateOfBirth}</span>
          <input
            type="date"
            required
            min={MIN_DATE_OF_BIRTH}
            max={today}
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
            className={inputClass}
          />
        </label>

        <div className="flex flex-col gap-2">
          <label className={labelClass}>
            <span className={labelTextClass}>{vi.auth.password}</span>
            <PasswordInput
              required
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={vi.auth.passwordPlaceholder}
            />
          </label>
          <PasswordStrengthMeter password={password} />
        </div>

        {error && <FormAlert tone="error">{error}</FormAlert>}

        <button
          type="submit"
          disabled={submitting || status === 'loading'}
          className={`mt-1 ${primaryButtonClass}`}
        >
          {submitting ? vi.auth.registering : vi.auth.submitRegister}
        </button>
      </form>
    </AuthPanel>
  );
}
