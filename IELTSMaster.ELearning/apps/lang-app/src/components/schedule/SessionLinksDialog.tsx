'use client';

import { useEffect, useState } from 'react';
import type {
  ClassCurriculum,
  ClassItemView,
  ClassSessionDetail,
} from '@lang/shared';
import {
  FormAlert,
  Modal,
  compactPrimaryButtonClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { getClassCurriculum } from '@/lib/classroom-api';
import { errorMessage } from '@/lib/error-message';
import { saveSessionLinks } from '@/lib/schedule-api';

/** Chọn chương/mục của giáo trình lớp học ở buổi này (R17, chỉ tham khảo). */
export function SessionLinksDialog({
  open,
  slug,
  session,
  onClose,
  onSaved,
}: {
  open: boolean;
  slug: string;
  session: ClassSessionDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const text = vi.schedule;
  const [curriculum, setCurriculum] = useState<ClassCurriculum | null>(null);
  const [groupIds, setGroupIds] = useState<Set<string>>(new Set());
  const [itemIds, setItemIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setGroupIds(new Set(session.links.flatMap((row) => row.groupId ?? [])));
    setItemIds(new Set(session.links.flatMap((row) => row.itemId ?? [])));
    setError(null);
    let cancelled = false;
    getClassCurriculum(slug, session.classroom.id).then(
      (result) => {
        if (!cancelled) setCurriculum(result);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, slug, session]);

  const toggle =
    (setter: typeof setGroupIds) =>
    (id: string): void =>
      setter((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
  const toggleGroup = toggle(setGroupIds);
  const toggleItem = toggle(setItemIds);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await saveSessionLinks(slug, session.classroom.id, session.id, {
        groupIds: [...groupIds],
        itemIds: [...itemIds],
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusy(false);
    }
  }

  const itemRow = (item: ClassItemView) => (
    <li key={item.id}>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[14px] hover:bg-[var(--hover)]">
        <input
          type="checkbox"
          checked={itemIds.has(item.id)}
          onChange={() => toggleItem(item.id)}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        <span className="min-w-0 flex-1 truncate">
          {item.title ?? item.content.title}
        </span>
      </label>
    </li>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={text.linksTitle}
      widthClass="max-w-xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className={secondaryButtonClass}
          >
            {vi.common.cancel}
          </button>
          <button
            type="button"
            disabled={busy || !curriculum}
            onClick={() => void save()}
            className={compactPrimaryButtonClass}
          >
            {busy ? vi.common.processing : vi.classes.form.save}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-[var(--muted)]">{text.linksHint}</p>
        {error && <FormAlert tone="error">{error}</FormAlert>}
        {!curriculum ? (
          <span className="text-[14px] text-[var(--muted)]">
            {vi.common.loading}
          </span>
        ) : (
          <div className="flex flex-col gap-3">
            {curriculum.ungrouped.length > 0 && (
              <section>
                <h3 className="mb-1 text-[13px] font-semibold text-[var(--muted)]">
                  {text.ungrouped}
                </h3>
                <ul>{curriculum.ungrouped.map(itemRow)}</ul>
              </section>
            )}
            {curriculum.groups.map((group) => (
              <section key={group.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-[var(--hover)]">
                  <input
                    type="checkbox"
                    checked={groupIds.has(group.id)}
                    onChange={() => toggleGroup(group.id)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  <span className="text-[14px] font-semibold text-[var(--heading)]">
                    {group.title}
                  </span>
                  <span className="text-[12px] text-[var(--muted)]">
                    ({text.wholeGroup})
                  </span>
                </label>
                <ul className="ml-5">{group.items.map(itemRow)}</ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
