'use client';

import { Fragment, useEffect, useState } from 'react';
import { Link2Off } from 'lucide-react';
import {
  MembershipStatus,
  TenantRole,
  type GuardianLink,
  type MembershipDetail,
  type MembershipListItem,
  type Paginated,
} from '@lang/shared';
import {
  Badge,
  FormAlert,
  Modal,
  SearchInput,
  compactPrimaryButtonClass,
  iconButtonClass,
  inputClass,
  labelClass,
  labelTextClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { formatDate, formatDateTime } from '@/lib/format';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { isMinor, membershipsPath } from './member-utils';
import { RoleCheckboxes } from './RoleCheckboxes';

const text = vi.members;

const sameRoles = (a: readonly TenantRole[], b: readonly TenantRole[]) =>
  a.length === b.length && a.every((role) => b.includes(role));

const withoutOwner = (roles: readonly TenantRole[]) =>
  roles.filter((role) => role !== TenantRole.TENANT_OWNER);

const headingClass =
  'text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]';

interface MemberDetailModalProps {
  slug: string;
  member: MembershipListItem | null;
  onClose: () => void;
  /** Sau khi đổi vai trò hoặc liên kết phụ huynh. */
  onChanged: (member: MembershipListItem) => void;
}

// Chi tiết thành viên: sửa vai trò, gắn/gỡ phụ huynh. Owner chỉ mở được khi
// người thao tác cũng là Owner (trang danh sách đã ẩn nút, API vẫn kiểm).
export function MemberDetailModal({
  slug,
  member,
  onClose,
  onChanged,
}: MemberDetailModalProps) {
  const [detail, setDetail] = useState<MembershipDetail | null>(null);
  const [roles, setRoles] = useState<TenantRole[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const memberId = member?.id;
  const base = membershipsPath(slug);

  useEffect(() => {
    setDetail(null);
    setError(null);
    setSaved(false);
  }, [memberId]);

  useEffect(() => {
    if (!memberId) return;
    let cancelled = false;
    api.get<MembershipDetail>(`${base}/${memberId}`).then(
      (data) => {
        if (cancelled) return;
        setDetail(data);
        setRoles(withoutOwner(data.roles));
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [base, memberId, reloadKey]);

  if (!member) return null;
  const current = detail ?? { ...member, guardians: [], wards: [] };
  const isOwner = current.roles.includes(TenantRole.TENANT_OWNER);
  const rolesChanged = !sameRoles(roles, withoutOwner(current.roles));

  const refresh = (updated?: MembershipListItem) => {
    setReloadKey((key) => key + 1);
    onChanged(updated ?? current);
  };

  async function saveRoles() {
    if (!isOwner && roles.length === 0) {
      setError(text.rolesRequired);
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.patch<MembershipListItem>(
        `${base}/${member?.id}`,
        {
          roles,
        },
      );
      setSaved(true);
      refresh(updated);
    } catch (err) {
      setError(errorMessage(err, vi.admin.actionFailed));
    } finally {
      setSaving(false);
    }
  }

  async function unlink(studentId: string, parentId: string) {
    setError(null);
    try {
      await api.delete(`${base}/${studentId}/guardians/${parentId}`);
      refresh();
    } catch (err) {
      setError(errorMessage(err, vi.admin.actionFailed));
    }
  }

  const info: [string, React.ReactNode][] = [
    [vi.auth.email, <span className="font-mono">{current.email}</span>],
    [
      vi.auth.dateOfBirth,
      <span className="inline-flex flex-wrap items-center gap-2">
        {formatDate(current.dateOfBirth)}
        {isMinor(current.dateOfBirth) && (
          <Badge tone="warning">{text.minor}</Badge>
        )}
      </span>,
    ],
    [
      text.status,
      <Badge
        tone={current.status === MembershipStatus.ACTIVE ? 'success' : 'danger'}
      >
        {vi.membershipStatus[current.status]}
      </Badge>,
    ],
    [text.joinedAt, formatDateTime(current.joinedAt)],
    [
      text.lastActive,
      current.lastActiveAt
        ? formatDateTime(current.lastActiveAt)
        : text.neverActive,
    ],
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title={current.fullName}
      widthClass="max-w-2xl"
      footer={
        <button
          type="button"
          onClick={onClose}
          className={secondaryButtonClass}
        >
          {vi.common.close}
        </button>
      }
    >
      <div className="flex flex-col gap-6">
        <dl className="grid gap-x-4 gap-y-2.5 sm:grid-cols-[150px_minmax(0,1fr)]">
          {info.map(([label, value]) => (
            <Fragment key={label}>
              <dt className="text-[13px] font-semibold text-[var(--muted)]">
                {label}
              </dt>
              <dd className="break-words text-[14px] text-[var(--heading)]">
                {value}
              </dd>
            </Fragment>
          ))}
        </dl>

        <section className="flex flex-col gap-3">
          <h3 className={headingClass}>{text.roles}</h3>
          {isOwner && (
            <p className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--body)]">
              <Badge tone="accent">{vi.tenantRoles.TENANT_OWNER}</Badge>
              {text.ownerRoleFixed}
            </p>
          )}
          <RoleCheckboxes
            value={roles}
            onChange={(next) => {
              setRoles(next);
              setSaved(false);
            }}
            disabled={!detail || saving}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!detail || saving || !rolesChanged}
              onClick={() => void saveRoles()}
              className={compactPrimaryButtonClass}
            >
              {saving ? vi.common.processing : text.saveRoles}
            </button>
            {saved && (
              <span role="status" className="text-[13px] text-[var(--ok-text)]">
                {text.rolesSaved}
              </span>
            )}
          </div>
        </section>

        {detail && current.roles.includes(TenantRole.STUDENT) && (
          <section className="flex flex-col gap-3">
            <h3 className={headingClass}>{text.guardians}</h3>
            <LinkList
              links={detail.guardians}
              emptyText={text.noGuardians}
              onUnlink={(link) =>
                void unlink(current.id, link.member.membershipId)
              }
            />
            <AddGuardianForm
              slug={slug}
              studentId={current.id}
              linkedIds={detail.guardians.map(
                (link) => link.member.membershipId,
              )}
              onLinked={() => refresh()}
            />
          </section>
        )}

        {detail && current.roles.includes(TenantRole.PARENT) && (
          <section className="flex flex-col gap-3">
            <h3 className={headingClass}>{text.wards}</h3>
            <LinkList
              links={detail.wards}
              emptyText={text.noWards}
              onUnlink={(link) =>
                void unlink(link.member.membershipId, current.id)
              }
            />
          </section>
        )}

        {error && <FormAlert tone="error">{error}</FormAlert>}
      </div>
    </Modal>
  );
}

function LinkList({
  links,
  emptyText,
  onUnlink,
}: {
  links: GuardianLink[];
  emptyText: string;
  onUnlink: (link: GuardianLink) => void;
}) {
  if (links.length === 0) {
    return <p className="text-[13.5px] text-[var(--muted)]">{emptyText}</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
      {links.map((link) => (
        <li key={link.id} className="flex items-center gap-3 px-3.5 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold text-[var(--heading)]">
              {link.member.fullName}
              {link.relationship && (
                <span className="font-normal text-[var(--muted)]">
                  {' '}
                  · {link.relationship}
                </span>
              )}
            </span>
            <span className="block truncate font-mono text-[12.5px] text-[var(--muted)]">
              {link.member.email}
            </span>
          </span>
          <button
            type="button"
            title={text.unlink}
            aria-label={text.unlink}
            onClick={() => onUnlink(link)}
            className={iconButtonClass}
          >
            <Link2Off size={16} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function AddGuardianForm({
  slug,
  studentId,
  linkedIds,
  onLinked,
}: {
  slug: string;
  studentId: string;
  linkedIds: string[];
  onLinked: () => void;
}) {
  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query.trim());
  const [parents, setParents] = useState<MembershipListItem[]>([]);
  const [parentId, setParentId] = useState('');
  const [relationship, setRelationship] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      role: TenantRole.PARENT,
      status: MembershipStatus.ACTIVE,
      pageSize: '20',
    });
    if (q) params.set('q', q);
    api
      .get<Paginated<MembershipListItem>>(
        `${membershipsPath(slug)}?${params.toString()}`,
      )
      .then(
        (result) => {
          if (!cancelled) setParents(result.items);
        },
        () => {
          if (!cancelled) setParents([]);
        },
      );
    return () => {
      cancelled = true;
    };
  }, [slug, q]);

  const options = parents.filter(
    (parent) => parent.id !== studentId && !linkedIds.includes(parent.id),
  );
  const selectedAvailable = options.some((parent) => parent.id === parentId);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAvailable) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`${membershipsPath(slug)}/${studentId}/guardians`, {
        parentMembershipId: parentId,
        relationship,
      });
      setParentId('');
      setRelationship('');
      onLinked();
    } catch (err) {
      setError(errorMessage(err, vi.admin.actionFailed));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl bg-[var(--sidebar)] p-3.5"
    >
      <SearchInput
        value={query}
        placeholder={text.parentSearch}
        onChange={setQuery}
      />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
        <label className={labelClass}>
          <span className={labelTextClass}>{text.chooseParent}</span>
          <select
            value={selectedAvailable ? parentId : ''}
            onChange={(event) => setParentId(event.target.value)}
            className={inputClass}
          >
            <option value="">
              {options.length === 0 ? text.noParents : text.chooseParent}
            </option>
            {options.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.fullName} · {parent.email}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>
            {text.relationship}{' '}
            <span className="font-normal text-[var(--muted)]">
              {vi.common.optional}
            </span>
          </span>
          <input
            maxLength={50}
            value={relationship}
            onChange={(event) => setRelationship(event.target.value)}
            placeholder={text.relationshipPlaceholder}
            className={inputClass}
          />
        </label>
      </div>
      {error && <FormAlert tone="error">{error}</FormAlert>}
      <div>
        <button
          type="submit"
          disabled={busy || !selectedAvailable}
          className={compactPrimaryButtonClass}
        >
          {busy ? vi.common.processing : text.link}
        </button>
      </div>
    </form>
  );
}
