'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, RotateCcw } from 'lucide-react';
import type { LessonVersionItem, LessonVersionList } from '@lang/shared';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import type { PreviewSection } from '@/components/exam-editor/PreviewDialog';
import { ExamStatusBadge } from '@/components/exams/ExamStatusBadge';
import { LessonPreviewDialog } from '@/components/lesson-viewer/LessonPreviewDialog';
import { emptyValue, toEditorValue } from '@/components/plate/value';
import {
  Badge,
  ConfirmDialog,
  DataTable,
  FormAlert,
  iconButtonClass,
  secondaryButtonClass,
  type DataColumn,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { contentIssuesOf } from '@/lib/exam-api';
import {
  getLessonVersion,
  lessonEditPath,
  listLessonVersions,
  restoreLessonVersion,
} from '@/lib/lesson-api';
import { formatDateTime } from '@/lib/format';

const GRID =
  'sm:grid-cols-[120px_150px_minmax(0,1fr)_minmax(0,1.2fr)_90px_100px]';

const text = { ...vi.exams.versionsPage, ...vi.lessons.versionsPage };

/** Danh sách version của bài học: xem nội dung, khôi phục (Owner/Admin/tác giả). */
export default function LessonVersionsPage({
  params,
}: {
  params: { id: string };
}) {
  const { tenant } = useTenantDashboard();
  const slug = tenant.slug;
  const [data, setData] = useState<LessonVersionList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [preview, setPreview] = useState<PreviewSection[] | null>(null);
  const [restoring, setRestoring] = useState<LessonVersionItem | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listLessonVersions(slug, params.id)
      .then(
        (result) => {
          if (cancelled) return;
          setData(result);
        },
        (err: unknown) => {
          if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
        },
      )
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, params.id, reloadKey]);

  async function openPreview(item: LessonVersionItem) {
    setError(null);
    try {
      const detail = await getLessonVersion(slug, params.id, item.version);
      setPreview(
        detail.sections.map((section) => ({
          key: section.id,
          name: section.name,
          value: toEditorValue(section.rawData) ?? emptyValue(),
        })),
      );
    } catch (err) {
      setError(errorMessage(err, vi.common.loadFailed));
    }
  }

  async function confirmRestore() {
    if (!restoring || !data) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await restoreLessonVersion(
        slug,
        params.id,
        restoring.version,
        data.contentRevision,
      );
      setNotice(text.restored(restoring.version, result.currentVersion));
      setReloadKey((key) => key + 1);
    } catch (err) {
      const issues = contentIssuesOf(err);
      setError(
        [
          errorMessage(err, vi.exams.actionFailed),
          ...issues
            .filter((issue) => issue.severity === 'error')
            .map((issue) =>
              vi.examEditor.issueLine(issue.sectionName, issue.message),
            ),
        ].join(' · '),
      );
    } finally {
      setBusy(false);
      setRestoring(null);
    }
  }

  const canEdit = data?.lesson.canEdit ?? false;

  const columns: DataColumn<LessonVersionItem>[] = [
    {
      header: text.version,
      render: (row) => (
        <span className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-[var(--heading)]">
            v{row.version}
          </span>
          {row.isCurrent && <Badge tone="accent">{text.current}</Badge>}
        </span>
      ),
    },
    {
      header: text.savedAt,
      render: (row) => (
        <span className="text-[13px] text-[var(--body)]">
          {formatDateTime(row.savedAt)}
        </span>
      ),
    },
    {
      header: text.savedBy,
      render: (row) => (
        <span className="block truncate text-[13px] text-[var(--body)]">
          {row.savedBy?.fullName ?? vi.exams.noCreator}
        </span>
      ),
    },
    {
      header: vi.exams.content,
      render: (row) => (
        <span className="text-[13px] text-[var(--body)]">
          {vi.lessons.contentSummary(row.sectionCount)} ·{' '}
          {text.questions(row.questionCount)}
        </span>
      ),
    },
    {
      header: text.attempts,
      render: (row) => (
        <span className="text-[13px] text-[var(--body)]">
          {row.attemptCount}
        </span>
      ),
    },
    {
      header: vi.admin.actions,
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            title={text.view}
            aria-label={text.view}
            onClick={() => void openPreview(row)}
            className={iconButtonClass}
          >
            <Eye size={16} />
          </button>
          {canEdit && !row.isCurrent && (
            <button
              type="button"
              title={text.restore}
              aria-label={text.restore}
              onClick={() => setRestoring(row)}
              className={iconButtonClass}
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <Link
          href={lessonEditPath(slug, params.id)}
          className={secondaryButtonClass}
        >
          <ArrowLeft size={16} /> {text.back}
        </Link>
        {data && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="truncate text-[18px] font-bold text-[var(--heading)]">
              {data.lesson.title}
            </h1>
            <ExamStatusBadge status={data.lesson.status} />
          </div>
        )}
      </div>
      <p className="shrink-0 text-[13.5px] text-[var(--body)]">
        {text.subtitle}
      </p>

      {notice && <FormAlert tone="success">{notice}</FormAlert>}
      {error && <FormAlert tone="error">{error}</FormAlert>}

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(row) => String(row.version)}
        gridClass={GRID}
        loading={loading}
        emptyText={text.empty}
      />

      <LessonPreviewDialog
        open={preview !== null}
        sections={preview ?? []}
        onClose={() => setPreview(null)}
      />
      <ConfirmDialog
        open={restoring !== null}
        title={text.restore}
        message={
          restoring && data
            ? data.hasAttempts
              ? text.restoreAsNew(
                  restoring.version,
                  data.lesson.currentVersion + 1,
                )
              : text.restoreOverwrite(
                  restoring.version,
                  data.lesson.currentVersion,
                )
            : ''
        }
        confirmLabel={text.restore}
        loading={busy}
        onConfirm={() => void confirmRestore()}
        onCancel={() => setRestoring(null)}
      />
    </div>
  );
}
