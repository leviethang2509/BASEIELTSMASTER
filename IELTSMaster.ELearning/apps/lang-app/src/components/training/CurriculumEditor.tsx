'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  CURRICULUM_GROUP_TITLE_MAX_LENGTH,
  CURRICULUM_ITEM_NOTE_MAX_LENGTH,
  CURRICULUM_ITEM_TITLE_MAX_LENGTH,
  CURRICULUM_LABELS_BY_TYPE,
  CURRICULUM_MAX_GROUPS,
  CURRICULUM_MAX_ITEMS,
  ExamStatus,
  defaultCurriculumLabel,
  type CurriculumDetail,
  type CurriculumItemLabel,
} from '@lang/shared';
import {
  Badge,
  FormAlert,
  compactPrimaryButtonClass,
  iconButtonClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { saveCurriculumItems } from '@/lib/training-api';
import { ContentPickerDialog } from './ContentPickerDialog';
import {
  UNGROUPED,
  addItems,
  contentKeys,
  draftFromDetail,
  draftSnapshot,
  itemCount,
  moveGroup,
  moveItem,
  newKey,
  removeGroup,
  removeItem,
  toSaveInput,
  updateItem,
  type CurriculumDraft,
  type ItemDraft,
} from './curriculum-draft';
import { ItemTypeIcon } from './training-ui';

const compactInput =
  'w-full rounded-lg border border-[var(--border-strong)] bg-[var(--sidebar)] px-2.5 py-1.5 text-[13.5px] text-[var(--heading)] outline-none transition focus:border-[var(--accent)] focus:bg-[var(--bg)]';

type DragState =
  { kind: 'item'; key: string } | { kind: 'group'; index: number } | null;

/** Vị trí thả mục: trước mục `index` của chương, hoặc cuối chương. */
type DropTarget = { groupKey: string; index?: number } | null;

/**
 * Sửa chương + mục của giáo trình, lưu cả danh sách một lần bằng
 * `PUT :id/items` với `baseRevision`. Kéo thả bằng tay cầm (HTML5, như
 * `ModulesEditor`), kèm nút lên/xuống và ô chọn chương cho bàn phím/mobile.
 */
export function CurriculumEditor({
  slug,
  curriculum,
  onSaved,
  onDirtyChange,
}: {
  slug: string;
  curriculum: CurriculumDetail;
  onSaved: (curriculum: CurriculumDetail) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const text = vi.curricula;
  const readOnly = !curriculum.canEdit;
  const [draft, setDraft] = useState<CurriculumDraft>(() =>
    draftFromDetail(curriculum),
  );
  const [saved, setSaved] = useState(() =>
    draftSnapshot(draftFromDetail(curriculum)),
  );
  const [revision, setRevision] = useState(curriculum.revision);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [picking, setPicking] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const [over, setOver] = useState<DropTarget>(null);
  const [overGroup, setOverGroup] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const dirty = draftSnapshot(draft) !== saved;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  // Thả chuột ngoài tay cầm mà không kéo: tắt `draggable` để còn bôi chọn chữ.
  useEffect(() => {
    if (armed === null) return;
    const disarm = () => setArmed(null);
    window.addEventListener('pointerup', disarm);
    return () => window.removeEventListener('pointerup', disarm);
  }, [armed]);

  const existing = useMemo(() => contentKeys(draft), [draft]);
  const total = itemCount(draft);
  const groupOptions = [
    { key: UNGROUPED, title: text.ungrouped },
    ...draft.groups.map((group, index) => ({
      key: group.key,
      title: group.title.trim() || text.newGroupTitle(index + 1),
    })),
  ];

  const change = (next: CurriculumDraft) => {
    setDraft(next);
    setNotice(null);
  };

  const endDrag = () => {
    setArmed(null);
    setDrag(null);
    setOver(null);
    setOverGroup(null);
  };

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await saveCurriculumItems(
        slug,
        curriculum.id,
        toSaveInput(draft, revision),
      );
      const next = draftFromDetail(result);
      setDraft(next);
      setSaved(draftSnapshot(next));
      setRevision(result.revision);
      setNotice(text.saved);
      onSaved(result);
    } catch (err) {
      setError(errorMessage(err, vi.examEditor.saveFailed));
    } finally {
      setBusy(false);
    }
  }

  function renderItem(
    item: ItemDraft,
    groupKey: string,
    index: number,
    count: number,
  ) {
    const open = expanded.has(item.key);
    const isOver =
      drag?.kind === 'item' &&
      drag.key !== item.key &&
      over?.groupKey === groupKey &&
      over.index === index;
    const labels = CURRICULUM_LABELS_BY_TYPE[item.itemType];
    const displayTitle = item.title.trim() || item.contentTitle;
    return (
      <li
        key={item.key}
        draggable={!readOnly && armed === item.key}
        onDragStart={(event) => {
          setDrag({ kind: 'item', key: item.key });
          event.dataTransfer.effectAllowed = 'move';
          // Firefox chỉ bắt đầu kéo khi có dữ liệu.
          event.dataTransfer.setData('text/plain', item.contentId);
        }}
        onDragOver={(event) => {
          if (drag?.kind !== 'item') return;
          event.preventDefault();
          event.stopPropagation();
          setOver({ groupKey, index });
        }}
        onDrop={(event) => {
          if (drag?.kind !== 'item') return;
          event.preventDefault();
          event.stopPropagation();
          if (drag.key !== item.key) {
            change(moveItem(draft, drag.key, groupKey, index));
          }
          endDrag();
        }}
        onDragEnd={endDrag}
        className={`rounded-xl border bg-[var(--card)] px-2.5 py-2 transition ${
          isOver ? 'border-[var(--accent)]' : 'border-[var(--border)]'
        } ${drag?.kind === 'item' && drag.key === item.key ? 'opacity-50' : ''}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <span
              title={text.dragHint}
              aria-hidden
              onPointerDown={() => setArmed(item.key)}
              className="cursor-grab text-[var(--muted)] active:cursor-grabbing"
            >
              <GripVertical size={17} />
            </span>
          )}
          <span className="w-5 shrink-0 text-center text-[12.5px] font-semibold text-[var(--muted)]">
            {index + 1}
          </span>
          <ItemTypeIcon type={item.itemType} />
          <span className="min-w-0 flex-1 basis-40">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-[14px] font-medium text-[var(--heading)]">
                {displayTitle}
              </span>
              {item.contentStatus === ExamStatus.ARCHIVED && (
                <Badge tone="warning" title={text.archivedHint}>
                  {text.archivedWarning}
                </Badge>
              )}
            </span>
            {item.title.trim() && (
              <span className="block truncate text-[12px] text-[var(--muted)]">
                {text.originalTitle(item.contentTitle)}
              </span>
            )}
            {readOnly && item.note && (
              <span className="block whitespace-pre-line text-[12.5px] text-[var(--body)]">
                {item.note}
              </span>
            )}
          </span>
          {readOnly ? (
            <Badge tone="accent">{text.label[item.label]}</Badge>
          ) : (
            <>
              <select
                aria-label={text.labelField}
                title={text.labelField}
                value={item.label}
                onChange={(event) =>
                  change(
                    updateItem(draft, item.key, {
                      label: event.target.value as CurriculumItemLabel,
                    }),
                  )
                }
                className={`${compactInput} w-auto`}
              >
                {labels.map((label) => (
                  <option key={label} value={label}>
                    {text.label[label]}
                  </option>
                ))}
              </select>
              <select
                aria-label={text.moveToGroup}
                title={text.moveToGroup}
                value={groupKey}
                onChange={(event) =>
                  change(moveItem(draft, item.key, event.target.value))
                }
                className={`${compactInput} w-auto max-w-[160px]`}
              >
                {groupOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.title}
                  </option>
                ))}
              </select>
              <span className="flex items-center">
                <button
                  type="button"
                  title={text.moveUp}
                  aria-label={text.moveUp}
                  disabled={index === 0}
                  onClick={() =>
                    change(moveItem(draft, item.key, groupKey, index - 1))
                  }
                  className={iconButtonClass}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  title={text.moveDown}
                  aria-label={text.moveDown}
                  disabled={index === count - 1}
                  onClick={() =>
                    change(moveItem(draft, item.key, groupKey, index + 2))
                  }
                  className={iconButtonClass}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  title={text.itemDetails}
                  aria-label={text.itemDetails}
                  aria-expanded={open}
                  onClick={() =>
                    setExpanded((keys) => {
                      const next = new Set(keys);
                      if (next.has(item.key)) next.delete(item.key);
                      else next.add(item.key);
                      return next;
                    })
                  }
                  className={iconButtonClass}
                >
                  {open ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
                <button
                  type="button"
                  title={text.removeItem}
                  aria-label={text.removeItem}
                  onClick={() => change(removeItem(draft, item.key))}
                  className={iconButtonClass}
                >
                  <X size={16} />
                </button>
              </span>
            </>
          )}
        </div>
        {open && !readOnly && (
          <div className="mt-2 grid gap-2 pl-7 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold text-[var(--body)]">
                {text.itemTitle}
              </span>
              <input
                value={item.title}
                maxLength={CURRICULUM_ITEM_TITLE_MAX_LENGTH}
                placeholder={item.contentTitle}
                onChange={(event) =>
                  change(
                    updateItem(draft, item.key, { title: event.target.value }),
                  )
                }
                className={compactInput}
              />
              <span className="text-[11.5px] text-[var(--muted)]">
                {text.itemTitleHint}
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold text-[var(--body)]">
                {text.itemNote}
              </span>
              <textarea
                value={item.note}
                rows={2}
                maxLength={CURRICULUM_ITEM_NOTE_MAX_LENGTH}
                onChange={(event) =>
                  change(
                    updateItem(draft, item.key, { note: event.target.value }),
                  )
                }
                className={compactInput}
              />
            </label>
          </div>
        )}
      </li>
    );
  }

  /** Danh sách mục của 1 chương; thả vào vùng trống = cuối chương. */
  function renderItems(groupKey: string, items: ItemDraft[]) {
    const isOverEnd =
      drag?.kind === 'item' &&
      over?.groupKey === groupKey &&
      over.index === undefined;
    return (
      <ol
        onDragOver={(event) => {
          if (drag?.kind !== 'item') return;
          event.preventDefault();
          setOver({ groupKey });
        }}
        onDrop={(event) => {
          if (drag?.kind !== 'item') return;
          event.preventDefault();
          change(moveItem(draft, drag.key, groupKey));
          endDrag();
        }}
        className={`flex min-h-[44px] flex-col gap-1.5 rounded-xl p-1 transition ${
          isOverEnd ? 'bg-[var(--accent-soft)]' : ''
        }`}
      >
        {items.map((item, index) =>
          renderItem(item, groupKey, index, items.length),
        )}
        {items.length === 0 && (
          <li className="rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-3 text-center text-[13px] text-[var(--muted)]">
            {readOnly ? text.ungroupedHint : text.emptyGroup}
          </li>
        )}
      </ol>
    );
  }

  const addButton = (groupKey: string) =>
    readOnly ? null : (
      <button
        type="button"
        disabled={total >= CURRICULUM_MAX_ITEMS}
        onClick={() => setPicking(groupKey)}
        className={`${secondaryButtonClass} px-3 py-1.5 text-[13px]`}
      >
        <Plus size={15} /> {text.addItem}
      </button>
    );

  return (
    <div className="flex flex-col gap-3">
      {!readOnly && (
        <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-sm">
          <span className="text-[13px] text-[var(--muted)]">
            {text.summary(draft.groups.length, total)}
          </span>
          {dirty && (
            <span className="text-[13px] font-medium text-[var(--warn-text)]">
              {text.unsaved}
            </span>
          )}
          <span className="ml-auto flex gap-2">
            <button
              type="button"
              disabled={draft.groups.length >= CURRICULUM_MAX_GROUPS}
              onClick={() =>
                change({
                  ...draft,
                  groups: [
                    ...draft.groups,
                    {
                      key: newKey(),
                      title: text.newGroupTitle(draft.groups.length + 1),
                      items: [],
                    },
                  ],
                })
              }
              className={secondaryButtonClass}
            >
              <Plus size={16} /> {text.addGroup}
            </button>
            <button
              type="button"
              disabled={!dirty || busy}
              onClick={() => void save()}
              className={compactPrimaryButtonClass}
            >
              <Save size={16} /> {busy ? vi.examEditor.saving : text.save}
            </button>
          </span>
        </div>
      )}
      {notice && <FormAlert tone="success">{notice}</FormAlert>}
      {error && <FormAlert tone="error">{error}</FormAlert>}

      {(!readOnly || draft.ungrouped.length > 0) && (
        <section className="rounded-2xl border border-dashed border-[var(--border-strong)] p-3">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 px-1">
            <span>
              <span className="block text-[14px] font-semibold text-[var(--heading)]">
                {text.ungrouped}
              </span>
              <span className="block text-[12.5px] text-[var(--muted)]">
                {text.ungroupedHint}
              </span>
            </span>
            {addButton(UNGROUPED)}
          </div>
          {renderItems(UNGROUPED, draft.ungrouped)}
        </section>
      )}

      {draft.groups.map((group, index) => (
        <section
          key={group.key}
          draggable={!readOnly && armed === `group:${group.key}`}
          onDragStart={(event) => {
            if (armed !== `group:${group.key}`) return;
            setDrag({ kind: 'group', index });
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', group.title);
          }}
          onDragOver={(event) => {
            if (drag?.kind !== 'group') return;
            event.preventDefault();
            setOverGroup(index);
          }}
          onDrop={(event) => {
            if (drag?.kind !== 'group') return;
            event.preventDefault();
            change(moveGroup(draft, drag.index, index));
            endDrag();
          }}
          onDragEnd={endDrag}
          className={`rounded-2xl border bg-[var(--bg)] p-3 transition ${
            drag?.kind === 'group' && overGroup === index
              ? 'border-[var(--accent)]'
              : 'border-[var(--border)]'
          } ${drag?.kind === 'group' && drag.index === index ? 'opacity-50' : ''}`}
        >
          <div className="mb-1 flex flex-wrap items-center gap-2 px-1">
            {!readOnly && (
              <span
                title={text.dragHint}
                aria-hidden
                onPointerDown={() => setArmed(`group:${group.key}`)}
                className="cursor-grab text-[var(--muted)] active:cursor-grabbing"
              >
                <GripVertical size={18} />
              </span>
            )}
            {readOnly ? (
              <h3 className="min-w-0 flex-1 text-[15px] font-semibold text-[var(--heading)]">
                {group.title}
              </h3>
            ) : (
              <input
                aria-label={text.groupTitle}
                value={group.title}
                required
                maxLength={CURRICULUM_GROUP_TITLE_MAX_LENGTH}
                onChange={(event) =>
                  change({
                    ...draft,
                    groups: draft.groups.map((row) =>
                      row.key === group.key
                        ? { ...row, title: event.target.value }
                        : row,
                    ),
                  })
                }
                className={`${compactInput} min-w-0 flex-1 basis-48 text-[14.5px] font-semibold`}
              />
            )}
            {!readOnly && (
              <span className="flex items-center">
                {addButton(group.key)}
                <button
                  type="button"
                  title={text.moveUp}
                  aria-label={text.moveUp}
                  disabled={index === 0}
                  onClick={() => change(moveGroup(draft, index, index - 1))}
                  className={iconButtonClass}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  title={text.moveDown}
                  aria-label={text.moveDown}
                  disabled={index === draft.groups.length - 1}
                  onClick={() => change(moveGroup(draft, index, index + 1))}
                  className={iconButtonClass}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  title={`${text.removeGroup}. ${text.removeGroupHint}`}
                  aria-label={text.removeGroup}
                  onClick={() => change(removeGroup(draft, group.key))}
                  className={iconButtonClass}
                >
                  <Trash2 size={15} />
                </button>
              </span>
            )}
          </div>
          {renderItems(group.key, group.items)}
        </section>
      ))}

      <ContentPickerDialog
        open={picking !== null}
        slug={slug}
        existing={existing}
        onAdd={(content) => {
          if (picking === null) return;
          // Chương có thể vừa bị xoá khi hộp chọn đang mở.
          const target =
            picking === UNGROUPED ||
            draft.groups.some((group) => group.key === picking)
              ? picking
              : UNGROUPED;
          setDraft((current) =>
            addItems(current, target, [
              {
                key: newKey(),
                itemType: content.itemType,
                contentId: content.id,
                contentTitle: content.title,
                contentStatus: content.status,
                title: '',
                label: defaultCurriculumLabel(content.itemType),
                note: '',
              },
            ]),
          );
        }}
        onClose={() => setPicking(null)}
      />
    </div>
  );
}
