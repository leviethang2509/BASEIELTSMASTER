'use client';

import { useEffect, useState } from 'react';
import { TenantRole, type MembershipListItem } from '@lang/shared';
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
import { membershipsPath } from './member-utils';
import { RoleCheckboxes } from './RoleCheckboxes';

const FORM_ID = 'add-member-form';

// Thêm tài khoản có sẵn theo email (`POST memberships/add-by-email`).
export function AddMemberModal({
  open,
  slug,
  onClose,
  onAdded,
}: {
  open: boolean;
  slug: string;
  onClose: () => void;
  onAdded: (member: MembershipListItem) => void;
}) {
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<TenantRole[]>([TenantRole.STUDENT]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail('');
    setRoles([TenantRole.STUDENT]);
    setError(null);
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (roles.length === 0) {
      setError(vi.members.rolesRequired);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onAdded(
        await api.post<MembershipListItem>(
          `${membershipsPath(slug)}/add-by-email`,
          { email, roles },
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
      open={open}
      onClose={onClose}
      title={vi.members.addByEmail}
      widthClass="max-w-lg"
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
            {saving ? vi.common.processing : vi.members.add}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="grid gap-4">
        <label className={labelClass}>
          <span className={labelTextClass}>{vi.auth.email}</span>
          <input
            type="email"
            required
            autoFocus
            maxLength={254}
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={vi.auth.emailPlaceholder}
            className={inputClass}
          />
          <span className="text-[12.5px] text-[var(--muted)]">
            {vi.members.addByEmailHint}
          </span>
        </label>
        <div className={labelClass}>
          <span className={labelTextClass}>{vi.members.roles}</span>
          <RoleCheckboxes value={roles} onChange={setRoles} />
        </div>
        {error && <FormAlert tone="error">{error}</FormAlert>}
      </form>
    </Modal>
  );
}
