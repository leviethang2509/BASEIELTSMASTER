'use client';

import { useEffect, useState } from 'react';
import {
  CURRICULUM_DESCRIPTION_MAX_LENGTH,
  CURRICULUM_NAME_MAX_LENGTH,
  type CurriculumDetail,
  type CurriculumListItem,
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
import { createCurriculum, updateCurriculum } from '@/lib/training-api';

const FORM_ID = 'curriculum-form';

/** Tạo giáo trình hoặc sửa tên, mô tả (chương + mục sửa ở trang giáo trình). */
export function CurriculumFormModal({
  open,
  slug,
  curriculum,
  onClose,
  onSaved,
}: {
  open: boolean;
  slug: string;
  /** `null` là tạo giáo trình mới. */
  curriculum: CurriculumListItem | null;
  onClose: () => void;
  onSaved: (curriculum: CurriculumDetail) => void;
}) {
  const text = vi.curricula.form;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(curriculum?.name ?? '');
    setDescription(curriculum?.description ?? '');
    setError(null);
  }, [open, curriculum]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const input = {
        name: name.trim(),
        description: description.trim() || null,
      };
      onSaved(
        curriculum
          ? await updateCurriculum(slug, curriculum.id, input)
          : await createCurriculum(slug, input),
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
      title={curriculum ? text.editTitle : text.createTitle}
      widthClass="max-w-lg"
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
            {busy ? vi.common.processing : curriculum ? text.save : text.create}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} className="flex flex-col gap-4">
        <label className={labelClass}>
          <span className={labelTextClass}>{text.name}</span>
          <input
            value={name}
            required
            maxLength={CURRICULUM_NAME_MAX_LENGTH}
            placeholder={text.namePlaceholder}
            onChange={(event) => setName(event.target.value)}
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
            maxLength={CURRICULUM_DESCRIPTION_MAX_LENGTH}
            onChange={(event) => setDescription(event.target.value)}
            className={inputClass}
          />
        </label>
        {error && <FormAlert tone="error">{error}</FormAlert>}
      </form>
    </Modal>
  );
}
