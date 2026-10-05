'use client';

import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { CatalogScope, type CategoryItem } from '@lang/shared';
import {
  ConfirmDialog,
  DataTable,
  FormAlert,
  SearchInput,
  SelectFilter,
  compactPrimaryButtonClass,
  iconButtonClass,
  type DataColumn,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { formatNumber } from '@/lib/format';
import { CategoryFormModal } from './CategoryFormModal';
import {
  ActiveBadge,
  CategoryIcon,
  ScopeBadge,
  matchesSearch,
  useCatalogList,
} from './catalog-ui';

// Viết nguyên văn để Tailwind sinh class.
const SYSTEM_GRID =
  'sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_80px_110px_80px_80px_110px_90px]';
const TENANT_GRID =
  'sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_80px_110px_80px_80px_110px_100px_90px]';

type StatusFilter = 'active' | 'inactive';

interface CategoriesViewProps {
  /** `/admin` (danh mục hệ thống) hoặc `/t/{slug}` (hệ thống + tenant). */
  apiBase: string;
  scope: CatalogScope;
  /** Tenant: Owner/Admin sửa được mục của tenant, Teacher chỉ xem. */
  canManage: boolean;
}

/** Trang Danh mục dùng chung cho `/admin` và dashboard tenant. */
export function CategoriesView({
  apiBase,
  scope,
  canManage,
}: CategoriesViewProps) {
  const { rows, loading, error, setError, reload } =
    useCatalogList<CategoryItem>(`${apiBase}/categories`);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter | ''>('');
  const [scopeFilter, setScopeFilter] = useState<CatalogScope | ''>('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [deleting, setDeleting] = useState<CategoryItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const common = vi.catalog;
  const text = common.categories;
  const isTenant = scope === CatalogScope.TENANT;

  const visibleRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          matchesSearch(query, row.name, row.code) &&
          (status === '' || row.isActive === (status === 'active')) &&
          (scopeFilter === '' || row.scope === scopeFilter),
      ),
    [rows, query, status, scopeFilter],
  );

  /** Tenant chỉ sửa mục của mình; trang hệ thống chỉ có mục hệ thống. */
  const editable = (row: CategoryItem) => canManage && row.scope === scope;

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.delete(`${apiBase}/categories/${deleting.id}`);
      reload();
    } catch (err) {
      setError(errorMessage(err, common.deleteFailed));
    } finally {
      setDeleteBusy(false);
      setDeleting(null);
    }
  }

  const inUse = (row: CategoryItem) =>
    row.examBlueprintCount > 0 ||
    row.lessonBlueprintCount > 0 ||
    row.courseCount > 0;

  const columns: DataColumn<CategoryItem>[] = [
    {
      header: common.code,
      render: (row) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <CategoryIcon icon={row.icon} color={row.color} />
          <span className="truncate font-mono text-[13px] font-semibold text-[var(--heading)]">
            {row.code}
          </span>
        </span>
      ),
    },
    {
      header: common.name,
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
      header: text.examBlueprintCount,
      render: (row) => (
        <span className="text-[13.5px] text-[var(--body)]">
          {formatNumber(row.examBlueprintCount)}
        </span>
      ),
    },
    {
      header: text.lessonBlueprintCount,
      render: (row) => (
        <span className="text-[13.5px] text-[var(--body)]">
          {formatNumber(row.lessonBlueprintCount)}
        </span>
      ),
    },
    {
      header: text.courseCount,
      render: (row) => (
        <span className="text-[13.5px] text-[var(--body)]">
          {formatNumber(row.courseCount)}
        </span>
      ),
    },
    {
      header: common.sortOrder,
      render: (row) => (
        <span className="text-[13.5px] text-[var(--body)]">
          {row.sortOrder}
        </span>
      ),
    },
    {
      header: common.status,
      render: (row) => <ActiveBadge active={row.isActive} />,
    },
    ...(isTenant
      ? [
          {
            header: common.scopeColumn,
            render: (row: CategoryItem) => <ScopeBadge scope={row.scope} />,
          },
        ]
      : []),
    {
      header: common.actions,
      render: (row) =>
        editable(row) ? (
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
              title={inUse(row) ? text.inUse : text.delete}
              aria-label={text.delete}
              disabled={inUse(row)}
              onClick={() => setDeleting(row)}
              className={iconButtonClass}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          <span className="text-[13px] text-[var(--muted)]">—</span>
        ),
    },
  ];

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="text-[13.5px] text-[var(--body)]">
          {isTenant ? text.tenantSubtitle : text.subtitle}
          {isTenant && !canManage && ` ${common.readOnly}`}
        </p>
        {canManage && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={compactPrimaryButtonClass}
          >
            <Plus size={16} /> {text.create}
          </button>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
        <SearchInput
          value={query}
          placeholder={text.searchPlaceholder}
          onChange={setQuery}
        />
        {isTenant && (
          <SelectFilter
            value={scopeFilter}
            allLabel={common.allScopes}
            options={Object.values(CatalogScope).map((value) => ({
              value,
              label: common.scope[value],
            }))}
            onChange={setScopeFilter}
          />
        )}
        <SelectFilter
          value={status}
          allLabel={common.allStatuses}
          options={[
            { value: 'active', label: common.active },
            { value: 'inactive', label: common.inactive },
          ]}
          onChange={setStatus}
        />
      </div>

      {error && <FormAlert tone="error">{error}</FormAlert>}

      <DataTable
        columns={columns}
        rows={visibleRows}
        rowKey={(row) => row.id}
        gridClass={isTenant ? TENANT_GRID : SYSTEM_GRID}
        loading={loading}
        emptyText={text.empty}
      />

      <CategoryFormModal
        open={creating || editing !== null}
        apiBase={apiBase}
        category={editing}
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
        confirmLabel={text.delete}
        tone="danger"
        loading={deleteBusy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
