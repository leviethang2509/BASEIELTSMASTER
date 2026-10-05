'use client';

import { useEffect, useState } from 'react';
import type { CurriculumDetail, CurriculumListItem } from '@lang/shared';
import {
  FormAlert,
  Modal,
  compactPrimaryButtonClass,
  inputClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { getCurriculum, listCurricula } from '@/lib/training-api';

/**
 * Chọn giáo trình tham khảo để chép chương + mục vào bản đang sửa của giáo
 * trình lớp (người dùng chốt Step 7: nhập ở client rồi Lưu). Giáo trình gắn
 * với khoá học của lớp hiện trước.
 */
export function ImportCurriculumDialog({
  open,
  slug,
  courseId,
  onImport,
  onClose,
}: {
  open: boolean;
  slug: string;
  courseId: string;
  onImport: (curriculum: CurriculumDetail) => void;
  onClose: () => void;
}) {
  const text = vi.classes.curriculum;
  const [rows, setRows] = useState<CurriculumListItem[]>([]);
  const [choice, setChoice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setChoice('');
    setError(null);
    listCurricula(slug, { page: 1, pageSize: 100 }).then(
      (result) => {
        if (!cancelled) setRows(result.items);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, slug]);

  const ofCourse = rows.filter((row) =>
    row.courses.some((course) => course.id === courseId),
  );
  const others = rows.filter((row) => !ofCourse.includes(row));

  async function submit() {
    if (!choice) return;
    setBusy(true);
    setError(null);
    try {
      onImport(await getCurriculum(slug, choice));
    } catch (err) {
      setError(errorMessage(err, vi.common.loadFailed));
    } finally {
      setBusy(false);
    }
  }

  const option = (row: CurriculumListItem) => (
    <option key={row.id} value={row.id}>
      {row.name} · {vi.curricula.summary(row.groupCount, row.itemCount)}
    </option>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={text.importTitle}
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
            type="button"
            disabled={!choice || busy}
            onClick={() => void submit()}
            className={compactPrimaryButtonClass}
          >
            {busy ? vi.common.processing : text.importButton}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-[var(--muted)]">{text.importHint}</p>
        {error && <FormAlert tone="error">{error}</FormAlert>}
        <select
          value={choice}
          onChange={(event) => setChoice(event.target.value)}
          className={`${inputClass} py-2 text-[14px]`}
        >
          <option value="">{text.importPlaceholder}</option>
          {ofCourse.length > 0 && (
            <optgroup label={text.importCourseGroup}>
              {ofCourse.map(option)}
            </optgroup>
          )}
          {others.length > 0 && (
            <optgroup label={text.importOtherGroup}>
              {others.map(option)}
            </optgroup>
          )}
        </select>
      </div>
    </Modal>
  );
}
