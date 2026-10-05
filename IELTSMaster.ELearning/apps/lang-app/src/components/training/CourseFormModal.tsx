'use client';

import { useEffect, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import {
  COURSE_CODE_MAX_LENGTH,
  COURSE_DESCRIPTION_MAX_LENGTH,
  COURSE_LEVEL_MAX_LENGTH,
  COURSE_MAX_PLANNED_SESSIONS,
  COURSE_NAME_MAX_LENGTH,
  type CategoryItem,
  type CourseDetail,
  type CourseListItem,
} from '@lang/shared';
import { MediaDialog } from '@/components/media/MediaDialog';
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
import { createCourse, updateCourse } from '@/lib/training-api';

const FORM_ID = 'course-form';

interface CourseFormModalProps {
  open: boolean;
  slug: string;
  /** `null` là tạo khoá học mới. */
  course: CourseListItem | null;
  /** Danh mục trung tâm nhìn thấy (hệ thống + trung tâm). */
  categories: CategoryItem[];
  onClose: () => void;
  onSaved: (course: CourseDetail) => void;
}

/** Tạo/sửa khoá học (Owner/Admin). Ảnh bìa chọn qua Thư viện media hoặc dán URL. */
export function CourseFormModal({
  open,
  slug,
  course,
  categories,
  onClose,
  onSaved,
}: CourseFormModalProps) {
  const text = vi.courses.form;
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [level, setLevel] = useState('');
  const [plannedSessions, setPlannedSessions] = useState('');
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCode(course?.code ?? '');
    setName(course?.name ?? '');
    setDescription(course?.description ?? '');
    setCategoryId(course?.category?.id ?? '');
    setCoverUrl(course?.coverUrl ?? '');
    setLevel(course?.level ?? '');
    setPlannedSessions(course?.plannedSessions?.toString() ?? '');
    setError(null);
  }, [open, course]);

  // Danh mục ngừng dùng chỉ hiện khi đang là danh mục của khoá học.
  const options = categories.filter(
    (item) => item.isActive || item.id === course?.category?.id,
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const input = {
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || null,
        categoryId: categoryId || null,
        coverUrl: coverUrl.trim() || null,
        level: level.trim() || null,
        plannedSessions: plannedSessions ? Number(plannedSessions) : null,
      };
      onSaved(
        course
          ? await updateCourse(slug, course.id, input)
          : await createCourse(slug, input),
      );
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={course ? text.editTitle : text.createTitle}
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
              disabled={busy}
              className={compactPrimaryButtonClass}
            >
              {busy ? vi.common.processing : course ? text.save : text.create}
            </button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <label className={labelClass}>
              <span className={labelTextClass}>{text.code}</span>
              <input
                value={code}
                required
                maxLength={COURSE_CODE_MAX_LENGTH}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                className={`${inputClass} font-mono`}
              />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>{text.name}</span>
              <input
                value={name}
                required
                maxLength={COURSE_NAME_MAX_LENGTH}
                placeholder={text.namePlaceholder}
                onChange={(event) => setName(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <p className="-mt-2 text-[12.5px] text-[var(--muted)]">
            {text.codeHint}
          </p>

          <label className={labelClass}>
            <span className={labelTextClass}>
              {text.description} {vi.common.optional}
            </span>
            <textarea
              value={description}
              rows={3}
              maxLength={COURSE_DESCRIPTION_MAX_LENGTH}
              onChange={(event) => setDescription(event.target.value)}
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            <span className={labelTextClass}>
              {text.category} {vi.common.optional}
            </span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={inputClass}
            >
              <option value="">{text.noCategory}</option>
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.isActive ? item.name : text.inactiveCategory(item.name)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              <span className={labelTextClass}>
                {text.level} {vi.common.optional}
              </span>
              <input
                value={level}
                maxLength={COURSE_LEVEL_MAX_LENGTH}
                placeholder={text.levelPlaceholder}
                onChange={(event) => setLevel(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              <span className={labelTextClass}>
                {text.plannedSessions} {vi.common.optional}
              </span>
              <input
                type="number"
                min={1}
                max={COURSE_MAX_PLANNED_SESSIONS}
                value={plannedSessions}
                onChange={(event) => setPlannedSessions(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <p className="-mt-2 text-[12.5px] text-[var(--muted)]">
            {text.plannedSessionsHint}
          </p>

          <div className={labelClass}>
            <span className={labelTextClass}>
              {text.cover} {vi.common.optional}
            </span>
            <div className="flex items-center gap-3">
              {coverUrl ? (
                // Ảnh từ R2/URL ngoài: dùng <img>, không dùng next/image.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt=""
                  className="h-16 w-28 shrink-0 rounded-lg border border-[var(--border)] object-cover"
                />
              ) : (
                <span className="grid h-16 w-28 shrink-0 place-items-center rounded-lg border border-dashed border-[var(--border-strong)] text-[var(--muted)]">
                  <ImagePlus size={20} />
                </span>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPicking(true)}
                  className={secondaryButtonClass}
                >
                  <ImagePlus size={16} /> {text.chooseCover}
                </button>
                {coverUrl && (
                  <button
                    type="button"
                    onClick={() => setCoverUrl('')}
                    className={secondaryButtonClass}
                  >
                    <X size={16} /> {text.removeCover}
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && <FormAlert tone="error">{error}</FormAlert>}
        </form>
      </Modal>
      <MediaDialog
        open={picking}
        kind="image"
        slug={slug}
        onInsert={(url) => {
          setCoverUrl(url);
          setPicking(false);
        }}
        onClose={() => setPicking(false)}
      />
    </>
  );
}
