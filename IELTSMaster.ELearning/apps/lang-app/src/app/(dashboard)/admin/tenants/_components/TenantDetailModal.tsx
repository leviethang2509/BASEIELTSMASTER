'use client';

import { Fragment, useEffect, useState } from 'react';
import {
  TenantStatus,
  type AdminTenant,
  type AdminTenantDetail,
  type TenantAiSettings,
} from '@lang/shared';
import {
  Badge,
  ConfirmDialog,
  FormAlert,
  Modal,
  PromptDialog,
  compactDangerButtonClass,
  compactPrimaryButtonClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { formatDateTime, formatNumber } from '@/lib/format';
import { ChangePlanModal } from './ChangePlanModal';
import { TenantAiSection } from './TenantAiSection';
import { TENANT_STATUS_TONE } from '@/components/tenant/tenant-status';

type ConfirmAction = 'approve' | 'unsuspend';
type ReasonAction = 'reject' | 'suspend';

interface TenantDetailModalProps {
  tenant: AdminTenant | null;
  onClose: () => void;
  /** Tenant sau khi đổi trạng thái/gói. */
  onChanged: (tenant: AdminTenant) => void;
}

// Chi tiết cơ bản của tenant và các thao tác theo trạng thái (plan Step 7).
export function TenantDetailModal({
  tenant,
  onClose,
  onChanged,
}: TenantDetailModalProps) {
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [reasonAction, setReasonAction] = useState<ReasonAction | null>(null);
  const [changingPlan, setChangingPlan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ai, setAi] = useState<TenantAiSettings | null>(null);
  const tenantId = tenant?.id;

  useEffect(() => setError(null), [tenantId]);

  // Danh sách không có phần AI (phải đếm lượt) → tải chi tiết khi mở.
  useEffect(() => {
    setAi(null);
    if (!tenantId) return;
    let cancelled = false;
    api.get<AdminTenantDetail>(`/admin/tenants/${tenantId}`).then(
      (detail) => {
        if (!cancelled) setAi(detail.ai);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.admin.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  if (!tenant) return null;
  const text = vi.admin.tenants;

  async function run(request: () => Promise<AdminTenant>) {
    setBusy(true);
    setError(null);
    try {
      onChanged(await request());
    } catch (err) {
      setError(errorMessage(err, vi.admin.actionFailed));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const overLimit = tenant.activeMembers > tenant.plan.maxMembers;
  const rows: [string, React.ReactNode][] = [
    [text.url, <span className="font-mono">/t/{tenant.slug}</span>],
    [
      text.owner,
      <>
        {tenant.owner.fullName} ·{' '}
        <span className="font-mono">{tenant.owner.email}</span>
      </>,
    ],
    [text.plan, text.planOption(tenant.plan.name, tenant.plan.maxMembers)],
    [
      text.members,
      `${formatNumber(tenant.activeMembers)} / ${formatNumber(tenant.plan.maxMembers)}`,
    ],
    [text.email, tenant.email ?? '—'],
    [text.phone, tenant.phone ?? '—'],
    [text.address, tenant.address ?? '—'],
    [text.description, tenant.description ?? '—'],
    [text.createdAt, formatDateTime(tenant.createdAt)],
  ];
  if (tenant.rejectionReason) {
    rows.push([text.rejectionReason, tenant.rejectionReason]);
  }
  if (tenant.suspensionReason) {
    rows.push([text.suspensionReason, tenant.suspensionReason]);
  }
  if (tenant.reviewer) {
    rows.push([
      text.lastReview,
      `${tenant.reviewer.fullName} · ${formatDateTime(tenant.reviewedAt)}`,
    ]);
  }

  const footer = (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => setChangingPlan(true)}
        className={secondaryButtonClass}
      >
        {text.changePlan}
      </button>
      {tenant.status === TenantStatus.PENDING && (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => setReasonAction('reject')}
            className={compactDangerButtonClass}
          >
            {text.reject}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirm('approve')}
            className={compactPrimaryButtonClass}
          >
            {text.approve}
          </button>
        </>
      )}
      {tenant.status === TenantStatus.ACTIVE && (
        <button
          type="button"
          disabled={busy}
          onClick={() => setReasonAction('suspend')}
          className={compactDangerButtonClass}
        >
          {text.suspend}
        </button>
      )}
      {tenant.status === TenantStatus.SUSPENDED && (
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirm('unsuspend')}
          className={compactPrimaryButtonClass}
        >
          {text.unsuspend}
        </button>
      )}
    </>
  );

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={tenant.name}
        widthClass="max-w-2xl"
        footer={footer}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone={TENANT_STATUS_TONE[tenant.status]}>
            {vi.tenantStatus[tenant.status]}
          </Badge>
          {overLimit && <Badge tone="warning">{text.overLimit}</Badge>}
        </div>
        {overLimit && (
          <p className="mb-4 rounded-xl bg-[var(--warn-soft)] px-3.5 py-2.5 text-[13.5px] text-[var(--warn-text)]">
            {text.overLimitWarning(
              tenant.activeMembers,
              tenant.plan.maxMembers,
            )}
          </p>
        )}
        <dl className="grid gap-x-4 gap-y-2.5 sm:grid-cols-[150px_minmax(0,1fr)]">
          {rows.map(([label, value]) => (
            <Fragment key={label}>
              <dt className="text-[13px] font-semibold text-[var(--muted)]">
                {label}
              </dt>
              <dd className="whitespace-pre-line break-words text-[14px] text-[var(--heading)]">
                {value}
              </dd>
            </Fragment>
          ))}
        </dl>
        <TenantAiSection
          tenantId={tenant.id}
          ai={ai}
          onSaved={(detail) => {
            setAi(detail.ai);
            onChanged(detail);
          }}
        />
        {error && (
          <div className="mt-4">
            <FormAlert tone="error">{error}</FormAlert>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'approve' ? text.approve : text.unsuspend}
        message={
          confirm === 'approve'
            ? text.approveConfirm(tenant.name)
            : text.unsuspendConfirm(tenant.name)
        }
        loading={busy}
        onConfirm={() => {
          const action = confirm;
          if (action) {
            void run(() =>
              api.post<AdminTenant>(`/admin/tenants/${tenant.id}/${action}`),
            );
          }
        }}
        onCancel={() => setConfirm(null)}
      />
      <PromptDialog
        open={reasonAction !== null}
        title={reasonAction === 'reject' ? text.reject : text.suspend}
        label={
          reasonAction === 'reject'
            ? text.rejectReasonLabel
            : text.suspendReasonLabel
        }
        onSubmit={(reason) => {
          const action = reasonAction;
          // Đóng ngay để không gửi hai lần; lỗi hiện trong dialog chi tiết.
          setReasonAction(null);
          if (action) {
            void run(() =>
              api.post<AdminTenant>(`/admin/tenants/${tenant.id}/${action}`, {
                reason,
              }),
            );
          }
        }}
        onCancel={() => setReasonAction(null)}
      />
      <ChangePlanModal
        tenant={changingPlan ? tenant : null}
        onClose={() => setChangingPlan(false)}
        onDone={(updated) => {
          setChangingPlan(false);
          onChanged(updated);
        }}
      />
    </>
  );
}
