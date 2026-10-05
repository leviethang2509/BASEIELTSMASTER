'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import {
  DURATION_OPTIONS_MINUTES,
  EXAM_BLUEPRINT_MAX_MODULES,
  LESSON_BLUEPRINT_MAX_MODULES,
  CATALOG_CODE_MAX_LENGTH,
  CATALOG_DESCRIPTION_MAX_LENGTH,
  CATALOG_NAME_MAX_LENGTH,
} from '@lang/shared';
import { iconButtonClass, secondaryButtonClass } from '@/components/ui';
import { vi } from '@/i18n/vi';

/**
 * Module đang soạn; `key` ổn định cho React vì `id` chỉ có ở module đã lưu.
 * Phần của mẫu bài học bỏ qua `referenceDurationMinutes`.
 */
export interface ModuleDraft {
  key: string;
  id?: string;
  name: string;
  code: string;
  referenceDurationMinutes: number;
  description: string;
}

let nextKey = 0;
/** Không dùng `crypto.randomUUID` vì VPS chạy HTTP. */
export function newModuleKey(): string {
  nextKey += 1;
  return `module-${nextKey}`;
}

const DEFAULT_MINUTES = 30;

const compactInputClass =
  'w-full rounded-lg border border-[var(--border-strong)] bg-[var(--sidebar)] px-3 py-2 text-[14px] text-[var(--heading)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:bg-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-70';

function move<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** `exam`: module loại đề (có thời lượng); `lesson`: phần mẫu bài học. */
export type ModulesVariant = 'exam' | 'lesson';

// Viết nguyên văn để Tailwind sinh class.
const FIELDS_GRID: Record<ModulesVariant, string> = {
  exam: 'sm:grid-cols-[minmax(0,1fr)_150px_130px]',
  lesson: 'sm:grid-cols-[minmax(0,1fr)_150px]',
};
const DESCRIPTION_SPAN: Record<ModulesVariant, string> = {
  exam: 'sm:col-span-3',
  lesson: 'sm:col-span-2',
};

/**
 * Danh sách module của loại đề / phần của mẫu bài học: kéo thả bằng tay cầm (HTML5 drag & drop, chỉ
 * bật `draggable` khi đang giữ tay cầm để còn bôi chọn chữ trong ô nhập) hoặc
 * nút lên/xuống cho bàn phím và mobile.
 */
export function ModulesEditor({
  modules,
  readOnly,
  onChange,
  variant = 'exam',
}: {
  modules: ModuleDraft[];
  readOnly: boolean;
  onChange: (modules: ModuleDraft[]) => void;
  variant?: ModulesVariant;
}) {
  const [armed, setArmed] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const withDuration = variant === 'exam';
  const maxModules = withDuration
    ? EXAM_BLUEPRINT_MAX_MODULES
    : LESSON_BLUEPRINT_MAX_MODULES;
  const text = withDuration
    ? vi.catalog.blueprints
    : { ...vi.catalog.blueprints, ...vi.catalog.lessonBlueprints };

  // Thả chuột ngoài tay cầm mà không kéo: tắt `draggable` để còn bôi chọn chữ.
  useEffect(() => {
    if (armed === null) return;
    const disarm = () => setArmed(null);
    window.addEventListener('pointerup', disarm);
    return () => window.removeEventListener('pointerup', disarm);
  }, [armed]);

  const update = (index: number, patch: Partial<ModuleDraft>) =>
    onChange(
      modules.map((module, i) =>
        i === index ? { ...module, ...patch } : module,
      ),
    );

  const endDrag = () => {
    setArmed(null);
    setDragging(null);
    setOver(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-2">
        {modules.map((module, index) => (
          <li
            key={module.key}
            draggable={!readOnly && armed === index}
            onDragStart={(event) => {
              setDragging(index);
              event.dataTransfer.effectAllowed = 'move';
              // Firefox chỉ bắt đầu kéo khi có dữ liệu.
              event.dataTransfer.setData('text/plain', module.code);
            }}
            onDragOver={(event) => {
              if (dragging === null) return;
              event.preventDefault();
              setOver(index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (dragging !== null && dragging !== index) {
                onChange(move(modules, dragging, index));
              }
              endDrag();
            }}
            onDragEnd={endDrag}
            className={`rounded-xl border bg-[var(--card)] p-3 transition ${
              over === index && dragging !== index
                ? 'border-[var(--accent)]'
                : 'border-[var(--border)]'
            } ${dragging === index ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start gap-2">
              {!readOnly && (
                <span
                  title={text.dragHint}
                  aria-hidden
                  onPointerDown={() => setArmed(index)}
                  className="mt-1.5 cursor-grab text-[var(--muted)] active:cursor-grabbing"
                >
                  <GripVertical size={18} />
                </span>
              )}
              <span className="mt-2 w-5 shrink-0 text-center text-[13px] font-semibold text-[var(--muted)]">
                {index + 1}
              </span>

              <div
                className={`grid min-w-0 flex-1 gap-2 ${FIELDS_GRID[variant]}`}
              >
                <input
                  required
                  aria-label={text.moduleName}
                  placeholder={text.moduleName}
                  maxLength={CATALOG_NAME_MAX_LENGTH}
                  value={module.name}
                  onChange={(event) =>
                    update(index, { name: event.target.value })
                  }
                  className={compactInputClass}
                />
                <input
                  required
                  aria-label={text.moduleCode}
                  placeholder={text.moduleCode}
                  maxLength={CATALOG_CODE_MAX_LENGTH}
                  value={module.code}
                  onChange={(event) =>
                    update(index, { code: event.target.value.toUpperCase() })
                  }
                  className={`${compactInputClass} font-mono`}
                />
                {withDuration && (
                  <select
                    aria-label={text.moduleDuration}
                    title={text.moduleDuration}
                    value={module.referenceDurationMinutes}
                    onChange={(event) =>
                      update(index, {
                        referenceDurationMinutes: Number(event.target.value),
                      })
                    }
                    className={compactInputClass}
                  >
                    {DURATION_OPTIONS_MINUTES.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {text.minutes(minutes)}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  aria-label={text.moduleDescription}
                  placeholder={`${text.moduleDescription} ${vi.common.optional}`}
                  maxLength={CATALOG_DESCRIPTION_MAX_LENGTH}
                  value={module.description}
                  onChange={(event) =>
                    update(index, { description: event.target.value })
                  }
                  className={`${compactInputClass} text-[13px] ${DESCRIPTION_SPAN[variant]}`}
                />
              </div>

              {!readOnly && (
                <div className="flex shrink-0 flex-col gap-0.5 sm:flex-row">
                  <button
                    type="button"
                    title={text.moveUp}
                    aria-label={text.moveUp}
                    disabled={index === 0}
                    onClick={() => onChange(move(modules, index, index - 1))}
                    className={iconButtonClass}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    title={text.moveDown}
                    aria-label={text.moveDown}
                    disabled={index === modules.length - 1}
                    onClick={() => onChange(move(modules, index, index + 1))}
                    className={iconButtonClass}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    type="button"
                    title={text.removeModule}
                    aria-label={text.removeModule}
                    disabled={modules.length <= 1}
                    onClick={() =>
                      onChange(modules.filter((_, i) => i !== index))
                    }
                    className={iconButtonClass}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      {!readOnly && (
        <button
          type="button"
          disabled={modules.length >= maxModules}
          onClick={() =>
            onChange([
              ...modules,
              {
                key: newModuleKey(),
                name: '',
                code: '',
                referenceDurationMinutes: DEFAULT_MINUTES,
                description: '',
              },
            ])
          }
          className={`${secondaryButtonClass} self-start`}
        >
          <Plus size={16} /> {text.addModule}
        </button>
      )}
    </div>
  );
}
