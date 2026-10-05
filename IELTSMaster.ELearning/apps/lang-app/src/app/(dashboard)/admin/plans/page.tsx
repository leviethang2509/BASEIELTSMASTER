'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { AdminServicePlan } from '@lang/shared';
import {
  Badge,
  ConfirmDialog,
  DataTable,
  FormAlert,
  compactPrimaryButtonClass,
  iconButtonClass,
  type DataColumn,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { formatNumber, formatPrice } from '@/lib/format';
import { PlanFormModal } from './_components/PlanFormModal';

const GRID =
  'sm:grid-cols-[110px_minmax(0,1.6fr)_120px_130px_130px_90px_70px_90px]';

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<AdminServicePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminServicePlan | null>(null);
  const [deleting, setDeleting] = useState<AdminServicePlan | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<AdminServicePlan[]>('/admin/plans')
      .then(
        (result) => {
          if (cancelled) return;
          setPlans(result);
          setError(null);
        },
        (err: unknown) => {
          if (!cancelled) setError(errorMessage(err, vi.admin.loadFailed));
        },
      )
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/admin/plans/${deleting.id}`);
      reload();
    } catch (err) {
      setError(errorMessage(err, vi.admin.actionFailed));
    } finally {
      setDeleteBusy(false);
      setDeleting(null);
    }
  }

  const text = vi.admin.plans;
  const columns: DataColumn<AdminServicePlan>[] = [
    {
      header: text.code,
      render: (row) => (
        <span className="font-mono text-[13px] font-semibold text-[var(--heading)]">
          {row.code}
        </span>
      ),
    },
    {
      header: text.name,
      render: (row) => (
        <>
          <span className="block truncate text-[14px] font-semibold text-[var(--heading)]">
            {row.name}
          </span>
          {row.description && (
            <span className="block truncate text-[12.5px] text-[var(--muted)]">
              {row.description}
            </span>
          )}
        </>
      ),
    },
    {
      header: text.maxMembers,
      render: (row) => (
        <span className="text-[13.5px] text-[var(--body)]">
          {formatNumber(row.maxMembers)}
        </span>
      ),
    },
    {
      header: text.price,
      render: (row) => (
        <span className="text-[13.5px] text-[var(--body)]">
          {formatPrice(row.price)}
        </span>
      ),
    },
    {
      header: vi.admin.users.status,
      render: (row) => (
        <Badge tone={row.isActive ? 'success' : 'neutral'}>
          {row.isActive ? text.isActive : text.inactive}
        </Badge>
      ),
    },
    {
      header: text.tenantCount,
      render: (row) => (
        <span className="text-[13.5px] text-[var(--body)]">
          {formatNumber(row.tenantCount)}
        </span>
      ),
    },
    {
      header: text.sortOrder,
      render: (row) => (
        <span className="text-[13.5px] text-[var(--body)]">
          {row.sortOrder}
        </span>
      ),
    },
    {
      header: vi.admin.actions,
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            title={text.edit}
            aria-label={text.edit}
            onClick={() => setEditing(row)}
            className={iconButtonClass}
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            title={row.tenantCount > 0 ? text.inUse : text.delete}
            aria-label={text.delete}
            disabled={row.tenantCount > 0}
            onClick={() => setDeleting(row)}
            className={iconButtonClass}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="text-[13.5px] text-[var(--body)]">{text.subtitle}</p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={compactPrimaryButtonClass}
        >
          <Plus size={16} /> {text.create}
        </button>
      </div>

      {error && <FormAlert tone="error">{error}</FormAlert>}

      <DataTable
        columns={columns}
        rows={plans}
        rowKey={(row) => row.id}
        gridClass={GRID}
        loading={loading}
        emptyText={text.empty}
      />

      <PlanFormModal
        open={creating || editing !== null}
        plan={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => {
          setCreating(false);
          setEditing(null);
          reload();
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title={text.delete}
        message={deleting ? text.deleteConfirm(deleting.name) : ''}
        tone="danger"
        loading={deleteBusy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
