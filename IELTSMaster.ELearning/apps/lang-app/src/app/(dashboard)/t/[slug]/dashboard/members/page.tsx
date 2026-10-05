'use client';

import { useEffect, useState } from 'react';
import { Lock, LockOpen, Mail, Pencil, Trash2, UserPlus } from 'lucide-react';
import {
  MembershipStatus,
  TenantRole,
  type CreateMemberAccountResult,
  type DeactivationSuggestions,
  type MembershipListItem,
  type Paginated,
} from '@lang/shared';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import {
  OverLimitBanner,
  warningButtonClass,
} from '@/components/tenant/OverLimitBanner';
import {
  Badge,
  ConfirmDialog,
  DataTable,
  FormAlert,
  Pagination,
  SearchInput,
  SelectFilter,
  TemporaryPasswordDialog,
  compactPrimaryButtonClass,
  iconButtonClass,
  secondaryButtonClass,
  type DataColumn,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { formatDate, formatDateTime } from '@/lib/format';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { AddMemberModal } from './_components/AddMemberModal';
import { CreateMemberModal } from './_components/CreateMemberModal';
import { DeactivationSuggestionsModal } from './_components/DeactivationSuggestionsModal';
import { MemberDetailModal } from './_components/MemberDetailModal';
import {
  ROLE_TONE,
  isMinor,
  membershipsPath,
} from './_components/member-utils';

const PAGE_SIZE = 20;
const GRID =
  'sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_140px_140px_100px_110px]';

const text = vi.members;

const isTenantRole = (value: string | undefined): value is TenantRole =>
  (Object.values(TenantRole) as (string | undefined)[]).includes(value);

interface PendingAction {
  kind: 'toggle' | 'remove';
  member: MembershipListItem;
}

export default function TenantMembersPage({
  searchParams,
}: {
  searchParams: { role?: string };
}) {
  const { tenant, roles: actorRoles } = useTenantDashboard();
  const { user, reloadContexts } = useAuth();
  const slug = tenant.slug;
  const base = membershipsPath(slug);
  const actorIsOwner = actorRoles.includes(TenantRole.TENANT_OWNER);

  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query.trim());
  const [role, setRole] = useState<TenantRole | ''>(
    isTenantRole(searchParams.role) ? searchParams.role : '',
  );
  const [status, setStatus] = useState<MembershipStatus | ''>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<MembershipListItem> | null>(null);
  const [quota, setQuota] = useState<DeactivationSuggestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreateMemberAccountResult | null>(
    null,
  );
  const [selected, setSelected] = useState<MembershipListItem | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  // Đổi bộ lọc thì quay về trang đầu.
  useEffect(() => setPage(1), [q, role, status]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (q) params.set('q', q);
    if (role) params.set('role', role);
    if (status) params.set('status', status);
    setLoading(true);
    api
      .get<Paginated<MembershipListItem>>(`${base}?${params.toString()}`)
      .then(
        (result) => {
          if (cancelled) return;
          setData(result);
          setError(null);
        },
        (err: unknown) => {
          if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
        },
      )
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [base, page, q, role, status, reloadKey]);

  // Số thành viên / giới hạn gói và số cần bớt khi vượt gói.
  useEffect(() => {
    let cancelled = false;
    api.get<DeactivationSuggestions>(`${base}/deactivation-suggestions`).then(
      (result) => {
        if (!cancelled) setQuota(result);
      },
      () => {
        if (!cancelled) setQuota(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [base, reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);
  const full = quota !== null && quota.activeMembers >= quota.maxMembers;

  async function runPending() {
    if (!pending) return;
    const { kind, member } = pending;
    setBusy(true);
    try {
      if (kind === 'remove') {
        await api.delete(`${base}/${member.id}`);
      } else {
        await api.patch(`${base}/${member.id}`, {
          status:
            member.status === MembershipStatus.ACTIVE
              ? MembershipStatus.INACTIVE
              : MembershipStatus.ACTIVE,
        });
      }
      reload();
    } catch (err) {
      setError(errorMessage(err, vi.admin.actionFailed));
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  function renderActions(row: MembershipListItem) {
    const rowIsOwner = row.roles.includes(TenantRole.TENANT_OWNER);
    // Ẩn nút chỉ là lớp giao diện; API vẫn trả 403 nếu không đủ quyền.
    if (rowIsOwner && !actorIsOwner) {
      return (
        <span
          title={text.ownerLocked}
          className="text-[13px] text-[var(--muted)]"
        >
          —
        </span>
      );
    }
    const inactive = row.status === MembershipStatus.INACTIVE;
    const toggleLabel = inactive ? text.activate : text.deactivate;
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          title={text.detail}
          aria-label={text.detail}
          onClick={() => setSelected(row)}
          className={iconButtonClass}
        >
          <Pencil size={16} />
        </button>
        {!rowIsOwner && (
          <>
            <button
              type="button"
              title={toggleLabel}
              aria-label={toggleLabel}
              onClick={() => setPending({ kind: 'toggle', member: row })}
              className={iconButtonClass}
            >
              {inactive ? <LockOpen size={16} /> : <Lock size={16} />}
            </button>
            <button
              type="button"
              title={text.remove}
              aria-label={text.remove}
              onClick={() => setPending({ kind: 'remove', member: row })}
              className={iconButtonClass}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    );
  }

  const columns: DataColumn<MembershipListItem>[] = [
    {
      header: text.column,
      render: (row) => (
        <>
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[14px] font-semibold text-[var(--heading)]">
              {row.fullName}
            </span>
            {isMinor(row.dateOfBirth) && (
              <Badge tone="warning">{text.minor}</Badge>
            )}
          </span>
          <span className="block truncate font-mono text-[12.5px] text-[var(--muted)]">
            {row.email}
          </span>
        </>
      ),
    },
    {
      header: text.roles,
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          {row.roles.map((item) => (
            <Badge key={item} tone={ROLE_TONE[item]}>
              {vi.tenantRoles[item]}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      header: text.status,
      render: (row) => (
        <Badge
          tone={row.status === MembershipStatus.ACTIVE ? 'success' : 'danger'}
        >
          {vi.membershipStatus[row.status]}
        </Badge>
      ),
    },
    {
      header: text.lastActive,
      render: (row) => (
        <span className="text-[13px] text-[var(--body)]">
          {row.lastActiveAt
            ? formatDateTime(row.lastActiveAt)
            : text.neverActive}
        </span>
      ),
    },
    {
      header: text.joinedAt,
      render: (row) => (
        <span className="text-[13px] text-[var(--body)]">
          {formatDate(row.joinedAt)}
        </span>
      ),
    },
    { header: vi.admin.actions, render: renderActions },
  ];

  const pendingName = pending?.member.fullName ?? '';
  const pendingActivates = pending?.member.status === MembershipStatus.INACTIVE;

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="text-[13.5px] text-[var(--body)]">{text.subtitle}</p>
          {quota && (
            <Badge tone={full ? 'warning' : 'neutral'}>
              {text.quota(quota.activeMembers, quota.maxMembers)}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={full}
            onClick={() => setAdding(true)}
            className={secondaryButtonClass}
          >
            <Mail size={16} /> {text.addByEmail}
          </button>
          <button
            type="button"
            disabled={full}
            onClick={() => setCreating(true)}
            className={compactPrimaryButtonClass}
          >
            <UserPlus size={16} /> {text.createAccount}
          </button>
        </div>
      </div>

      {quota && quota.excess > 0 ? (
        <OverLimitBanner quota={quota}>
          <button
            type="button"
            onClick={() => setSuggestionsOpen(true)}
            className={warningButtonClass}
          >
            {vi.tenantDashboard.viewSuggestions}
          </button>
        </OverLimitBanner>
      ) : (
        full &&
        quota && (
          <p className="shrink-0 rounded-xl bg-[var(--warn-soft)] px-3.5 py-2.5 text-[13.5px] text-[var(--warn-text)]">
            {text.full(quota.maxMembers, quota.planName)}
          </p>
        )
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
        <SearchInput
          value={query}
          placeholder={text.searchPlaceholder}
          onChange={setQuery}
        />
        <SelectFilter
          value={role}
          allLabel={text.allRoles}
          options={Object.values(TenantRole).map((value) => ({
            value,
            label: vi.tenantRoles[value],
          }))}
          onChange={setRole}
        />
        <SelectFilter
          value={status}
          allLabel={text.allStatuses}
          options={Object.values(MembershipStatus).map((value) => ({
            value,
            label: vi.membershipStatus[value],
          }))}
          onChange={setStatus}
        />
      </div>

      {error && <FormAlert tone="error">{error}</FormAlert>}

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(row) => row.id}
        gridClass={GRID}
        loading={loading}
        emptyText={text.empty}
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

      <AddMemberModal
        open={adding}
        slug={slug}
        onClose={() => setAdding(false)}
        onAdded={() => {
          setAdding(false);
          reload();
        }}
      />
      <CreateMemberModal
        open={creating}
        slug={slug}
        onClose={() => setCreating(false)}
        onCreated={(result) => {
          setCreating(false);
          setCreated(result);
          reload();
        }}
      />
      <MemberDetailModal
        slug={slug}
        member={selected}
        onClose={() => setSelected(null)}
        onChanged={(member) => {
          reload();
          // Tự đổi role của mình thì menu dashboard cũng phải đổi theo.
          if (member.userId === user?.id) void reloadContexts();
        }}
      />
      <DeactivationSuggestionsModal
        open={suggestionsOpen}
        slug={slug}
        onClose={() => setSuggestionsOpen(false)}
        onChanged={reload}
      />
      <ConfirmDialog
        open={pending !== null}
        title={
          pending?.kind === 'remove'
            ? text.remove
            : pendingActivates
              ? text.activate
              : text.deactivate
        }
        message={
          pending?.kind === 'remove'
            ? text.removeConfirm(pendingName)
            : pendingActivates
              ? text.activateConfirm(pendingName)
              : text.deactivateConfirm(pendingName)
        }
        tone={pendingActivates ? 'default' : 'danger'}
        loading={busy}
        onConfirm={() => void runPending()}
        onCancel={() => setPending(null)}
      />
      <TemporaryPasswordDialog
        open={created !== null}
        title={text.created}
        email={created?.membership.email ?? ''}
        password={created?.temporaryPassword ?? null}
        onClose={() => setCreated(null)}
      />
    </div>
  );
}
