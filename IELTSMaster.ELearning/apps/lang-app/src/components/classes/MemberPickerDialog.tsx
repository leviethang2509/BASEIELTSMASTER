'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import type {
  MemberScheduleConflicts,
  MembershipListItem,
  TenantRole,
} from '@lang/shared';
import {
  FormAlert,
  Modal,
  SearchInput,
  compactPrimaryButtonClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { listActiveMembers } from '@/lib/classroom-api';
import { errorMessage } from '@/lib/error-message';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { formatSessionStart } from '@/components/schedule/schedule-format';

/**
 * Chọn nhiều thành viên đang hoạt động có đúng vai trò để thêm vào lớp
 * (D6–D7). Người đã trong lớp hiện "Đã trong lớp".
 */
export function MemberPickerDialog({
  open,
  slug,
  role,
  title,
  inClass,
  busy,
  error,
  footerNote,
  checkConflicts,
  onAdd,
  onClose,
}: {
  open: boolean;
  slug: string;
  role: TenantRole;
  title: string;
  /** Membership đang trong lớp. */
  inClass: Set<string>;
  busy: boolean;
  error: string | null;
  footerNote?: string;
  /** Kiểm trùng lịch của người đang chọn (R15: cảnh báo, không chặn). */
  checkConflicts?: (
    membershipIds: string[],
  ) => Promise<MemberScheduleConflicts[]>;
  onAdd: (membershipIds: string[]) => void;
  onClose: () => void;
}) {
  const text = vi.classes.members;
  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query.trim());
  const [rows, setRows] = useState<MembershipListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [conflicts, setConflicts] = useState<MemberScheduleConflicts[]>([]);
  const selectedKey = useDebouncedValue([...selected].sort().join(','));
  const checkRef = useRef(checkConflicts);
  checkRef.current = checkConflicts;

  useEffect(() => {
    const check = checkRef.current;
    if (!open || !check || !selectedKey) {
      setConflicts([]);
      return;
    }
    let cancelled = false;
    check(selectedKey.split(',')).then(
      (result) => {
        if (!cancelled) setConflicts(result);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [open, selectedKey]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelected(new Set());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    listActiveMembers(slug, role, q)
      .then(
        (result) => {
          if (cancelled) return;
          setRows(result.items);
          setLoadError(null);
        },
        (err: unknown) => {
          if (!cancelled) setLoadError(errorMessage(err, vi.common.loadFailed));
        },
      )
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, slug, role, q]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      widthClass="max-w-xl"
      footer={
        <>
          {footerNote && (
            <span className="mr-auto text-[13px] text-[var(--muted)]">
              {footerNote}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className={secondaryButtonClass}
          >
            {vi.common.cancel}
          </button>
          <button
            type="button"
            disabled={selected.size === 0 || busy}
            onClick={() => onAdd([...selected])}
            className={compactPrimaryButtonClass}
          >
            {busy ? vi.common.processing : text.addSelected(selected.size)}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-[var(--muted)]">{text.pickerHint}</p>
        <SearchInput
          value={query}
          placeholder={text.pickerSearch}
          onChange={setQuery}
        />
        {(error ?? loadError) && (
          <FormAlert tone="error">{error ?? loadError}</FormAlert>
        )}
        {conflicts.length > 0 && (
          <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-[13px] text-[var(--danger)]">
            <p className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle size={15} /> {text.conflictsTitle}
            </p>
            <ul className="mt-1 list-disc pl-5">
              {conflicts.map((row) => (
                <li key={row.membershipId}>
                  {text.conflictLine(row.fullName, row.sessions.length)}:{' '}
                  {row.sessions
                    .slice(0, 3)
                    .map(
                      (session) =>
                        `${vi.schedule.sessionLabel(session.seq)} ${formatSessionStart(session.startsAt)} ↔ ${session.conflicts
                          .map((other) => other.classroom.code)
                          .join(', ')}`,
                    )
                    .join('; ')}
                  {row.sessions.length > 3 && '…'}
                </li>
              ))}
            </ul>
          </div>
        )}
        <ul className="flex max-h-[50vh] flex-col gap-1.5 overflow-auto">
          {loading && rows.length === 0 ? (
            <li className="p-4 text-center text-[14px] text-[var(--muted)]">
              {vi.common.loading}
            </li>
          ) : rows.length === 0 ? (
            <li className="p-4 text-center text-[14px] text-[var(--muted)]">
              {text.pickerEmpty}
            </li>
          ) : (
            rows.map((row) => {
              const already = inClass.has(row.id);
              return (
                <li key={row.id}>
                  <label
                    className={`flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2 ${
                      already
                        ? 'opacity-60'
                        : 'cursor-pointer hover:bg-[var(--hover)]'
                    }`}
                  >
                    {already ? (
                      <Check size={16} className="text-[var(--muted)]" />
                    ) : (
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggle(row.id)}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-[var(--heading)]">
                        {row.fullName}
                      </span>
                      <span className="block truncate text-[12.5px] text-[var(--muted)]">
                        {row.email}
                      </span>
                    </span>
                    {already && (
                      <span className="text-[12.5px] text-[var(--muted)]">
                        {text.inClass}
                      </span>
                    )}
                  </label>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </Modal>
  );
}
