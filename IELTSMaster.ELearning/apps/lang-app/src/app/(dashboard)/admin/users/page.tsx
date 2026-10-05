'use client';

import { useEffect, useState } from 'react';
import {
  KeyRound,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import {
  SystemRole,
  UserStatus,
  canManageUser,
  type AdminUser,
  type AdminUserPasswordResult,
  type Paginated,
} from '@lang/shared';
import { useAuth } from '@/components/auth/AuthProvider';
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
  type BadgeTone,
  type DataColumn,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { formatDate, formatDateTime } from '@/lib/format';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { ResetPasswordModal } from './_components/ResetPasswordModal';
import { SystemRoleModal } from './_components/SystemRoleModal';
import { UserFormModal } from './_components/UserFormModal';

const PAGE_SIZE = 20;
const GRID = 'sm:grid-cols-[minmax(0,2fr)_130px_170px_150px_100px_150px]';

const ROLE_TONE: Record<SystemRole, BadgeTone> = {
  SYSTEM_OWNER: 'accent',
  SYSTEM_ADMIN: 'warning',
  REGISTERED_USER: 'neutral',
};

const isUserStatus = (value: string | undefined): value is UserStatus =>
  (Object.values(UserStatus) as (string | undefined)[]).includes(value);

interface PasswordNotice {
  title: string;
  result: AdminUserPasswordResult;
}

export default function AdminUsersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const { user: actor } = useAuth();
  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query.trim());
  const [systemRole, setSystemRole] = useState<SystemRole | ''>('');
  const [status, setStatus] = useState<UserStatus | ''>(
    isUserStatus(searchParams.status) ? searchParams.status : '',
  );
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  const [changingRole, setChangingRole] = useState<AdminUser | null>(null);
  const [toggling, setToggling] = useState<AdminUser | null>(null);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [notice, setNotice] = useState<PasswordNotice | null>(null);

  // Đổi bộ lọc thì quay về trang đầu.
  useEffect(() => setPage(1), [q, systemRole, status]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (q) params.set('q', q);
    if (systemRole) params.set('systemRole', systemRole);
    if (status) params.set('status', status);
    setLoading(true);
    api
      .get<Paginated<AdminUser>>(`/admin/users?${params.toString()}`)
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
  }, [page, q, systemRole, status, reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);

  async function toggleLock() {
    if (!toggling) return;
    const action = toggling.status === UserStatus.LOCKED ? 'unlock' : 'lock';
    setToggleBusy(true);
    try {
      await api.post(`/admin/users/${toggling.id}/${action}`);
      reload();
    } catch (err) {
      setError(errorMessage(err, vi.admin.actionFailed));
    } finally {
      setToggleBusy(false);
      setToggling(null);
    }
  }

  function renderActions(row: AdminUser) {
    if (!actor) return null;
    // Ẩn nút chỉ là lớp giao diện; API vẫn trả 403 nếu không đủ quyền.
    if (!canManageUser(actor.systemRole, row.systemRole)) {
      return (
        <span
          title={vi.admin.users.ownerOnly}
          className="text-[13px] text-[var(--muted)]"
        >
          —
        </span>
      );
    }
    const self = row.id === actor.id;
    const locked = row.status === UserStatus.LOCKED;
    const lockLabel = locked ? vi.admin.users.unlock : vi.admin.users.lock;
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          title={vi.admin.users.edit}
          aria-label={vi.admin.users.edit}
          onClick={() => setEditing(row)}
          className={iconButtonClass}
        >
          <Pencil size={16} />
        </button>
        {!self && (
          <button
            type="button"
            title={vi.admin.users.resetPassword}
            aria-label={vi.admin.users.resetPassword}
            onClick={() => setResetting(row)}
            className={iconButtonClass}
          >
            <KeyRound size={16} />
          </button>
        )}
        {actor.systemRole === SystemRole.SYSTEM_OWNER && (
          <button
            type="button"
            title={vi.admin.users.changeRole}
            aria-label={vi.admin.users.changeRole}
            onClick={() => setChangingRole(row)}
            className={iconButtonClass}
          >
            <ShieldCheck size={16} />
          </button>
        )}
        {!self && (
          <button
            type="button"
            title={lockLabel}
            aria-label={lockLabel}
            onClick={() => setToggling(row)}
            className={iconButtonClass}
          >
            {locked ? <LockOpen size={16} /> : <Lock size={16} />}
          </button>
        )}
      </div>
    );
  }

  const columns: DataColumn<AdminUser>[] = [
    {
      header: vi.admin.users.column,
      render: (row) => (
        <>
          <span className="block truncate text-[14px] font-semibold text-[var(--heading)]">
            {row.fullName}
          </span>
          <span className="block truncate font-mono text-[12.5px] text-[var(--muted)]">
            {row.email}
          </span>
        </>
      ),
    },
    {
      header: vi.admin.users.systemRole,
      render: (row) => (
        <Badge tone={ROLE_TONE[row.systemRole]}>
          {vi.systemRoles[row.systemRole]}
        </Badge>
      ),
    },
    {
      header: vi.admin.users.status,
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={row.status === UserStatus.ACTIVE ? 'success' : 'danger'}>
            {vi.userStatus[row.status]}
          </Badge>
          {row.mustChangePassword && (
            <Badge tone="warning">{vi.admin.users.mustChangePassword}</Badge>
          )}
        </div>
      ),
    },
    {
      header: vi.admin.users.lastLogin,
      render: (row) => (
        <span className="text-[13px] text-[var(--body)]">
          {row.lastLoginAt
            ? formatDateTime(row.lastLoginAt)
            : vi.admin.users.neverLoggedIn}
        </span>
      ),
    },
    {
      header: vi.admin.users.createdAt,
      render: (row) => (
        <span className="text-[13px] text-[var(--body)]">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    { header: vi.admin.actions, render: renderActions },
  ];

  const togglingLocked = toggling?.status === UserStatus.LOCKED;

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="text-[13.5px] text-[var(--body)]">
          {vi.admin.users.subtitle}
        </p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={compactPrimaryButtonClass}
        >
          <Plus size={16} /> {vi.admin.users.create}
        </button>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
        <SearchInput
          value={query}
          placeholder={vi.admin.users.searchPlaceholder}
          onChange={setQuery}
        />
        <SelectFilter
          value={systemRole}
          allLabel={vi.admin.users.allRoles}
          options={Object.values(SystemRole).map((role) => ({
            value: role,
            label: vi.systemRoles[role],
          }))}
          onChange={setSystemRole}
        />
        <SelectFilter
          value={status}
          allLabel={vi.admin.users.allStatuses}
          options={Object.values(UserStatus).map((value) => ({
            value,
            label: vi.userStatus[value],
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
        emptyText={vi.admin.users.empty}
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

      <UserFormModal
        open={creating || editing !== null}
        user={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onCreated={(result) => {
          setCreating(false);
          setNotice({ title: vi.admin.users.created, result });
          reload();
        }}
        onUpdated={() => {
          setEditing(null);
          reload();
        }}
      />
      <ResetPasswordModal
        user={resetting}
        onClose={() => setResetting(null)}
        onDone={(result) => {
          setResetting(null);
          setNotice({ title: vi.admin.users.passwordReset, result });
          reload();
        }}
      />
      <SystemRoleModal
        user={changingRole}
        onClose={() => setChangingRole(null)}
        onDone={() => {
          setChangingRole(null);
          reload();
        }}
      />
      <ConfirmDialog
        open={toggling !== null}
        title={togglingLocked ? vi.admin.users.unlock : vi.admin.users.lock}
        message={
          toggling
            ? togglingLocked
              ? vi.admin.users.unlockConfirm(toggling.fullName)
              : vi.admin.users.lockConfirm(toggling.fullName)
            : ''
        }
        tone={togglingLocked ? 'default' : 'danger'}
        loading={toggleBusy}
        onConfirm={() => void toggleLock()}
        onCancel={() => setToggling(null)}
      />
      <TemporaryPasswordDialog
        open={notice !== null}
        title={notice?.title ?? ''}
        email={notice?.result.user.email ?? ''}
        password={notice?.result.temporaryPassword ?? null}
        onClose={() => setNotice(null)}
      />
    </div>
  );
}
