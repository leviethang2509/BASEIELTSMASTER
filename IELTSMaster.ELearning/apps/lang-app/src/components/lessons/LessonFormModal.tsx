'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ContentVisibility,
  LESSON_DESCRIPTION_MAX_LENGTH,
  LESSON_TITLE_MAX_LENGTH,
  type LessonBlueprintItem,
  type LessonDetail,
  type LessonListItem,
} from '@lang/shared';
import {
  FormAlert,
  Modal,
  compactPrimaryButtonClass,
  inputClass,
  labelClass,
  labelTextClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { createLesson, updateLesson } from '@/lib/lesson-api';

const FORM_ID = 'lesson-form';

interface LessonFormModalProps {
  open: boolean;
  slug: string;
  /** `null` là tạo bài học mới. */
  lesson: LessonListItem | null;
  /** Mẫu bài học trung tâm nhìn thấy (hệ thống + trung tâm). */
  blueprints: LessonBlueprintItem[];
  onClose: () => void;
  onSaved: (lesson: LessonDetail) => void;
}

/**
 * Tạo bài học (chọn mẫu bài học) hoặc sửa tên, mô tả, mẫu, hiển thị; chép
 * `ExamFormModal`. Bài học mới mặc định "Chỉ qua lớp" (đề thi mặc định công khai).
 */
export function LessonFormModal({
  open,
  slug,
  lesson,
  blueprints,
  onClose,
  onSaved,
}: LessonFormModalProps) {
  const text = { ...vi.exams.form, ...vi.lessons.form };
  const [blueprintId, setBlueprintId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<ContentVisibility>(
    ContentVisibility.PRIVATE,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setBlueprintId(lesson?.blueprint.id ?? '');
    setTitle(lesson?.title ?? '');
    setDescription(lesson?.description ?? '');
    setVisibility(lesson?.visibility ?? ContentVisibility.PRIVATE);
    setError(null);
  }, [open, lesson]);

  // Chỉ chọn được mẫu còn dùng (kể cả danh mục); mẫu hiện tại của bài học vẫn
  // hiện dù đã ngừng dùng.
  const groups = useMemo(() => {
    const byCategory = new Map<
      string,
      { label: string; items: LessonBlueprintItem[] }
    >();
    for (const blueprint of blueprints) {
      const usable = blueprint.isActive && blueprint.category.isActive;
      if (!usable && blueprint.id !== lesson?.blueprint.id) continue;
      const group = byCategory.get(blueprint.category.id) ?? {
        label: blueprint.category.name,
        items: [],
      };
      group.items.push(blueprint);
      byCategory.set(blueprint.category.id, group);
    }
    return [...byCategory.values()];
  }, [blueprints, lesson?.blueprint.id]);

  const selected = blueprints.find((item) => item.id === blueprintId);
  const blueprintChanged =
    lesson !== null && blueprintId !== lesson.blueprint.id;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!blueprintId) {
      setError(text.chooseBlueprint);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const input = {
        blueprintId,
        title: title.trim(),
        description: description.trim() || null,
        visibility,
      };
      onSaved(
        lesson
          ? await updateLesson(slug, lesson.id, input)
          : await createLesson(slug, input),
      );
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lesson ? text.editTitle : text.createTitle}
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
            type="submit"
            form={FORM_ID}
            disabled={busy || groups.length === 0}
            className={compactPrimaryButtonClass}
          >
            {busy ? vi.common.processing : lesson ? text.save : text.create}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="flex flex-col gap-4">
        {groups.length === 0 && (
          <FormAlert tone="warning">{text.noBlueprint}</FormAlert>
        )}
        <label className={labelClass}>
          <span className={labelTextClass}>{text.blueprint}</span>
          <select
            value={blueprintId}
            required
            onChange={(event) => {
              const next = blueprints.find(
                (item) => item.id === event.target.value,
              );
              setBlueprintId(event.target.value);
              // Tạo mới mà chưa nhập tên thì gợi ý theo tên mẫu.
              if (!lesson && next && !title.trim()) setTitle(next.name);
            }}
            className={inputClass}
          >
            <option value="">{text.chooseBlueprint}</option>
            {groups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.isActive && item.category.isActive
                      ? text.blueprintOption(
                          item.name,
                          item.modules.length,
                          vi.catalog.scope[item.scope],
                        )
                      : text.inactiveBlueprint(item.name)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {selected && !lesson && (
            <span className="text-[12.5px] text-[var(--muted)]">
              {text.sectionsFromModules(
                selected.modules.map((module) => module.name).join(', '),
              )}
            </span>
          )}
          {blueprintChanged && (
            <span className="text-[12.5px] text-[var(--warn-text)]">
              {text.blueprintChangeHint}
            </span>
          )}
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>{text.title}</span>
          <input
            value={title}
            required
            maxLength={LESSON_TITLE_MAX_LENGTH}
            placeholder={text.titlePlaceholder}
            onChange={(event) => setTitle(event.target.value)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className={labelTextClass}>
            {text.description} {vi.common.optional}
          </span>
          <textarea
            value={description}
            rows={3}
            maxLength={LESSON_DESCRIPTION_MAX_LENGTH}
            onChange={(event) => setDescription(event.target.value)}
            className={inputClass}
          />
        </label>

        <fieldset className={labelClass}>
          <legend className={`${labelTextClass} mb-1.5`}>
            {text.visibility}
          </legend>
          <div className="grid gap-1.5">
            {Object.values(ContentVisibility).map((value) => (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 transition ${
                  visibility === value
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border)] hover:bg-[var(--hover)]'
                }`}
              >
                <input
                  type="radio"
                  name="lesson-visibility"
                  value={value}
                  checked={visibility === value}
                  onChange={() => setVisibility(value)}
                  className="mt-[5px] accent-[var(--accent)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-[var(--heading)]">
                    {vi.exams.visibility[value]}
                  </span>
                  <span className="block text-[12.5px] text-[var(--muted)]">
                    {text.visibilityHint[value]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && <FormAlert tone="error">{error}</FormAlert>}
      </form>
    </Modal>
  );
}
