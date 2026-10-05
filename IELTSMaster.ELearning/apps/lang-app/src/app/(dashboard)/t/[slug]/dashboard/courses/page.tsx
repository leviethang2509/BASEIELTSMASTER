'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Archive,
  ArchiveRestore,
  Eye,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  CourseStatus,
  TENANT_MANAGER_ROLES,
  hasAnyRole,
  type CategoryItem,
  type CourseListItem,
  type Paginated,
} from '@lang/shared';
import { CategoryIcon } from '@/components/catalog/catalog-ui';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import { CourseFormModal } from '@/components/training/CourseFormModal';
import { CourseStatusBadge } from '@/components/training/training-ui';
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
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { formatNumber } from '@/lib/format';
import {
  courseDetailPath,
  deleteCourse,
  listCourses,
  updateCourse,
} from '@/lib/training-api';
import { useDebouncedValue } from '@/lib/use-debounced-value';

const PAGE_SIZE = 20;
const GRID =
  'sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_100px_90px_70px_110px_130px]';

type PendingAction = { kind: 'archive' | 'delete'; course: CourseListItem };

/** Danh sách khoá học: Owner/Admin quản lý, Teacher chỉ xem (B2). */
export default function TenantCoursesPage() {
  const router = useRouter();
  const { tenant, roles } = useTenantDashboard();
  const slug = tenant.slug;
  const canManage = hasAnyRole(roles, TENANT_MANAGER_ROLES);
  const text = vi.courses;

  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query.trim());
  const [status, setStatus] = useState<CourseStatus | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<CourseListItem> | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState<CourseListItem | 'new' | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => setPage(1), [q, status, categoryId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listCourses(slug, { page, pageSize: PAGE_SIZE, q, status, categoryId })
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
  }, [slug, page, q, status, categoryId, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    api.get<CategoryItem[]>(`/t/${slug}/categories`).then(
      (rows) => {
        if (!cancelled) setCategories(rows);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const reload = () => setReloadKey((key) => key + 1);

  async function run(
    course: CourseListItem,
    action: () => Promise<unknown>,
    done: string,
  ) {
    setBusyId(course.id);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(done);
      reload();
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusyId(null);
      setPending(null);
    }
  }

  function runPending() {
    if (!pending) return;
    const { kind, course } = pending;
    void (kind === 'archive'
      ? run(
          course,
          () =>
            updateCourse(slug, course.id, { status: CourseStatus.ARCHIVED }),
          text.archived(course.name),
        )
      : run(
          course,
          () => deleteCourse(slug, course.id),
          text.deleted(course.name),
        ));
  }

  function renderActions(row: CourseListItem) {
    const busy = busyId === row.id;
    return (
      <div className="flex items-center gap-1">
        <Link
          href={courseDetailPath(slug, row.id)}
          title={text.view}
          aria-label={text.view}
          className={iconButtonClass}
        >
          <Eye size={16} />
        </Link>
        {canManage && (
          <>
            <button
              type="button"
              title={text.edit}
              aria-label={text.edit}
              onClick={() => setEditing(row)}
              className={iconButtonClass}
            >
              <Pencil size={16} />
            </button>
            {row.status === CourseStatus.ACTIVE ? (
              <button
                type="button"
                title={text.archive}
                aria-label={text.archive}
                disabled={busy}
                onClick={() => setPending({ kind: 'archive', course: row })}
                className={iconButtonClass}
              >
                <Archive size={16} />
              </button>
            ) : (
              <button
                type="button"
                title={text.unarchive}
                aria-label={text.unarchive}
                disabled={busy}
                onClick={() =>
                  void run(
                    row,
                    () =>
                      updateCourse(slug, row.id, {
                        status: CourseStatus.ACTIVE,
                      }),
                    text.unarchived(row.name),
                  )
                }
                className={iconButtonClass}
              >
                <ArchiveRestore size={16} />
              </button>
            )}
            <button
              type="button"
              title={row.classCount > 0 ? text.deleteBlocked : text.delete}
              aria-label={text.delete}
              disabled={busy || row.classCount > 0}
              onClick={() => setPending({ kind: 'delete', course: row })}
              className={iconButtonClass}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    );
  }

  const columns: DataColumn<CourseListItem>[] = [
    {
      header: text.column,
      render: (row) => (
        <>
          <Link
            href={courseDetailPath(slug, row.id)}
            className="block truncate text-[14px] font-semibold text-[var(--heading)] hover:text-[var(--accent)]"
          >
            {row.name}
          </Link>
          <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-[var(--muted)]">
            <span className="font-mono">{row.code}</span>
            {row.category && (
              <>
                <span>·</span>
                <CategoryIcon
                  icon={row.category.icon}
                  color={row.category.color}
                  size={18}
                />
                <span className="truncate">{row.category.name}</span>
              </>
            )}
          </span>
        </>
      ),
    },
    {
      header: text.level,
      render: (row) => (
        <span className="block truncate text-[13px] text-[var(--body)]">
          {row.level ?? text.noValue}
        </span>
      ),
    },
    {
      header: text.plannedSessions,
      render: (row) => (
        <span className="text-[13px] text-[var(--body)]">
          {row.plannedSessions === null
            ? text.noValue
            : text.sessions(row.plannedSessions)}
        </span>
      ),
    },
    {
      header: text.curriculumCount,
      render: (row) => (
        <span className="text-[13px] text-[var(--body)]">
          {formatNumber(row.curriculumCount)}
        </span>
      ),
    },
    {
      header: text.classCount,
      render: (row) => (
        <span className="text-[13px] text-[var(--body)]">
          {formatNumber(row.classCount)}
        </span>
      ),
    },
    {
      header: vi.exams.statusColumn,
      render: (row) => <CourseStatusBadge status={row.status} />,
    },
    { header: vi.admin.actions, render: renderActions },
  ];

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-[13.5px] text-[var(--body)]">
          {text.subtitle}
        </p>
        {canManage && (
          <button
            type="button"
            onClick={() => setEditing('new')}
            className={compactPrimaryButtonClass}
          >
            <Plus size={16} /> {text.create}
          </button>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
        <SearchInput
          value={query}
          placeholder={text.searchPlaceholder}
          onChange={setQuery}
        />
        <SelectFilter
          value={status}
          allLabel={text.allStatuses}
          options={Object.values(CourseStatus).map((value) => ({
            value,
            label: text.status[value],
          }))}
          onChange={setStatus}
        />
        <SelectFilter
          value={categoryId}
          allLabel={vi.exams.allCategories}
          options={categories.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          onChange={setCategoryId}
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

      <CourseFormModal
        open={editing !== null}
        slug={slug}
        course={editing === 'new' ? null : editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onSaved={(course) => {
          const created = editing === 'new';
          setEditing(null);
          if (created) router.push(courseDetailPath(slug, course.id));
          else reload();
        }}
      />
      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === 'delete' ? text.delete : text.archive}
        message={
          pending
            ? pending.kind === 'delete'
              ? text.deleteConfirm(pending.course.name)
              : text.archiveConfirm(pending.course.name)
            : ''
        }
        confirmLabel={pending?.kind === 'delete' ? text.delete : text.archive}
        tone={pending?.kind === 'delete' ? 'danger' : 'default'}
        loading={busyId !== null}
        onConfirm={runPending}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
