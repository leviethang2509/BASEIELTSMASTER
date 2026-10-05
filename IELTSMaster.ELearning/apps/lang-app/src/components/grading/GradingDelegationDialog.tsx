'use client';

import { useEffect, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import {
  TenantRole,
  type GradingDelegation,
  type GradingDelegationBox,
  type GradingKind,
  type MembershipListItem,
} from '@lang/shared';
import {
  FormAlert,
  Modal,
  SearchInput,
  compactPrimaryButtonClass,
  iconButtonClass,
  labelTextClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { listActiveMembers } from '@/lib/classroom-api';
import { errorMessage } from '@/lib/error-message';
import { formatDateTime } from '@/lib/format';
import {
  createGradingDelegation,
  getGradingDelegations,
  removeGradingDelegation,
} from '@/lib/grading-api';
import { useDebouncedValue } from '@/lib/use-debounced-value';

const text = vi.grading.delegation;

/**
 * Chuyển giao chấm một bài làm (req-3 Step 10, R20.1): chọn phạm vi (chỉ bài
 * này / cả mục của lớp / mọi bài tự do của đề–bài học) rồi chọn giáo viên.
 * Người giao vẫn chấm được; người được giao không giao tiếp cho ai.
 */
export function GradingDelegationDialog({
  open,
  slug,
  kind,
  attemptId,
  onClose,
}: {
  open: boolean;
  slug: string;
  kind: GradingKind;
  attemptId: string;
  onClose: () => void;
}) {
  const [box, setBox] = useState<GradingDelegationBox | null>(null);
  const [scopeIndex, setScopeIndex] = useState(0);
  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query.trim());
  const [teachers, setTeachers] = useState<MembershipListItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBox(null);
    setSelected(new Set());
    setScopeIndex(0);
    setError(null);
    getGradingDelegations(slug, kind, attemptId).then(
      (result) => {
        if (!cancelled) setBox(result);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, slug, kind, attemptId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listActiveMembers(slug, TenantRole.TEACHER, q).then(
      (result) => {
        if (!cancelled) setTeachers(result.items);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [open, slug, q]);

  const target = box?.targets[scopeIndex] ?? null;
  const onScope = (row: GradingDelegation) =>
    target !== null &&
    row.scopeType === target.scopeType &&
    row.scopeId === target.scopeId;
  const already = new Set(
    (box?.delegations ?? [])
      .filter(onScope)
      .map((row) => row.delegate.membershipId),
  );

  async function submit() {
    if (!target || selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const rows = await createGradingDelegation(slug, {
        scopeType: target.scopeType,
        scopeId: target.scopeId,
        delegateMembershipIds: [...selected],
      });
      setBox((prev) =>
        prev
          ? {
              ...prev,
              delegations: [
                ...prev.delegations.filter((row) => !onScope(row)),
                ...rows,
              ],
            }
          : prev,
      );
      setSelected(new Set());
    } catch (err) {
      setError(errorMessage(err, vi.common.loadFailed));
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: GradingDelegation) {
    if (!window.confirm(text.confirmRemove(row.delegate.fullName))) return;
    setBusy(true);
    setError(null);
    try {
      await removeGradingDelegation(slug, row.id);
      setBox((prev) =>
        prev
          ? {
              ...prev,
              delegations: prev.delegations.filter((old) => old.id !== row.id),
            }
          : prev,
      );
    } catch (err) {
      setError(errorMessage(err, vi.common.loadFailed));
    } finally {
      setBusy(false);
    }
  }

  const current = (box?.delegations ?? []).filter(onScope);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={text.title}
      widthClass="max-w-xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className={secondaryButtonClass}
          >
            {vi.common.close}
          </button>
          <button
            type="button"
            disabled={busy || selected.size === 0 || target === null}
            onClick={submit}
            className={compactPrimaryButtonClass}
          >
            {busy ? text.adding : text.add}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-[var(--muted)]">{text.hint}</p>
        {error && <FormAlert tone="error">{error}</FormAlert>}
        {box === null ? (
          <p className="py-6 text-center text-[14px] text-[var(--muted)]">
            {vi.common.loading}
          </p>
        ) : box.targets.length === 0 ? (
          <FormAlert tone="info">{text.notAllowed}</FormAlert>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <span className={labelTextClass}>{text.scope}</span>
              {box.targets.map((row, index) => (
                <label
                  key={`${row.scopeType}:${row.scopeId}`}
                  className="flex items-center gap-2 text-[13.5px] text-[var(--body)]"
                >
                  <input
                    type="radio"
                    name="grading-delegation-scope"
                    checked={index === scopeIndex}
                    onChange={() => {
                      setScopeIndex(index);
                      setSelected(new Set());
                    }}
                  />
                  {row.title}
                </label>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className={labelTextClass}>{text.current}</span>
              {current.length === 0 ? (
                <p className="text-[13px] text-[var(--muted)]">{text.none}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {current.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3 py-1.5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-semibold text-[var(--heading)]">
                          {row.delegate.fullName}
                        </span>
                        <span className="block truncate text-[12.5px] text-[var(--muted)]">
                          {row.createdBy
                            ? text.by(
                                row.createdBy.fullName,
                                formatDateTime(row.createdAt),
                              )
                            : formatDateTime(row.createdAt)}
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => remove(row)}
                        title={text.remove}
                        aria-label={text.remove}
                        className={iconButtonClass}
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className={labelTextClass}>{text.teachers}</span>
              <SearchInput
                value={query}
                placeholder={text.pick}
                onChange={setQuery}
              />
              <ul className="flex max-h-[32vh] flex-col gap-1 overflow-auto">
                {teachers.length === 0 ? (
                  <li className="p-3 text-center text-[13.5px] text-[var(--muted)]">
                    {text.noTeachers}
                  </li>
                ) : (
                  teachers.map((row) => {
                    const done = already.has(row.id);
                    const checked = selected.has(row.id);
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          disabled={done}
                          onClick={() =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(row.id)) next.delete(row.id);
                              else next.add(row.id);
                              return next;
                            })
                          }
                          className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-1.5 text-left transition ${
                            checked
                              ? 'border-[var(--accent)] bg-[var(--sidebar)]'
                              : 'border-[var(--border)]'
                          } ${done ? 'opacity-50' : 'hover:border-[var(--accent)]'}`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[13.5px] font-semibold text-[var(--heading)]">
                              {row.fullName}
                            </span>
                            <span className="block truncate text-[12.5px] text-[var(--muted)]">
                              {row.email}
                            </span>
                          </span>
                          {(checked || done) && (
                            <Check size={16} className="text-[var(--accent)]" />
                          )}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
