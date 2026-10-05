'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, GripVertical, Pencil, Plus, X } from 'lucide-react';
import {
  DURATION_OPTIONS_MINUTES,
  EXAM_MAX_SECTIONS,
  EXAM_MIN_SECTIONS,
  EXAM_SECTION_NAME_MAX_LENGTH,
} from '@lang/shared';
import { ConfirmDialog, PromptDialog } from '@/components/ui';
import { vi } from '@/i18n/vi';

export interface SectionTab {
  key: string;
  name: string;
  /** Không có ở bài học (section không có thời lượng). */
  durationMinutes?: number;
  /** Số lỗi soạn thảo trong section. */
  errorCount: number;
}

/** Module của loại đề hoặc phần của mẫu bài học (không có thời lượng). */
export interface SectionTabModule {
  id: string;
  name: string;
  referenceDurationMinutes?: number;
}

interface SectionTabsProps<M extends SectionTabModule> {
  tabs: SectionTab[];
  activeKey: string;
  readOnly: boolean;
  /** Module của loại đề hiện tại, cho mục "Thêm section từ module". */
  modules: M[];
  /** `lesson`: bài học – chữ "bài học/phần của mẫu", không có ô thời lượng. */
  variant?: 'exam' | 'lesson';
  onSelect: (key: string) => void;
  onAdd: (module: M | null) => void;
  onRename: (key: string, name: string) => void;
  /** Bỏ trống thì không có ô chọn thời lượng. */
  onDuration?: (key: string, minutes: number) => void;
  onRemove: (key: string) => void;
  onMove: (from: number, to: number) => void;
}

/** Thanh tab section: chọn, thêm, đổi tên, đổi thời lượng, xoá, kéo sắp xếp. */
export function SectionTabs<M extends SectionTabModule>({
  tabs,
  activeKey,
  readOnly,
  modules,
  variant = 'exam',
  onSelect,
  onAdd,
  onRename,
  onDuration,
  onRemove,
  onMove,
}: SectionTabsProps<M>) {
  const text =
    variant === 'lesson'
      ? { ...vi.examEditor.tabs, ...vi.lessonEditor.tabs }
      : vi.examEditor.tabs;
  const [renaming, setRenaming] = useState<SectionTab | null>(null);
  const [removing, setRemoving] = useState<SectionTab | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const addRef = useRef<HTMLDivElement>(null);
  const active = tabs.find((tab) => tab.key === activeKey);
  const canAdd = tabs.length < EXAM_MAX_SECTIONS;

  useEffect(() => {
    if (!addOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!addRef.current?.contains(event.target as Node)) setAddOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [addOpen]);

  return (
    <div className="flex shrink-0 flex-wrap items-end gap-2 border-b border-[var(--border)]">
      <div
        role="tablist"
        aria-label={text.label}
        className="-mb-px flex min-w-[min(100%,260px)] flex-1 gap-1 overflow-x-auto"
      >
        {tabs.map((tab, index) => {
          const selected = tab.key === activeKey;
          return (
            <div
              key={tab.key}
              draggable={!readOnly}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                setDragIndex(index);
              }}
              onDragOver={(event) => {
                if (dragIndex === null) return;
                event.preventDefault();
                setOverIndex(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex !== null && dragIndex !== index) {
                  onMove(dragIndex, index);
                }
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={`flex shrink-0 items-center rounded-t-lg border-b-2 transition ${
                selected
                  ? 'border-[var(--accent)] bg-[var(--card)]'
                  : 'border-transparent hover:bg-[var(--hover)]'
              } ${overIndex === index && dragIndex !== index ? 'ring-2 ring-[var(--accent-soft)]' : ''} ${
                dragIndex === index ? 'opacity-50' : ''
              }`}
            >
              {!readOnly && (
                <GripVertical
                  size={14}
                  aria-hidden
                  className="ml-1.5 cursor-grab text-[var(--muted)]"
                />
              )}
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onSelect(tab.key)}
                className={`flex items-center gap-1.5 px-2.5 py-2 text-[13.5px] font-semibold ${
                  selected ? 'text-[var(--heading)]' : 'text-[var(--muted)]'
                }`}
              >
                <span className="max-w-[180px] truncate">{tab.name}</span>
                {tab.durationMinutes !== undefined && (
                  <span className="text-[12px] font-normal text-[var(--muted)]">
                    {text.minutes(tab.durationMinutes)}
                  </span>
                )}
                {tab.errorCount > 0 && (
                  <span
                    title={text.errors(tab.errorCount)}
                    className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--danger)] px-1 text-[11px] font-bold text-[var(--on-status)]"
                  >
                    {tab.errorCount}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {!readOnly && active && (
        <div className="mb-1 flex shrink-0 flex-wrap items-center gap-1.5">
          {onDuration && active.durationMinutes !== undefined && (
            <select
              value={active.durationMinutes}
              aria-label={text.duration}
              title={text.duration}
              onChange={(event) =>
                onDuration(active.key, Number(event.target.value))
              }
              className="h-8 rounded-lg border border-[var(--border-strong)] bg-[var(--bg)] px-2 text-[13px] text-[var(--body)] outline-none"
            >
              {DURATION_OPTIONS_MINUTES.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {text.minutes(minutes)}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            title={text.rename}
            aria-label={text.rename}
            onClick={() => setRenaming(active)}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--accent)]"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            title={
              tabs.length <= EXAM_MIN_SECTIONS ? text.cannotRemove : text.remove
            }
            aria-label={text.remove}
            disabled={tabs.length <= EXAM_MIN_SECTIONS}
            onClick={() => setRemoving(active)}
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={16} />
          </button>
          <div ref={addRef} className="relative">
            <button
              type="button"
              disabled={!canAdd}
              title={canAdd ? text.add : text.maxSections(EXAM_MAX_SECTIONS)}
              aria-expanded={addOpen}
              onClick={() => setAddOpen((open) => !open)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border-strong)] px-2.5 text-[13px] font-medium text-[var(--body)] transition hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={15} /> {text.add} <ChevronDown size={13} />
            </button>
            {addOpen && (
              <div className="absolute right-0 top-9 z-30 w-[260px] rounded-xl border border-[var(--border-strong)] bg-[var(--raised)] p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setAddOpen(false);
                    onAdd(null);
                  }}
                  className="flex w-full rounded-lg px-2.5 py-1.5 text-left text-[13.5px] text-[var(--body)] hover:bg-[var(--hover)]"
                >
                  {text.addEmpty}
                </button>
                {modules.length > 0 && (
                  <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted)]">
                    {text.fromModule}
                  </p>
                )}
                {modules.map((module) => (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => {
                      setAddOpen(false);
                      onAdd(module);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13.5px] text-[var(--body)] hover:bg-[var(--hover)]"
                  >
                    <span className="truncate">{module.name}</span>
                    {module.referenceDurationMinutes !== undefined && (
                      <span className="shrink-0 text-[12px] text-[var(--muted)]">
                        {text.minutes(module.referenceDurationMinutes)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <PromptDialog
        open={renaming !== null}
        title={text.rename}
        label={text.name}
        defaultValue={renaming?.name ?? ''}
        hint={text.nameHint(EXAM_SECTION_NAME_MAX_LENGTH)}
        onCancel={() => setRenaming(null)}
        onSubmit={(name) => {
          if (renaming) {
            onRename(renaming.key, name.slice(0, EXAM_SECTION_NAME_MAX_LENGTH));
          }
          setRenaming(null);
        }}
      />
      <ConfirmDialog
        open={removing !== null}
        title={text.remove}
        message={removing ? text.removeConfirm(removing.name) : ''}
        confirmLabel={text.remove}
        tone="danger"
        onConfirm={() => {
          if (removing) onRemove(removing.key);
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
