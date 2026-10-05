'use client';

import { useId, useState } from 'react';
import {
  AI_MONTHLY_QUOTA_OPTIONS,
  isAiMonthlyQuota,
  type AdminTenantDetail,
  type AiMonthlyQuota,
  type TenantAiSettings,
} from '@lang/shared';
import { FormAlert, inputClass, labelTextClass } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';

const UNLIMITED = 'unlimited';

// Khối "Trợ lý AI" trong chi tiết tenant (req-5 plan 1.15): đổi là lưu ngay.
export function TenantAiSection({
  tenantId,
  ai,
  onSaved,
}: {
  tenantId: string;
  /** `null` khi đang tải chi tiết. */
  ai: TenantAiSettings | null;
  onSaved: (tenant: AdminTenantDetail) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quotaId = useId();
  const text = vi.admin.tenants.ai;

  async function save(enabled: boolean, monthlyQuota: AiMonthlyQuota | null) {
    setSaving(true);
    setError(null);
    try {
      onSaved(
        await api.patch<AdminTenantDetail>(`/admin/tenants/${tenantId}/ai`, {
          enabled,
          monthlyQuota,
        }),
      );
    } catch (err) {
      setError(errorMessage(err, vi.admin.actionFailed));
    } finally {
      setSaving(false);
    }
  }

  const enabled = ai?.enabled ?? false;
  const busy = saving || !ai;

  return (
    <section className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--sidebar)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-[var(--heading)]">
            {text.title}
          </h3>
          <p className="mt-1 text-[13px] text-[var(--body)]">{text.hint}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={text.toggle}
          disabled={busy}
          onClick={() => ai && void save(!ai.enabled, ai.monthlyQuota)}
          className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
            enabled ? 'bg-[var(--accent-bg)]' : 'bg-[var(--border-strong)]'
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_var(--shadow-2)] transition-transform ${
              enabled ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      {ai ? (
        <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-2">
          <label htmlFor={quotaId} className="flex flex-col gap-1.5">
            <span className={labelTextClass}>{text.quota}</span>
            <select
              id={quotaId}
              value={ai.monthlyQuota === null ? UNLIMITED : ai.monthlyQuota}
              disabled={busy || !enabled}
              onChange={(event) => {
                const value = Number(event.target.value);
                void save(ai.enabled, isAiMonthlyQuota(value) ? value : null);
              }}
              className={`${inputClass} !w-auto !py-2 text-[14px]`}
            >
              {AI_MONTHLY_QUOTA_OPTIONS.map((quota) => (
                <option key={quota} value={quota}>
                  {text.quotaOption(quota)}
                </option>
              ))}
              <option value={UNLIMITED}>{text.unlimited}</option>
            </select>
          </label>
          <p className="pb-2 text-[13.5px] text-[var(--body)]">
            {text.used(ai.usedThisMonth, ai.monthlyQuota)}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-[13.5px] text-[var(--muted)]">
          {vi.common.loading}
        </p>
      )}

      {error && (
        <div className="mt-3">
          <FormAlert tone="error">{error}</FormAlert>
        </div>
      )}
    </section>
  );
}
