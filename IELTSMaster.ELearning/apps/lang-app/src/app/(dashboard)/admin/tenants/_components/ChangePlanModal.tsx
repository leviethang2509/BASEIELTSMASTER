'use client';

import { useEffect, useState } from 'react';
import type { AdminServicePlan, AdminTenant } from '@lang/shared';
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

const FORM_ID = 'admin-change-plan-form';

// Đổi gói có hiệu lực ngay; vượt giới hạn chỉ cảnh báo (chốt 2026-09-15).
export function ChangePlanModal({
  tenant,
  onClose,
  onDone,
}: {
  tenant: AdminTenant | null;
  onClose: () => void;
  onDone: (tenant: AdminTenant) => void;
}) {
  const [plans, setPlans] = useState<AdminServicePlan[] | null>(null);
  const [planId, setPlanId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const tenantId = tenant?.id;
  const currentPlanId = tenant?.plan.id;

  useEffect(() => {
    if (!tenantId) return;
    setPlanId(currentPlanId ?? '');
    setError(null);
    let cancelled = false;
    api.get<AdminServicePlan[]>('/admin/plans').then(
      (result) => {
        if (!cancelled) setPlans(result);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.admin.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [tenantId, currentPlanId]);

  if (!tenant) return null;
  const text = vi.admin.tenants;
  // Gói ngừng áp dụng chỉ hiện khi là gói hiện tại.
  const options = (plans ?? []).filter(
    (plan) => plan.isActive || plan.id === tenant.plan.id,
  );
  const selected = options.find((plan) => plan.id === planId);
  const overLimit = selected
    ? tenant.activeMembers > selected.maxMembers
    : false;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenant) return;
    setSaving(true);
    setError(null);
    try {
      onDone(
        await api.patch<AdminTenant>(`/admin/tenants/${tenant.id}/plan`, {
          planId,
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
      open
      onClose={onClose}
      title={`${text.changePlan} · ${tenant.name}`}
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
            disabled={saving || !selected || planId === tenant.plan.id}
            className={compactPrimaryButtonClass}
          >
            {saving ? vi.common.processing : vi.admin.save}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="grid gap-4">
        <label className={labelClass}>
          <span className={labelTextClass}>{text.plan}</span>
          <select
            value={planId}
            disabled={!plans}
            onChange={(event) => setPlanId(event.target.value)}
            className={inputClass}
          >
            {options.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {text.planOption(plan.name, plan.maxMembers)}
                {plan.id === tenant.plan.id ? ` ${text.currentPlan}` : ''}
              </option>
            ))}
          </select>
        </label>
        {overLimit && selected && (
          <p className="rounded-xl bg-[var(--warn-soft)] px-3.5 py-2.5 text-[13.5px] text-[var(--warn-text)]">
            {text.overLimitWarning(tenant.activeMembers, selected.maxMembers)}
          </p>
        )}
        {error && <FormAlert tone="error">{error}</FormAlert>}
      </form>
    </Modal>
  );
}
