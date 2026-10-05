'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  GripVertical,
  Plus,
  Repeat,
  RotateCcw,
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
  CurriculumItemType,
  DEFAULT_PASS_THRESHOLD,
  ExamStatus,
  trainingLocalToIso,
  type ClassCurriculum,
  type CurriculumItemLabel,
} from '@lang/shared';
import { ContentPickerDialog } from '@/components/training/ContentPickerDialog';
import {
  UNGROUPED,
  addItems,
  allItems,
  contentKey,
  groupKeyOf,
  itemCount,
  moveGroup,
  moveItem,
  newKey,
  removeGroup,
  removeItem,
  updateItem,
} from '@/components/training/curriculum-draft';
import { ItemTypeIcon } from '@/components/training/training-ui';
import {
  Badge,
  ConfirmDialog,
  FormAlert,
  compactPrimaryButtonClass,
  iconButtonClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { saveClassCurriculum } from '@/lib/classroom-api';
import { errorMessage } from '@/lib/error-message';
import { formatDateTime } from '@/lib/format';
import { ImportCurriculumDialog } from './ImportCurriculumDialog';
import { ItemAttemptsDialog } from './ItemAttemptsDialog';
import {
  classContentKeys,
  classDraftFrom,
  classDraftSnapshot,
  importCurriculum,
  newClassItem,
  retakeTargets,
  toClassSaveInput,
  type ClassCurriculumDraft,
  type ClassItemDraft,
} from './class-curriculum-draft';

const compactInput =
  'w-full rounded-lg border border-[var(--border-strong)] bg-[var(--sidebar)] px-2.5 py-1.5 text-[13.5px] text-[var(--heading)] outline-none transition focus:border-[var(--accent)] focus:bg-[var(--bg)]';

type DragState =
  { kind: 'item'; key: string } | { kind: 'group'; index: number } | null;

type DropTarget = { groupKey: string; index?: number } | null;

const displayTitle = (item: ClassItemDraft) =>
  item.title.trim() || item.contentTitle;

/** Ô `datetime-local` → chuỗi hiển thị giờ Việt Nam. */
const localLabel = (local: string) =>
  formatDateTime(trainingLocalToIso(local) ?? undefined);

/**
 * Sửa giáo trình lớp (E1–E5, R7–R10): như giáo trình tham khảo, thêm ngày mở
 * (mục + chương), deadline, nhận bài quá hạn, ngưỡng đậu, "Thi lại cho". Mục
 * đã có bài làm khi bỏ thì ẩn (khôi phục được); lưu bằng `baseRevision`.
 */
export function ClassCurriculumEditor({
  slug,
  classroomId,
  courseId,
  curriculum,
  onSaved,
  onDirtyChange,
}: {
  slug: string;
  classroomId: string;
  courseId: string;
  curriculum: ClassCurriculum;
  onSaved: (curriculum: ClassCurriculum) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const text = vi.classes.curriculum;
  const common = vi.curricula;
  const readOnly = !curriculum.canEdit;
  const initial = useMemo(() => classDraftFrom(curriculum), [curriculum]);
  const [draft, setDraft] = useState<ClassCurriculumDraft>(initial.draft);
  const [removed, setRemoved] = useState<ClassItemDraft[]>(initial.removed);
  const [saved, setSaved] = useState(() => classDraftSnapshot(initial.draft));
  const [savedRemoved, setSavedRemoved] = useState(() =>
    initial.removed.map((item) => item.key).join(','),
  );
  const [revision, setRevision] = useState(curriculum.revision);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [picking, setPicking] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [hiding, setHiding] = useState<ClassItemDraft | null>(null);
  const [attemptsFor, setAttemptsFor] = useState<ClassItemDraft | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const [over, setOver] = useState<DropTarget>(null);
  const [overGroup, setOverGroup] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const dirty =
    classDraftSnapshot(draft) !== saved ||
    removed.map((item) => item.key).join(',') !== savedRemoved;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  useEffect(() => {
    if (armed === null) return;
    const disarm = () => setArmed(null);
    window.addEventListener('pointerup', disarm);
    return () => window.removeEventListener('pointerup', disarm);
  }, [armed]);

  const items = allItems(draft);
  const byKey = new Map(items.map((item) => [item.key, item]));
  const hiddenOnServer = new Set(curriculum.removed.map((item) => item.id));
  const existing = useMemo(() => classContentKeys(draft), [draft]);
  const total = itemCount(draft);
  const groupOptions = [
    { key: UNGROUPED, title: common.ungrouped },
    ...draft.groups.map((group, index) => ({
      key: group.key,
      title: group.title.trim() || common.newGroupTitle(index + 1),
    })),
  ];

  const change = (next: ClassCurriculumDraft) => {
    setDraft(next);
    setNotice(null);
    setError(null);
  };

  const endDrag = () => {
    setArmed(null);
    setDrag(null);
    setOver(null);
    setOverGroup(null);
  };

  /** Bỏ mục: đã có bài làm thì chuyển vào "Mục đã xoá" (ẩn khi lưu). */
  function drop(item: ClassItemDraft, confirmed = false) {
    if (items.some((row) => row.retakeOf === item.key)) {
      setError(text.hasRetakes);
      return;
    }
    if (item.learnerCount > 0 && !confirmed) {
      setHiding(item);
      return;
    }
    change(removeItem(draft, item.key));
    if (item.learnerCount > 0) setRemoved((rows) => [item, ...rows]);
  }

  /** Lần thi lại cùng đề, đặt ngay sau mục gốc. */
  function addRetake(root: ClassItemDraft) {
    const groupKey = groupKeyOf(draft, root.key);
    const retake = {
      ...newClassItem(
        {
          itemType: root.itemType,
          id: root.contentId,
          title: root.contentTitle,
          status: root.contentStatus,
        },
        { label: root.label },
      ),
      passThreshold: root.passThreshold,
      retakeOf: root.key,
    };
    const next = addItems(draft, groupKey, [retake]);
    const siblings =
      groupKey === UNGROUPED
        ? next.ungrouped
        : next.groups.find((group) => group.key === groupKey)!.items;
    const at = siblings.findIndex((item) => item.key === root.key) + 1;
    change(moveItem(next, retake.key, groupKey, at));
    setExpanded((keys) => new Set(keys).add(retake.key));
  }

  function restore(item: ClassItemDraft) {
    setRemoved((rows) => rows.filter((row) => row.key !== item.key));
    change(addItems(draft, UNGROUPED, [item]));
  }

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await saveClassCurriculum(
        slug,
        classroomId,
        toClassSaveInput(draft, revision),
      );
      const next = classDraftFrom(result);
      setDraft(next.draft);
      setRemoved(next.removed);
      setSaved(classDraftSnapshot(next.draft));
      setSavedRemoved(next.removed.map((item) => item.key).join(','));
      setRevision(result.revision);
      setNotice(text.saved);
      onSaved(result);
    } catch (err) {
      setError(errorMessage(err, vi.examEditor.saveFailed));
    } finally {
      setBusy(false);
    }
  }

  function badges(item: ClassItemDraft) {
    const isExam = item.itemType === CurriculumItemType.EXAM;
    const root = item.retakeOf ? byKey.get(item.retakeOf) : undefined;
    return (
      <span className="mt-0.5 flex flex-wrap gap-1">
        {root && (
          <Badge tone="warning">{text.retakeBadge(displayTitle(root))}</Badge>
        )}
        {item.opensAt && (
          <Badge>{text.opensBadge(localLabel(item.opensAt))}</Badge>
        )}
        {item.deadlineAt && (
          <Badge tone="accent">
            {text.deadlineBadge(localLabel(item.deadlineAt))}
          </Badge>
        )}
        {isExam && !item.acceptLate && <Badge>{text.noLate}</Badge>}
        {isExam &&
          Number(item.passThreshold) !== DEFAULT_PASS_THRESHOLD &&
          item.passThreshold !== '' && (
            <Badge>{text.passBadge(Number(item.passThreshold))}</Badge>
          )}
        {item.learnerCount > 0 && (
          <Badge tone="success">{text.learners(item.learnerCount)}</Badge>
        )}
      </span>
    );
  }

  function renderDetails(item: ClassItemDraft) {
    const isExam = item.itemType === CurriculumItemType.EXAM;
    const set = (patch: Partial<ClassItemDraft>) =>
      change(updateItem(draft, item.key, patch));
    const targets = retakeTargets(draft, item.key);
    const root = item.retakeOf ? byKey.get(item.retakeOf) : undefined;
    return (
      <div className="mt-2 grid gap-2 pl-7 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold text-[var(--body)]">
            {common.itemTitle}
          </span>
          <input
            value={item.title}
            maxLength={CURRICULUM_ITEM_TITLE_MAX_LENGTH}
            placeholder={item.contentTitle}
            onChange={(event) => set({ title: event.target.value })}
            className={compactInput}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold text-[var(--body)]">
            {common.itemNote}
          </span>
          <textarea
            value={item.note}
            rows={1}
            maxLength={CURRICULUM_ITEM_NOTE_MAX_LENGTH}
            onChange={(event) => set({ note: event.target.value })}
            className={compactInput}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold text-[var(--body)]">
            {text.opensAt}
          </span>
          <input
            type="datetime-local"
            value={item.opensAt}
            onChange={(event) => set({ opensAt: event.target.value })}
            className={compactInput}
          />
          <span className="text-[11.5px] text-[var(--muted)]">
            {text.opensAtHint}
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold text-[var(--body)]">
            {text.deadlineAt}
          </span>
          <input
            type="datetime-local"
            value={item.deadlineAt}
            onChange={(event) => set({ deadlineAt: event.target.value })}
            className={compactInput}
          />
          <span className="text-[11.5px] text-[var(--muted)]">
            {isExam ? text.deadlineExamHint : text.deadlineLessonHint}
          </span>
        </label>
        {isExam && (
          <>
            <label className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                checked={item.acceptLate}
                onChange={(event) => set({ acceptLate: event.target.checked })}
                className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              />
              <span>
                <span className="block text-[12.5px] font-semibold text-[var(--body)]">
                  {text.acceptLate}
                </span>
                <span className="block text-[11.5px] text-[var(--muted)]">
                  {text.acceptLateHint}
                </span>
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold text-[var(--body)]">
                {text.passThreshold}
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={item.passThreshold}
                onChange={(event) => set({ passThreshold: event.target.value })}
                className={`${compactInput} max-w-[120px]`}
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[12px] font-semibold text-[var(--body)]">
                {text.retakeOf}
              </span>
              <select
                value={item.retakeOf}
                onChange={(event) => set({ retakeOf: event.target.value })}
                className={compactInput}
              >
                <option value="">{text.notRetake}</option>
                {root && !targets.includes(root) && (
                  <option value={root.key}>{displayTitle(root)}</option>
                )}
                {targets.map((target) => (
                  <option key={target.key} value={target.key}>
                    {displayTitle(target)}
                  </option>
                ))}
              </select>
              <span className="text-[11.5px] text-[var(--muted)]">
                {text.retakeHint}
              </span>
              {root && root.contentId === item.contentId && (
                <span className="text-[12px] font-medium text-[var(--warn-text)]">
                  {text.sameExamWarning}
                </span>
              )}
            </label>
          </>
        )}
      </div>
    );
  }

  function renderItem(
    item: ClassItemDraft,
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
    return (
      <li
        key={item.key}
        draggable={!readOnly && armed === item.key}
        onDragStart={(event) => {
          setDrag({ kind: 'item', key: item.key });
          event.dataTransfer.effectAllowed = 'move';
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
              title={common.dragHint}
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
          <span className="min-w-0 flex-1 basis-48">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-[14px] font-medium text-[var(--heading)]">
                {displayTitle(item)}
              </span>
              {item.contentStatus === ExamStatus.ARCHIVED && (
                <Badge tone="warning" title={common.archivedHint}>
                  {common.archivedWarning}
                </Badge>
              )}
            </span>
            {item.title.trim() && (
              <span className="block truncate text-[12px] text-[var(--muted)]">
                {common.originalTitle(item.contentTitle)}
              </span>
            )}
            {badges(item)}
            {readOnly && item.note && (
              <span className="block whitespace-pre-line text-[12.5px] text-[var(--body)]">
                {item.note}
              </span>
            )}
          </span>
          {item.itemType === CurriculumItemType.EXAM &&
            item.learnerCount > 0 && (
              <button
                type="button"
                title={vi.classAttempts.open}
                onClick={() => setAttemptsFor(item)}
                className={iconButtonClass}
              >
                <ClipboardList size={16} />
              </button>
            )}
          {readOnly ? (
            <Badge tone="accent">{common.label[item.label]}</Badge>
          ) : (
            <>
              <select
                aria-label={common.labelField}
                title={common.labelField}
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
                    {common.label[label]}
                  </option>
                ))}
              </select>
              <select
                aria-label={common.moveToGroup}
                title={common.moveToGroup}
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
                  title={common.moveUp}
                  aria-label={common.moveUp}
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
                  title={common.moveDown}
                  aria-label={common.moveDown}
                  disabled={index === count - 1}
                  onClick={() =>
                    change(moveItem(draft, item.key, groupKey, index + 2))
                  }
                  className={iconButtonClass}
                >
                  <ArrowDown size={15} />
                </button>
                {item.itemType === CurriculumItemType.EXAM &&
                  !item.retakeOf && (
                    <button
                      type="button"
                      title={text.addRetake}
                      aria-label={text.addRetake}
                      onClick={() => addRetake(item)}
                      className={iconButtonClass}
                    >
                      <Repeat size={15} />
                    </button>
                  )}
                <button
                  type="button"
                  title={text.details}
                  aria-label={text.details}
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
                  title={common.removeItem}
                  aria-label={common.removeItem}
                  onClick={() => drop(item)}
                  className={iconButtonClass}
                >
                  <X size={16} />
                </button>
              </span>
            </>
          )}
        </div>
        {open && !readOnly && renderDetails(item)}
      </li>
    );
  }

  function renderItems(groupKey: string, rows: ClassItemDraft[]) {
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
        {rows.map((item, index) =>
          renderItem(item, groupKey, index, rows.length),
        )}
        {rows.length === 0 && (
          <li className="rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-3 text-center text-[13px] text-[var(--muted)]">
            {readOnly ? common.ungroupedHint : common.emptyGroup}
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
        <Plus size={15} /> {common.addItem}
      </button>
    );

  return (
    <div className="flex flex-col gap-3">
      <p className="max-w-3xl text-[13.5px] text-[var(--body)]">
        {readOnly ? text.readOnly : text.hint}
      </p>
      {!readOnly && (
        <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-sm">
          <span className="text-[13px] text-[var(--muted)]">
            {common.summary(draft.groups.length, total)}
          </span>
          {dirty && (
            <span className="text-[13px] font-medium text-[var(--warn-text)]">
              {common.unsaved}
            </span>
          )}
          <span className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setImporting(true)}
              className={secondaryButtonClass}
            >
              <Download size={16} /> {text.importFrom}
            </button>
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
                      title: common.newGroupTitle(draft.groups.length + 1),
                      opensAt: '',
                      items: [],
                    },
                  ],
                })
              }
              className={secondaryButtonClass}
            >
              <Plus size={16} /> {common.addGroup}
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
                {common.ungrouped}
              </span>
              <span className="block text-[12.5px] text-[var(--muted)]">
                {common.ungroupedHint}
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
                title={common.dragHint}
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
                {group.opensAt && (
                  <span className="ml-2 text-[12.5px] font-normal text-[var(--muted)]">
                    {text.opensBadge(localLabel(group.opensAt))}
                  </span>
                )}
              </h3>
            ) : (
              <>
                <input
                  aria-label={common.groupTitle}
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
                <label
                  title={text.opensAtHint}
                  className="flex items-center gap-1.5 text-[12px] text-[var(--muted)]"
                >
                  {text.groupOpensAt}
                  <input
                    type="datetime-local"
                    value={group.opensAt}
                    onChange={(event) =>
                      change({
                        ...draft,
                        groups: draft.groups.map((row) =>
                          row.key === group.key
                            ? { ...row, opensAt: event.target.value }
                            : row,
                        ),
                      })
                    }
                    className={`${compactInput} w-auto`}
                  />
                </label>
              </>
            )}
            {!readOnly && (
              <span className="flex items-center">
                {addButton(group.key)}
                <button
                  type="button"
                  title={common.moveUp}
                  aria-label={common.moveUp}
                  disabled={index === 0}
                  onClick={() => change(moveGroup(draft, index, index - 1))}
                  className={iconButtonClass}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  title={common.moveDown}
                  aria-label={common.moveDown}
                  disabled={index === draft.groups.length - 1}
                  onClick={() => change(moveGroup(draft, index, index + 1))}
                  className={iconButtonClass}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  title={`${common.removeGroup}. ${common.removeGroupHint}`}
                  aria-label={common.removeGroup}
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

      {removed.length > 0 && (
        <details className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
          <summary className="cursor-pointer text-[14px] font-semibold text-[var(--heading)]">
            {text.removedTitle(removed.length)}
          </summary>
          <p className="mt-1 text-[12.5px] text-[var(--muted)]">
            {text.removedHint}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {removed.map((item) => (
              <li
                key={item.key}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-2"
              >
                <ItemTypeIcon type={item.itemType} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-[var(--heading)]">
                    {displayTitle(item)}
                  </span>
                  <span className="text-[12px] text-[var(--muted)]">
                    {text.learners(item.learnerCount)}
                    {!hiddenOnServer.has(item.key) && ` · ${text.pendingHide}`}
                  </span>
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => restore(item)}
                    className={`${secondaryButtonClass} px-3 py-1.5 text-[13px]`}
                  >
                    <RotateCcw size={15} /> {text.restore}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      <ContentPickerDialog
        open={picking !== null}
        slug={slug}
        existing={existing}
        onAdd={(content) => {
          if (picking === null) return;
          const target =
            picking === UNGROUPED ||
            draft.groups.some((group) => group.key === picking)
              ? picking
              : UNGROUPED;
          // Nội dung trùng mục đã ẩn → khôi phục mục đó (E3).
          const hidden = removed.find(
            (row) =>
              contentKey(row.itemType, row.contentId) ===
              contentKey(content.itemType, content.id),
          );
          if (hidden) {
            setRemoved((rows) => rows.filter((row) => row !== hidden));
          }
          setDraft((current) =>
            addItems(current, target, [hidden ?? newClassItem(content)]),
          );
        }}
        onClose={() => setPicking(null)}
      />
      <ImportCurriculumDialog
        open={importing}
        slug={slug}
        courseId={courseId}
        onImport={(source) => {
          const result = importCurriculum(draft, removed, source, newKey);
          setDraft(result.draft);
          setRemoved(result.removed);
          setImporting(false);
          setError(null);
          setNotice(text.imported(result.added, result.skipped));
        }}
        onClose={() => setImporting(false)}
      />
      {attemptsFor && (
        <ItemAttemptsDialog
          open
          slug={slug}
          classroomId={classroomId}
          itemId={attemptsFor.key}
          itemTitle={displayTitle(attemptsFor)}
          canVoid={!readOnly}
          onClose={() => setAttemptsFor(null)}
        />
      )}
      <ConfirmDialog
        open={hiding !== null}
        title={common.removeItem}
        message={hiding ? text.removeWithWork(hiding.learnerCount) : ''}
        confirmLabel={common.removeItem}
        tone="danger"
        onConfirm={() => {
          if (hiding) drop(hiding, true);
          setHiding(null);
        }}
        onCancel={() => setHiding(null)}
      />
    </div>
  );
}
