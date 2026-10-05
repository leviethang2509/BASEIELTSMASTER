'use client';

import { useEffect, useState } from 'react';
import {
  MembershipStatus,
  type DeactivationSuggestions,
  type MembershipListItem,
} from '@lang/shared';
import {
  Badge,
  ConfirmDialog,
  FormAlert,
  Modal,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { formatDateTime } from '@/lib/format';
import { ROLE_TONE, membershipsPath } from './member-utils';

const text = vi.members;

// Gợi ý Học viên/Phụ huynh lâu không vào để Owner/Admin tự ngừng kích hoạt.
export function DeactivationSuggestionsModal({
  open,
  slug,
  onClose,
  onChanged,
}: {
  open: boolean;
  slug: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<DeactivationSuggestions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pending, setPending] = useState<MembershipListItem | null>(null);
  const [busy, setBusy] = useState(false);
  const base = membershipsPath(slug);

  useEffect(() => {
    if (!open) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    api.get<DeactivationSuggestions>(`${base}/deactivation-suggestions`).then(
      (result) => {
        if (!cancelled) setData(result);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, base, reloadKey]);

  async function deactivate() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      await api.patch(`${base}/${pending.id}`, {
        status: MembershipStatus.INACTIVE,
      });
      setReloadKey((key) => key + 1);
      onChanged();
    } catch (err) {
      setError(errorMessage(err, vi.admin.actionFailed));
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={text.suggestionsTitle}
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
        {!data ? (
          !error && (
            <p className="py-6 text-center text-[14px] text-[var(--muted)]">
              {vi.common.loading}
            </p>
          )
        ) : data.excess === 0 ? (
          <FormAlert tone="success">{text.withinLimit}</FormAlert>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-[14px] leading-relaxed text-[var(--body)]">
              {text.suggestionsHint(data.excess)}
            </p>
            {data.items.length === 0 ? (
              <p className="text-[14px] text-[var(--muted)]">
                {text.noSuggestions}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
                {data.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-2 px-3.5 py-3 sm:flex-row sm:items-center sm:gap-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-[var(--heading)]">
                        {item.fullName}
                      </span>
                      <span className="block truncate font-mono text-[12.5px] text-[var(--muted)]">
                        {item.email}
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {item.roles.map((role) => (
                        <Badge key={role} tone={ROLE_TONE[role]}>
                          {vi.tenantRoles[role]}
                        </Badge>
                      ))}
                    </span>
                    <span className="text-[13px] text-[var(--body)] sm:w-[140px]">
                      {item.lastActiveAt
                        ? formatDateTime(item.lastActiveAt)
                        : text.neverActive}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPending(item)}
                      className={secondaryButtonClass}
                    >
                      {text.deactivate}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {error && (
          <div className="mt-4">
            <FormAlert tone="error">{error}</FormAlert>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={pending !== null}
        title={text.deactivate}
        message={pending ? text.deactivateConfirm(pending.fullName) : ''}
        tone="danger"
        loading={busy}
        onConfirm={() => void deactivate()}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
