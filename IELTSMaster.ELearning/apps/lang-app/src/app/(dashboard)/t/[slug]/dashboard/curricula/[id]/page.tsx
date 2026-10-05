'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Pencil } from 'lucide-react';
import type { CurriculumDetail } from '@lang/shared';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import { CurriculumEditor } from '@/components/training/CurriculumEditor';
import { CurriculumFormModal } from '@/components/training/CurriculumFormModal';
import { CourseChips } from '@/components/training/training-ui';
import {
  Badge,
  ConfirmDialog,
  FormAlert,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { formatDateTime } from '@/lib/format';
import {
  cloneCurriculum,
  curriculumDetailPath,
  curriculumListPath,
  getCurriculum,
} from '@/lib/training-api';

/** Giáo trình tham khảo: thông tin, khoá học đang gắn, chương + mục. */
export default function CurriculumDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { tenant } = useTenantDashboard();
  const slug = tenant.slug;
  const text = vi.curricula;

  const [curriculum, setCurriculum] = useState<CurriculumDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurriculum(slug, params.id).then(
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
  }, [slug, params.id]);

  // Rời trang (đóng tab, tải lại) khi còn thay đổi chưa lưu.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const onDirtyChange = useCallback((value: boolean) => setDirty(value), []);

  async function clone() {
    if (!curriculum) return;
    setBusy(true);
    setError(null);
    try {
      const copy = await cloneCurriculum(slug, curriculum.id);
      router.push(curriculumDetailPath(slug, copy.id));
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusy(false);
      setCloning(false);
    }
  }

  const backLink = (
    <Link
      href={curriculumListPath(slug)}
      onClick={(event) => {
        if (dirty && !window.confirm(text.leaveConfirm)) {
          event.preventDefault();
        }
      }}
      className="inline-flex w-fit items-center gap-1.5 text-[13px] text-[var(--muted)] hover:text-[var(--accent)]"
    >
      <ArrowLeft size={15} /> {text.backToList}
    </Link>
  );

  if (!curriculum) {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        {error ? (
          <>
            <FormAlert tone="error">{error}</FormAlert>
            {backLink}
          </>
        ) : (
          <span className="text-[14px] text-[var(--muted)]">
            {vi.common.loading}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      {backLink}

      <header className="flex flex-wrap items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[20px] font-semibold text-[var(--heading)]">
              {curriculum.name}
            </h1>
            {!curriculum.canEdit && (
              <Badge>{vi.examEditor.readOnlyBadge}</Badge>
            )}
          </div>
          {curriculum.description && (
            <p className="mt-1 whitespace-pre-line text-[13.5px] text-[var(--body)]">
              {curriculum.description}
            </p>
          )}
          <p className="mt-1.5 text-[12.5px] text-[var(--muted)]">
            {[
              curriculum.creator?.fullName,
              curriculum.clonedFrom &&
                text.clonedFrom(curriculum.clonedFrom.name),
              `${vi.exams.updatedAt} ${formatDateTime(curriculum.updatedAt)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] font-semibold text-[var(--body)]">
              {text.courses}:
            </span>
            <CourseChips slug={slug} courses={curriculum.courses} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {curriculum.canEdit && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={secondaryButtonClass}
            >
              <Pencil size={15} /> {text.metadata}
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => setCloning(true)}
            className={secondaryButtonClass}
          >
            <Copy size={15} /> {text.clone}
          </button>
        </div>
      </header>

      {!curriculum.canEdit && (
        <FormAlert tone="info">{text.readOnlyHint}</FormAlert>
      )}
      {error && <FormAlert tone="error">{error}</FormAlert>}

      <CurriculumEditor
        slug={slug}
        curriculum={curriculum}
        onSaved={setCurriculum}
        onDirtyChange={onDirtyChange}
      />

      <CurriculumFormModal
        open={editing}
        slug={slug}
        curriculum={curriculum}
        onClose={() => setEditing(false)}
        onSaved={(updated) => {
          setEditing(false);
          // Chỉ cập nhật phần thông tin; bản đang sửa của chương + mục giữ nguyên.
          setCurriculum((current) =>
            current
              ? {
                  ...current,
                  name: updated.name,
                  description: updated.description,
                  updatedAt: updated.updatedAt,
                }
              : updated,
          );
        }}
      />
      <ConfirmDialog
        open={cloning}
        title={text.clone}
        message={text.cloneConfirm(curriculum.name)}
        confirmLabel={text.clone}
        loading={busy}
        onConfirm={() => void clone()}
        onCancel={() => setCloning(false)}
      />
    </div>
  );
}
