'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LessonBlueprintItem, LessonDetail } from '@lang/shared';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import { LessonEditor } from '@/components/lesson-editor/LessonEditor';
import {
  clearLessonDraft,
  getLessonDraft,
  type LessonDraft,
} from '@/components/lesson-editor/lesson-draft';
import {
  fromLessonDraftSections,
  fromServerLessonSections,
  lessonSnapshotOf,
  type LessonEditorSection,
} from '@/components/lesson-editor/lesson-sections';
import { ConfirmDialog, FormAlert } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import {
  getLesson,
  lessonListPath,
  lessonVersionsPath,
} from '@/lib/lesson-api';
import { formatDateTime } from '@/lib/format';

interface Loaded {
  lesson: LessonDetail;
  blueprints: LessonBlueprintItem[];
  serverSections: LessonEditorSection[];
}

/** Trình soạn bài học: đọc bản server, hỏi khôi phục bản nháp trình duyệt nếu mới hơn. */
export default function LessonEditPage({ params }: { params: { id: string } }) {
  const { tenant } = useTenantDashboard();
  const slug = tenant.slug;
  const text = vi.examEditor.restoreDraft;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [draft, setDraft] = useState<LessonDraft | null>(null);
  const [restored, setRestored] = useState<
    LessonEditorSection[] | null | undefined
  >(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getLesson(slug, params.id),
      api.get<LessonBlueprintItem[]>(`/t/${slug}/lesson-blueprints`),
    ]).then(
      ([lesson, blueprints]) => {
        if (cancelled) return;
        const serverSections = fromServerLessonSections(lesson.sections);
        setLoaded({ lesson, blueprints, serverSections });
        // Bản nháp chỉ còn khi lần sửa trước chưa lưu. So theo thời gian rồi
        // mới so nội dung; bản nháp cũ hơn bản server thì bỏ.
        const local = lesson.canEdit ? getLessonDraft(lesson.id) : null;
        const newer =
          local !== null &&
          Date.parse(local.savedAt) > Date.parse(lesson.contentSavedAt) &&
          lessonSnapshotOf(fromLessonDraftSections(local.sections)) !==
            lessonSnapshotOf(serverSections);
        if (newer) {
          setDraft(local);
        } else {
          if (local) clearLessonDraft(lesson.id);
          setRestored(null);
        }
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, params.id]);

  const listHref = lessonListPath(slug);

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        <FormAlert tone="error">{error}</FormAlert>
        <Link
          href={listHref}
          className="text-[14px] text-[var(--accent)] underline"
        >
          {vi.lessonEditor.backToList}
        </Link>
      </div>
    );
  }

  if (!loaded || restored === undefined) {
    return (
      <div className="grid h-full place-items-center text-[14px] text-[var(--muted)]">
        {vi.common.loading}
        <ConfirmDialog
          open={draft !== null && loaded !== null}
          title={text.title}
          message={
            draft && loaded ? (
              <>
                <p>{text.message(formatDateTime(draft.savedAt))}</p>
                {draft.baseRevision !== loaded.lesson.contentRevision && (
                  <p className="mt-2 text-[var(--warn-text)]">
                    {text.staleNote}
                  </p>
                )}
              </>
            ) : (
              ''
            )
          }
          confirmLabel={text.confirm}
          cancelLabel={text.discard}
          onConfirm={() => {
            if (!draft) return;
            setRestored(fromLessonDraftSections(draft.sections));
            setDraft(null);
          }}
          onCancel={() => {
            clearLessonDraft(params.id);
            setRestored(null);
            setDraft(null);
          }}
        />
      </div>
    );
  }

  return (
    <LessonEditor
      slug={slug}
      lesson={loaded.lesson}
      serverSections={loaded.serverSections}
      restoredSections={restored}
      blueprints={loaded.blueprints}
      listHref={listHref}
      versionsHref={lessonVersionsPath(slug, loaded.lesson.id)}
    />
  );
}
