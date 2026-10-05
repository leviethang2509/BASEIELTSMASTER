'use client';

import { useEffect, useState } from 'react';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type AdminUser,
  type AdminUserPasswordResult,
} from '@lang/shared';
import {
  FormAlert,
  Modal,
  PasswordInput,
  compactPrimaryButtonClass,
  labelClass,
  labelTextClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';

const FORM_ID = 'admin-reset-password-form';

export function ResetPasswordModal({
  user,
  onClose,
  onDone,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onDone: (result: AdminUserPasswordResult) => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setPassword('');
    setError(null);
  }, [user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      onDone(
        await api.post<AdminUserPasswordResult>(
          `/admin/users/${user.id}/reset-password`,
          { password },
        ),
      );
    } catch (err) {
      setError(errorMessage(err, vi.admin.actionFailed));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={user !== null}
      onClose={onClose}
      title={vi.admin.users.resetPassword}
      widthClass="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className={secondaryButtonClass}
          >
            {vi.common.cancel}
          </button>
          <button
            type="submit"
            form={FORM_ID}
            disabled={saving}
            className={compactPrimaryButtonClass}
          >
            {saving ? vi.common.processing : vi.admin.users.resetPassword}
          </button>
        </>
      }
    >
      {user && (
        <form id={FORM_ID} onSubmit={handleSubmit} className="grid gap-4">
          <p className="text-[14px] text-[var(--body)]">
            <span className="font-semibold text-[var(--heading)]">
              {user.fullName}
            </span>{' '}
            · <span className="font-mono">{user.email}</span>
            <span className="mt-1 block text-[13px]">
              {vi.admin.users.resetHint}
            </span>
          </p>
          <label className={labelClass}>
            <span className={labelTextClass}>
              {vi.admin.users.temporaryPassword}
            </span>
            <PasswordInput
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <span className="text-[12.5px] text-[var(--muted)]">
              {vi.admin.users.passwordHint}
            </span>
          </label>
          {error && <FormAlert tone="error">{error}</FormAlert>}
        </form>
      )}
    </Modal>
  );
}
