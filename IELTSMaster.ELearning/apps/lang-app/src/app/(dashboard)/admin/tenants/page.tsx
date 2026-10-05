'use client';

import { useEffect, useState } from 'react';
import {
  TenantStatus,
  type AdminStats,
  type AdminTenant,
  type Paginated,
} from '@lang/shared';
import {
  Badge,
  DataTable,
  FormAlert,
  Pagination,
  SearchInput,
  type DataColumn,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { formatDate, formatNumber } from '@/lib/format';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { TenantDetailModal } from './_components/TenantDetailModal';
import { TENANT_STATUS_TONE } from '@/components/tenant/tenant-status';

const PAGE_SIZE = 20;
const GRID =
  'sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1.4fr)_100px_130px_130px_100px_90px]';

type Tab = TenantStatus | 'all';
const TABS: Tab[] = [
  TenantStatus.PENDING,
  TenantStatus.ACTIVE,
  TenantStatus.REJECTED,
  TenantStatus.SUSPENDED,
  'all',
];

/** Mặc định mở tab "Chờ duyệt" vì đó là việc cần xử lý. */
const parseTab = (value: string | undefined): Tab =>
  TABS.find((tab) => tab === value) ?? TenantStatus.PENDING;

export default function AdminTenantsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const [tab, setTab] = useState<Tab>(parseTab(searchParams.status));
  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query.trim());
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminTenant> | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<AdminTenant | null>(null);

  useEffect(() => setPage(1), [tab, q]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (tab !== 'all') params.set('status', tab);
    if (q) params.set('q', q);
    setLoading(true);
    api
      .get<Paginated<AdminTenant>>(`/admin/tenants?${params.toString()}`)
      .then(
        (result) => {
          if (cancelled) return;
          setData(result);
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
  }, [page, tab, q, reloadKey]);

  // Số lượng trên các tab.
  useEffect(() => {
    let cancelled = false;
    api.get<AdminStats>('/admin/stats').then(
      (result) => {
        if (!cancelled) setStats(result);
      },
      () => {
        if (!cancelled) setStats(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function selectTab(next: Tab) {
    setTab(next);
    // Giữ tab trên URL để tải lại trang vẫn đúng tab.
    window.history.replaceState(null, '', `/admin/tenants?status=${next}`);
  }

  const countOf = (value: Tab) =>
    !stats
      ? null
      : value === 'all'
        ? stats.tenants.total
        : stats.tenants.byStatus[value];

  const columns: DataColumn<AdminTenant>[] = [
    {
      header: vi.admin.tenants.column,
      render: (row) => (
        <>
          <span className="block truncate text-[14px] font-semibold text-[var(--heading)]">
            {row.name}
          </span>
          <span className="block truncate font-mono text-[12.5px] text-[var(--muted)]">
            /t/{row.slug}
          </span>
        </>
      ),
    },
    {
      header: vi.admin.tenants.owner,
      render: (row) => (
        <>
          <span className="block truncate text-[13.5px] text-[var(--heading)]">
            {row.owner.fullName}
          </span>
          <span className="block truncate font-mono text-[12.5px] text-[var(--muted)]">
            {row.owner.email}
          </span>
        </>
      ),
    },
    {
      header: vi.admin.tenants.plan,
      render: (row) => (
        <span className="text-[13.5px] text-[var(--body)]">
          {row.plan.name}
        </span>
      ),
    },
    {
      header: vi.admin.tenants.members,
      render: (row) => (
        <div className="flex flex-wrap items-center gap-1.5 text-[13.5px] text-[var(--body)]">
          {formatNumber(row.activeMembers)} /{' '}
          {formatNumber(row.plan.maxMembers)}
          {row.activeMembers > row.plan.maxMembers && (
            <Badge tone="warning">{vi.admin.tenants.overLimit}</Badge>
          )}
        </div>
      ),
    },
    {
      header: vi.admin.tenants.status,
      render: (row) => (
        <Badge tone={TENANT_STATUS_TONE[row.status]}>
          {vi.tenantStatus[row.status]}
        </Badge>
      ),
    },
    {
      header: vi.admin.tenants.createdAt,
      render: (row) => (
        <span className="text-[13px] text-[var(--body)]">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      header: vi.admin.actions,
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelected(row)}
          className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
        >
          {vi.admin.tenants.detail}
        </button>
      ),
    },
  ];

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <p className="shrink-0 text-[13.5px] text-[var(--body)]">
        {vi.admin.tenants.subtitle}
      </p>

      <div role="tablist" className="flex shrink-0 flex-wrap gap-1.5">
        {TABS.map((value) => {
          const active = value === tab;
          const count = countOf(value);
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(value)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13.5px] font-semibold transition ${
                active
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--border-strong)] text-[var(--body)] hover:bg-[var(--hover)]'
              }`}
            >
              {value === 'all' ? vi.admin.all : vi.tenantStatus[value]}
              {count !== null && (
                <span className="rounded-md bg-[var(--card)] px-1.5 text-[12px]">
                  {formatNumber(count)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0">
        <SearchInput
          value={query}
          placeholder={vi.admin.tenants.searchPlaceholder}
          onChange={setQuery}
        />
      </div>

      {error && <FormAlert tone="error">{error}</FormAlert>}

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(row) => row.id}
        gridClass={GRID}
        loading={loading}
        emptyText={vi.admin.tenants.empty}
        footer={
          data && data.total > 0 ? (
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onChange={setPage}
            />
          ) : null
        }
      />

      <TenantDetailModal
        tenant={selected}
        onClose={() => setSelected(null)}
        onChanged={(tenant) => {
          setSelected(tenant);
          setReloadKey((key) => key + 1);
        }}
      />
    </div>
  );
}
