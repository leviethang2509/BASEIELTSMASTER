'use client';

import { useEffect, useState } from 'react';
import {
  SERVICE_PLAN_CODE_MAX_LENGTH,
  type AdminServicePlan,
} from '@lang/shared';
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

const FORM_ID = 'admin-plan-form';

const emptyForm = {
  code: '',
  name: '',
  maxMembers: '',
  price: '',
  description: '',
  sortOrder: '0',
  isActive: true,
};

type TextField = Exclude<keyof typeof emptyForm, 'isActive'>;

interface PlanFormModalProps {
  open: boolean;
  /** `null` là tạo mới. */
  plan: AdminServicePlan | null;
  onClose: () => void;
  onSaved: (plan: AdminServicePlan) => void;
}

export function PlanFormModal({
  open,
  plan,
  onClose,
  onSaved,
}: PlanFormModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const text = vi.admin.plans;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      plan
        ? {
            code: plan.code,
            name: plan.name,
            maxMembers: String(plan.maxMembers),
            price: plan.price === null ? '' : String(Number(plan.price)),
            description: plan.description ?? '',
            sortOrder: String(plan.sortOrder),
            isActive: plan.isActive,
          }
        : emptyForm,
    );
  }, [open, plan]);

  const update =
    (field: TextField) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = {
      name: form.name,
      maxMembers: Number(form.maxMembers),
      price: form.price.trim() === '' ? null : Number(form.price),
      description: form.description,
      sortOrder: Number(form.sortOrder || 0),
      isActive: form.isActive,
    };
    setSaving(true);
    setError(null);
    try {
      onSaved(
        plan
          ? await api.patch<AdminServicePlan>(`/admin/plans/${plan.id}`, body)
          : await api.post<AdminServicePlan>('/admin/plans', {
              code: form.code,
              ...body,
            }),
      );
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
      title={plan ? text.edit : text.create}
      widthClass="max-w-xl"
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
        <label className={labelClass}>
          <span className={labelTextClass}>{text.code}</span>
          <input
            required
            maxLength={SERVICE_PLAN_CODE_MAX_LENGTH}
            disabled={plan !== null}
            value={form.code}
            onChange={update('code')}
            className={`${inputClass} font-mono`}
          />
          <span className="text-[12.5px] text-[var(--muted)]">
            {text.codeHint}
          </span>
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>{text.name}</span>
          <input
            required
            maxLength={100}
            value={form.name}
            onChange={update('name')}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>{text.maxMembers}</span>
          <input
            type="number"
            required
            min={1}
            step={1}
            value={form.maxMembers}
            onChange={update('maxMembers')}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>{text.price}</span>
          <input
            type="number"
            min={0}
            step="any"
            value={form.price}
            onChange={update('price')}
            className={inputClass}
          />
        </label>

        <label className={`${labelClass} sm:col-span-2`}>
          <span className={labelTextClass}>{text.description}</span>
          <textarea
            rows={3}
            maxLength={2000}
            value={form.description}
            onChange={update('description')}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>{text.sortOrder}</span>
          <input
            type="number"
            min={0}
            step={1}
            value={form.sortOrder}
            onChange={update('sortOrder')}
            className={inputClass}
          />
        </label>

        <label className="flex items-start gap-2.5 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                isActive: event.target.checked,
              }))
            }
            className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
          />
          <span>
            <span className={labelTextClass}>{text.isActive}</span>
            <span className="block text-[12.5px] text-[var(--muted)]">
              {text.activeHint}
            </span>
          </span>
        </label>

        {error && (
          <div className="sm:col-span-2">
            <FormAlert tone="error">{error}</FormAlert>
          </div>
        )}
      </form>
    </Modal>
  );
}
