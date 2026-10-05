'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_TIMEZONE,
  Gender,
  MIN_DATE_OF_BIRTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  isValidDateOfBirth,
  todayInTimeZone,
  type AdminUser,
  type AdminUserPasswordResult,
} from '@lang/shared';
import {
  FormAlert,
  Modal,
  PasswordInput,
  compactPrimaryButtonClass,
  inputClass,
  labelClass,
  labelTextClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';

const FORM_ID = 'admin-user-form';

const emptyForm = {
  email: '',
  fullName: '',
  dateOfBirth: '',
  gender: '',
  phone: '',
  address: '',
  password: '',
};

interface UserFormModalProps {
  open: boolean;
  /** `null` là tạo mới. */
  user: AdminUser | null;
  onClose: () => void;
  onCreated: (result: AdminUserPasswordResult) => void;
  onUpdated: (user: AdminUser) => void;
}

export function UserFormModal({
  open,
  user,
  onClose,
  onCreated,
  onUpdated,
}: UserFormModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const today = todayInTimeZone(DEFAULT_TIMEZONE);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      user
        ? {
            email: user.email,
            fullName: user.fullName,
            dateOfBirth: user.dateOfBirth,
            gender: user.gender ?? '',
            phone: user.phone ?? '',
            address: user.address ?? '',
            password: '',
          }
        : emptyForm,
    );
  }, [open, user]);

  const update =
    (field: keyof typeof emptyForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValidDateOfBirth(form.dateOfBirth, today)) {
      setError(vi.auth.invalidDateOfBirth);
      return;
    }
    const { password, ...profile } = form;
    const body = { ...profile, gender: profile.gender || null };
    setSaving(true);
    setError(null);
    try {
      if (user) {
        onUpdated(await api.patch<AdminUser>(`/admin/users/${user.id}`, body));
      } else {
        onCreated(
          await api.post<AdminUserPasswordResult>('/admin/users', {
            ...body,
            password,
          }),
        );
      }
    } catch (err) {
      setError(errorMessage(err, vi.account.saveFailed));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? vi.admin.users.edit : vi.admin.users.create}
      widthClass="max-w-2xl"
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
            {saving ? vi.common.processing : vi.admin.save}
          </button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={handleSubmit}
        className="grid gap-4 sm:grid-cols-2"
      >
        <label className={`${labelClass} sm:col-span-2`}>
          <span className={labelTextClass}>{vi.auth.email}</span>
          <input
            type="email"
            required
            maxLength={254}
            autoComplete="off"
            value={form.email}
            onChange={update('email')}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>{vi.auth.fullName}</span>
          <input
            required
            maxLength={150}
            value={form.fullName}
            onChange={update('fullName')}
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
            value={form.dateOfBirth}
            onChange={update('dateOfBirth')}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>{vi.account.gender}</span>
          <select
            value={form.gender}
            onChange={update('gender')}
            className={inputClass}
          >
            <option value="">{vi.account.genderUnset}</option>
            {Object.values(Gender).map((gender) => (
              <option key={gender} value={gender}>
                {vi.gender[gender]}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>{vi.account.phone}</span>
          <input
            type="tel"
            maxLength={30}
            value={form.phone}
            onChange={update('phone')}
            className={inputClass}
          />
        </label>

        <label className={`${labelClass} sm:col-span-2`}>
          <span className={labelTextClass}>{vi.account.address}</span>
          <input
            maxLength={500}
            value={form.address}
            onChange={update('address')}
            className={inputClass}
          />
        </label>

        {!user && (
          <label className={`${labelClass} sm:col-span-2`}>
            <span className={labelTextClass}>
              {vi.admin.users.temporaryPassword}
            </span>
            <PasswordInput
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              autoComplete="new-password"
              value={form.password}
              onChange={update('password')}
            />
            <span className="text-[12.5px] text-[var(--muted)]">
              {vi.admin.users.passwordHint}
            </span>
          </label>
        )}

        {error && (
          <div className="sm:col-span-2">
            <FormAlert tone="error">{error}</FormAlert>
          </div>
        )}
      </form>
    </Modal>
  );
}
