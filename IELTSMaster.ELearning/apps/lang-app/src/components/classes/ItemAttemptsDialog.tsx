'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ClassItemAttemptRow } from '@lang/shared';
import { AttemptResultBadges } from '@/components/class-learning/class-learning-ui';
import { Badge, FormAlert, Modal, secondaryButtonClass } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { classStudentPath } from '@/lib/classroom-api';
import { formatDateTime } from '@/lib/format';
import { listItemAttempts, voidClassAttempt } from '@/lib/learner-class-api';

const text = vi.classAttempts;

/**
 * Lượt thi của học viên trên một mục đề thi của lớp và nút "Cho làm lại"
 * (R10.5): lượt cũ giữ lịch sử nhưng không tính điểm, học viên thi lại mục đó.
 */
export function ItemAttemptsDialog({
  open,
  slug,
  classroomId,
  itemId,
  itemTitle,
  canVoid,
  onClose,
}: {
  open: boolean;
  slug: string;
  classroomId: string;
  itemId: string;
  itemTitle: string;
  canVoid: boolean;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<ClassItemAttemptRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setRows(null);
    setError(null);
    setNotice(null);
    listItemAttempts(slug, classroomId, itemId).then(
      (result) => {
        if (!cancelled) setRows(result);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, slug, classroomId, itemId]);

  async function allowRetake(row: ClassItemAttemptRow) {
    if (!window.confirm(text.confirmVoid(row.student.fullName))) return;
    setBusy(row.id);
    setError(null);
    try {
      await voidClassAttempt(slug, classroomId, itemId, row.id);
      setRows(await listItemAttempts(slug, classroomId, itemId));
      setNotice(text.voided);
    } catch (err) {
      setError(errorMessage(err, vi.common.loadFailed));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal open={open} title={`${text.title} – ${itemTitle}`} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-[var(--muted)]">{text.hint}</p>
        {error && <FormAlert tone="error">{error}</FormAlert>}
        {notice && <FormAlert tone="success">{notice}</FormAlert>}
        {!rows ? (
          <p className="py-6 text-center text-[13.5px] text-[var(--muted)]">
            {vi.common.loading}
          </p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-[13.5px] text-[var(--body)]">
            {text.empty}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2"
              >
                <span className="min-w-0 flex-1 basis-44">
                  <Link
                    href={classStudentPath(
                      slug,
                      classroomId,
                      row.student.membershipId,
                    )}
                    title={vi.classStudentAttempts.open}
                    className="block truncate text-[14px] font-medium text-[var(--heading)] hover:text-[var(--accent)]"
                  >
                    {row.student.fullName}
                  </Link>
                  <span className="block text-[12.5px] text-[var(--muted)]">
                    {text.startedAt}: {formatDateTime(row.startedAt)}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {row.voidedAt ? (
                    <Badge tone="danger">{text.voidedBadge}</Badge>
                  ) : (
                    <AttemptResultBadges attempt={row} />
                  )}
                </span>
                {canVoid && !row.voidedAt && (
                  <button
                    type="button"
                    disabled={busy === row.id}
                    onClick={() => allowRetake(row)}
                    className={secondaryButtonClass}
                  >
                    {busy === row.id ? text.voiding : text.voidAction}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
