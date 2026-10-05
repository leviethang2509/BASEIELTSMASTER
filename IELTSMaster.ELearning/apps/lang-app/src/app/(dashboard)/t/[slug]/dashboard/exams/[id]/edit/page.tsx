'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ExamBlueprintItem, ExamDetail } from '@lang/shared';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import { ExamEditor } from '@/components/exam-editor/ExamEditor';
import {
  fromDraftSections,
  fromServerSections,
  snapshotOf,
  type EditorSection,
} from '@/components/exam-editor/editor-sections';
import {
  clearExamDraft,
  getExamDraft,
  type ExamDraft,
} from '@/components/exam-editor/exam-draft';
import { ConfirmDialog, FormAlert } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { examVersionsPath, getExam } from '@/lib/exam-api';
import { formatDateTime } from '@/lib/format';

interface Loaded {
  exam: ExamDetail;
  blueprints: ExamBlueprintItem[];
  serverSections: EditorSection[];
}

/** Trình soạn đề: đọc bản server, hỏi khôi phục bản nháp trình duyệt nếu mới hơn. */
export default function ExamEditPage({ params }: { params: { id: string } }) {
  const { tenant } = useTenantDashboard();
  const slug = tenant.slug;
  const text = vi.examEditor.restoreDraft;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [draft, setDraft] = useState<ExamDraft | null>(null);
  const [restored, setRestored] = useState<EditorSection[] | null | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getExam(slug, params.id),
      api.get<ExamBlueprintItem[]>(`/t/${slug}/exam-blueprints`),
    ]).then(
      ([exam, blueprints]) => {
        if (cancelled) return;
        const serverSections = fromServerSections(exam.sections);
        setLoaded({ exam, blueprints, serverSections });
        // Bản nháp chỉ còn khi lần sửa trước chưa lưu. So theo thời gian rồi
        // mới so nội dung; bản nháp cũ hơn bản server thì bỏ.
        const local = exam.canEdit ? getExamDraft(exam.id) : null;
        const newer =
          local !== null &&
          Date.parse(local.savedAt) > Date.parse(exam.contentSavedAt) &&
          snapshotOf(fromDraftSections(local.sections)) !==
            snapshotOf(serverSections);
        if (newer) {
          setDraft(local);
        } else {
          if (local) clearExamDraft(exam.id);
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

  const listHref = `/t/${slug}/dashboard/exams`;

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        <FormAlert tone="error">{error}</FormAlert>
        <Link
          href={listHref}
          className="text-[14px] text-[var(--accent)] underline"
        >
          {vi.examEditor.backToList}
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
                {draft.baseRevision !== loaded.exam.contentRevision && (
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
            setRestored(fromDraftSections(draft.sections));
            setDraft(null);
          }}
          onCancel={() => {
            clearExamDraft(params.id);
            setRestored(null);
            setDraft(null);
          }}
        />
      </div>
    );
  }

  return (
    <ExamEditor
      slug={slug}
      exam={loaded.exam}
      serverSections={loaded.serverSections}
      restoredSections={restored}
      blueprints={loaded.blueprints}
      listHref={listHref}
      versionsHref={examVersionsPath(slug, loaded.exam.id)}
    />
  );
}
