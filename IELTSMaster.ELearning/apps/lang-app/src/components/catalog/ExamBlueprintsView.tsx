'use client';

import { useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  CatalogScope,
  type ExamBlueprintItem,
  type CategoryItem,
} from '@lang/shared';
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
import { BlueprintFormModal } from './BlueprintFormModal';
import {
  ActiveBadge,
  CategoryIcon,
  ScopeBadge,
  matchesSearch,
  useCatalogList,
} from './catalog-ui';

// Viết nguyên văn để Tailwind sinh class.
const SYSTEM_GRID =
  'sm:grid-cols-[120px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_70px_110px_90px]';
const TENANT_GRID =
  'sm:grid-cols-[120px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_70px_110px_100px_90px]';

type StatusFilter = 'active' | 'inactive';

interface ExamBlueprintsViewProps {
  /** `/admin` (loại đề hệ thống) hoặc `/t/{slug}` (hệ thống + tenant). */
  apiBase: string;
  scope: CatalogScope;
  /** Tenant: Owner/Admin sửa được mục của tenant, Teacher chỉ xem. */
  canManage: boolean;
}

/** Trang Loại đề dùng chung cho `/admin` và dashboard tenant. */
export function ExamBlueprintsView({
  apiBase,
  scope,
  canManage,
}: ExamBlueprintsViewProps) {
  const { rows, loading, error, setError, reload } =
    useCatalogList<ExamBlueprintItem>(`${apiBase}/exam-blueprints`);
  const categories = useCatalogList<CategoryItem>(`${apiBase}/categories`);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<StatusFilter | ''>('');
  const [scopeFilter, setScopeFilter] = useState<CatalogScope | ''>('');
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<ExamBlueprintItem | null>(null);
  const [deleting, setDeleting] = useState<ExamBlueprintItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const common = vi.catalog;
  const text = common.blueprints;
  const isTenant = scope === CatalogScope.TENANT;

  const visibleRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          matchesSearch(query, row.name, row.code) &&
          (categoryId === '' || row.category.id === categoryId) &&
          (status === '' || row.isActive === (status === 'active')) &&
          (scopeFilter === '' || row.scope === scopeFilter),
      ),
    [rows, query, categoryId, status, scopeFilter],
  );

  const editable = (row: ExamBlueprintItem) => canManage && row.scope === scope;

  const openForm = (row: ExamBlueprintItem | null) => {
    setSelected(row);
    setFormOpen(true);
    // Danh mục có thể vừa đổi ở trang khác.
    categories.reload();
  };

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.delete(`${apiBase}/exam-blueprints/${deleting.id}`);
      reload();
    } catch (err) {
      setError(errorMessage(err, common.deleteFailed));
    } finally {
      setDeleteBusy(false);
      setDeleting(null);
    }
  }

  const columns: DataColumn<ExamBlueprintItem>[] = [
    {
      header: common.code,
      render: (row) => (
        <span className="block truncate font-mono text-[13px] font-semibold text-[var(--heading)]">
          {row.code}
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
      header: text.category,
      render: (row) => (
        <span className="flex min-w-0 items-center gap-2">
          <CategoryIcon
            icon={row.category.icon}
            color={row.category.color}
            size={26}
          />
          <span
            className={`truncate text-[13.5px] ${
              row.category.isActive
                ? 'text-[var(--body)]'
                : 'text-[var(--muted)] line-through'
            }`}
            title={
              row.category.isActive
                ? undefined
                : text.inactiveCategory(row.category.name)
            }
          >
            {row.category.name}
          </span>
        </span>
      ),
    },
    {
      header: text.modules,
      render: (row) => (
        <>
          <span className="block text-[13px] font-medium text-[var(--body)]">
            {text.moduleCount(
              row.modules.length,
              row.modules.reduce(
                (sum, module) => sum + module.referenceDurationMinutes,
                0,
              ),
            )}
          </span>
          <span className="block truncate text-[12.5px] text-[var(--muted)]">
            {row.modules
              .map(
                (module) =>
                  `${module.name} ${text.minutes(module.referenceDurationMinutes)}`,
              )
              .join(' · ')}
          </span>
        </>
      ),
    },
    {
      header: text.examCount,
      render: (row) => (
        <span
          className="text-[13.5px] font-medium text-[var(--body)]"
          title={isTenant ? text.examCountTenantHint : text.examCountHint}
        >
          {row.examCount}
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
            render: (row: ExamBlueprintItem) => (
              <ScopeBadge scope={row.scope} />
            ),
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
              onClick={() => openForm(row)}
              className={iconButtonClass}
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              title={row.examCount > 0 ? text.inUse : text.delete}
              aria-label={text.delete}
              disabled={row.examCount > 0}
              onClick={() => setDeleting(row)}
              className={iconButtonClass}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            title={common.view}
            aria-label={common.view}
            onClick={() => openForm(row)}
            className={iconButtonClass}
          >
            <Eye size={16} />
          </button>
        ),
    },
  ];

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-[13.5px] text-[var(--body)]">
          {isTenant ? text.tenantSubtitle : text.subtitle}
          {isTenant && !canManage && ` ${common.readOnly}`}
        </p>
        {canManage && (
          <button
            type="button"
            onClick={() => openForm(null)}
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
        <SelectFilter
          value={categoryId}
          allLabel={text.allCategories}
          options={categories.rows.map((category) => ({
            value: category.id,
            label: category.name,
          }))}
          onChange={setCategoryId}
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

      {(error ?? categories.error) && (
        <FormAlert tone="error">{error ?? categories.error}</FormAlert>
      )}

      <DataTable
        columns={columns}
        rows={visibleRows}
        rowKey={(row) => row.id}
        gridClass={isTenant ? TENANT_GRID : SYSTEM_GRID}
        loading={loading}
        emptyText={text.empty}
      />

      <BlueprintFormModal
        open={formOpen}
        apiBase={apiBase}
        scope={scope}
        blueprint={selected}
        readOnly={selected !== null && !editable(selected)}
        categories={categories.rows}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
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
