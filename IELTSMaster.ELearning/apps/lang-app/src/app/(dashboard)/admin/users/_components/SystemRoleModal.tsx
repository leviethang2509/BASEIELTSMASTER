'use client';

import { useEffect, useState } from 'react';
import { SystemRole, type AdminUser } from '@lang/shared';
import {
  FormAlert,
  Modal,
  compactPrimaryButtonClass,
  inputClass,
  labelClass,
  labelTextClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';

const FORM_ID = 'admin-system-role-form';

// Chỉ System Owner thấy nút mở dialog này (API cũng chỉ cho Owner).
export function SystemRoleModal({
  user,
  onClose,
  onDone,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onDone: (user: AdminUser) => void;
}) {
  const [role, setRole] = useState<SystemRole>(SystemRole.REGISTERED_USER);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setRole(user.systemRole);
    setError(null);
  }, [user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      onDone(
        await api.patch<AdminUser>(`/admin/users/${user.id}/system-role`, {
          systemRole: role,
        }),
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
      title={vi.admin.users.changeRole}
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
            disabled={saving || role === user?.systemRole}
            className={compactPrimaryButtonClass}
          >
            {saving ? vi.common.processing : vi.admin.save}
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
          </p>
          <label className={labelClass}>
            <span className={labelTextClass}>{vi.admin.users.systemRole}</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as SystemRole)}
              className={inputClass}
            >
              {Object.values(SystemRole).map((value) => (
                <option key={value} value={value}>
                  {vi.systemRoles[value]}
                </option>
              ))}
            </select>
            <span className="text-[12.5px] text-[var(--muted)]">
              {vi.admin.users.changeRoleHint}
            </span>
          </label>
          {error && <FormAlert tone="error">{error}</FormAlert>}
        </form>
      )}
    </Modal>
  );
}
