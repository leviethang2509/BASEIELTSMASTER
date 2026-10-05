'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import type {
  CourseListItem,
  CurriculumListItem,
  ExamUserRef,
  Paginated,
} from '@lang/shared';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import { CurriculumFormModal } from '@/components/training/CurriculumFormModal';
import { CourseChips } from '@/components/training/training-ui';
import {
  ConfirmDialog,
  DataTable,
  FormAlert,
  Pagination,
  SearchInput,
  SelectFilter,
  compactPrimaryButtonClass,
  iconButtonClass,
  type DataColumn,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { formatDateTime } from '@/lib/format';
import {
  cloneCurriculum,
  curriculumDetailPath,
  deleteCurriculum,
  listCourses,
  listCurricula,
  listCurriculumCreators,
} from '@/lib/training-api';
import { useDebouncedValue } from '@/lib/use-debounced-value';

const PAGE_SIZE = 20;
const GRID =
  'sm:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_120px_minmax(0,1fr)_130px_120px]';

type PendingAction = {
  kind: 'clone' | 'delete';
  curriculum: CurriculumListItem;
};

/** Thư viện giáo trình tham khảo (Owner/Admin/Teacher, C6). */
export default function TenantCurriculaPage() {
  const router = useRouter();
  const { tenant } = useTenantDashboard();
  const slug = tenant.slug;
  const text = vi.curricula;

  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query.trim());
  const [courseId, setCourseId] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<CurriculumListItem> | null>(null);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [creators, setCreators] = useState<ExamUserRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setPage(1), [q, courseId, createdBy]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listCurricula(slug, { page, pageSize: PAGE_SIZE, q, courseId, createdBy })
      .then(
        (result) => {
          if (cancelled) return;
          setData(result);
          setError(null);
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
  }, [slug, page, q, courseId, createdBy, reloadKey]);

  // Bộ lọc khoá học và người tạo.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listCourses(slug, { page: 1, pageSize: 100 }),
      listCurriculumCreators(slug),
    ]).then(
      ([courseRows, creatorRows]) => {
        if (cancelled) return;
        setCourses(courseRows.items);
        setCreators(creatorRows);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [slug, reloadKey]);

  async function runPending() {
    if (!pending) return;
    const { kind, curriculum } = pending;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (kind === 'clone') {
        const copy = await cloneCurriculum(slug, curriculum.id);
        // Bản sao là giáo trình của mình: mở luôn để sửa.
        router.push(curriculumDetailPath(slug, copy.id));
      } else {
        await deleteCurriculum(slug, curriculum.id);
        setNotice(text.deleted(curriculum.name));
        setReloadKey((key) => key + 1);
      }
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  const columns: DataColumn<CurriculumListItem>[] = [
    {
      header: text.column,
      render: (row) => (
        <>
          <Link
            href={curriculumDetailPath(slug, row.id)}
            className="block truncate text-[14px] font-semibold text-[var(--heading)] hover:text-[var(--accent)]"
          >
            {row.name}
          </Link>
          {row.description && (
            <span className="block truncate text-[12.5px] text-[var(--muted)]">
              {row.description}
            </span>
          )}
          {row.clonedFrom && (
            <span className="block truncate text-[12px] text-[var(--muted)]">
              {text.clonedFrom(row.clonedFrom.name)}
            </span>
          )}
        </>
      ),
    },
    {
      header: text.courses,
      render: (row) => <CourseChips slug={slug} courses={row.courses} />,
    },
    {
      header: text.content,
      render: (row) => (
        <span className="text-[13px] text-[var(--body)]">
          {text.summary(row.groupCount, row.itemCount)}
        </span>
      ),
    },
    {
      header: vi.exams.creator,
      render: (row) => (
        <span className="block truncate text-[13px] text-[var(--body)]">
          {row.creator?.fullName ?? vi.exams.noCreator}
        </span>
      ),
    },
    {
      header: vi.exams.updatedAt,
      render: (row) => (
        <span className="text-[13px] text-[var(--body)]">
          {formatDateTime(row.updatedAt)}
        </span>
      ),
    },
    {
      header: vi.admin.actions,
      render: (row) => (
        <div className="flex items-center gap-1">
          <Link
            href={curriculumDetailPath(slug, row.id)}
            title={text.open}
            aria-label={text.open}
            className={iconButtonClass}
          >
            {row.canEdit ? <Pencil size={16} /> : <Eye size={16} />}
          </Link>
          <button
            type="button"
            title={text.clone}
            aria-label={text.clone}
            disabled={busy}
            onClick={() => setPending({ kind: 'clone', curriculum: row })}
            className={iconButtonClass}
          >
            <Copy size={16} />
          </button>
          {row.canEdit && (
            <button
              type="button"
              title={text.delete}
              aria-label={text.delete}
              disabled={busy}
              onClick={() => setPending({ kind: 'delete', curriculum: row })}
              className={iconButtonClass}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-[13.5px] text-[var(--body)]">
          {text.subtitle}
        </p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={compactPrimaryButtonClass}
        >
          <Plus size={16} /> {text.create}
        </button>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
        <SearchInput
          value={query}
          placeholder={text.searchPlaceholder}
          onChange={setQuery}
        />
        <SelectFilter
          value={courseId}
          allLabel={text.allCourses}
          options={courses.map((course) => ({
            value: course.id,
            label: `${course.code} · ${course.name}`,
          }))}
          onChange={setCourseId}
        />
        <SelectFilter
          value={createdBy}
          allLabel={vi.exams.allCreators}
          options={creators.map((creator) => ({
            value: creator.id,
            label: creator.fullName,
          }))}
          onChange={setCreatedBy}
        />
      </div>

      {notice && <FormAlert tone="success">{notice}</FormAlert>}
      {error && <FormAlert tone="error">{error}</FormAlert>}

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(row) => row.id}
        gridClass={GRID}
        loading={loading}
        emptyText={text.empty}
        footer={
          data && data.total > 0 ? (
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onChange={setPage}
            />
          ) : null
        }
      />

      <CurriculumFormModal
        open={creating}
        slug={slug}
        curriculum={null}
        onClose={() => setCreating(false)}
        onSaved={(curriculum) => {
          setCreating(false);
          router.push(curriculumDetailPath(slug, curriculum.id));
        }}
      />
      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === 'delete' ? text.delete : text.clone}
        message={
          pending
            ? pending.kind === 'delete'
              ? text.deleteConfirm(pending.curriculum.name)
              : text.cloneConfirm(pending.curriculum.name)
            : ''
        }
        confirmLabel={pending?.kind === 'delete' ? text.delete : text.clone}
        tone={pending?.kind === 'delete' ? 'danger' : 'default'}
        loading={busy}
        onConfirm={() => void runPending()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
