'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Plus, Trash2 } from 'lucide-react';
import {
  ClassroomStatus,
  CourseStatus,
  TENANT_MANAGER_ROLES,
  hasAnyRole,
  type ClassroomListItem,
  type CourseListItem,
  type Paginated,
} from '@lang/shared';
import { ClassroomFormModal } from '@/components/classes/ClassroomFormModal';
import { ClassroomStatusBadge } from '@/components/classes/classes-ui';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
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
import {
  classDetailPath,
  deleteClassroom,
  listClassrooms,
} from '@/lib/classroom-api';
import { errorMessage } from '@/lib/error-message';
import { formatDate } from '@/lib/format';
import { listCourses } from '@/lib/training-api';
import { useDebouncedValue } from '@/lib/use-debounced-value';

const PAGE_SIZE = 20;
const GRID =
  'sm:grid-cols-[minmax(0,2fr)_130px_minmax(0,1.3fr)_90px_110px_90px]';

/** Danh sách lớp: Owner/Admin mọi lớp, Teacher lớp mình phụ trách (D11). */
export default function TenantClassesPage() {
  const router = useRouter();
  const { tenant, roles } = useTenantDashboard();
  const slug = tenant.slug;
  const canManage = hasAnyRole(roles, TENANT_MANAGER_ROLES);
  const text = vi.classes;

  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query.trim());
  const [status, setStatus] = useState<ClassroomStatus | ''>('');
  const [courseId, setCourseId] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<ClassroomListItem> | null>(null);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ClassroomListItem | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setPage(1), [q, status, courseId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listClassrooms(slug, { page, pageSize: PAGE_SIZE, q, status, courseId })
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
  }, [slug, page, q, status, courseId, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    listCourses(slug, { page: 1, pageSize: 100 }).then(
      (result) => {
        if (!cancelled) setCourses(result.items);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await deleteClassroom(slug, deleting.id);
      setNotice(text.deleted(deleting.name));
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  }

  const columns: DataColumn<ClassroomListItem>[] = [
    {
      header: text.column,
      render: (row) => (
        <>
          <Link
            href={classDetailPath(slug, row.id)}
            className="block truncate text-[14px] font-semibold text-[var(--heading)] hover:text-[var(--accent)]"
          >
            {row.name}
          </Link>
          <span className="block truncate text-[12.5px] text-[var(--muted)]">
            <span className="font-mono">{row.code}</span> · {row.course.name}
          </span>
        </>
      ),
    },
    {
      header: text.startDate,
      render: (row) => (
        <span className="text-[13px] text-[var(--body)]">
          {formatDate(row.startDate)}
          <span className="block text-[12px] text-[var(--muted)]">
            {text.sessions(row.plannedSessions)}
          </span>
        </span>
      ),
    },
    {
      header: text.teachers,
      render: (row) => (
        <span
          className={`block truncate text-[13px] ${
            row.teachers.length === 0
              ? 'text-[var(--warn-text)]'
              : 'text-[var(--body)]'
          }`}
        >
          {row.teachers.length === 0
            ? text.noTeacher
            : row.teachers.map((teacher) => teacher.fullName).join(', ')}
        </span>
      ),
    },
    {
      header: text.students,
      render: (row) => (
        <span className="text-[13px] text-[var(--body)]">
          {text.studentCount(row.studentCount, row.maxStudents)}
        </span>
      ),
    },
    {
      header: vi.exams.statusColumn,
      render: (row) => <ClassroomStatusBadge status={row.status} />,
    },
    {
      header: vi.admin.actions,
      render: (row) => (
        <div className="flex items-center gap-1">
          <Link
            href={classDetailPath(slug, row.id)}
            title={text.view}
            aria-label={text.view}
            className={iconButtonClass}
          >
            <Eye size={16} />
          </Link>
          {canManage && (
            <button
              type="button"
              title={text.delete}
              aria-label={text.delete}
              onClick={() => setDeleting(row)}
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
          {canManage ? text.subtitle : text.teacherSubtitle}
        </p>
        {canManage && (
          <button
            type="button"
            onClick={() => setCreating(true)}
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
          options={Object.values(ClassroomStatus).map((value) => ({
            value,
            label: text.status[value],
          }))}
          onChange={setStatus}
        />
        <SelectFilter
          value={courseId}
          allLabel={text.allCourses}
          options={courses.map((course) => ({
            value: course.id,
            label:
              course.status === CourseStatus.ACTIVE
                ? course.name
                : `${course.name} (${vi.courses.status.archived})`,
          }))}
          onChange={setCourseId}
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
        emptyText={canManage ? text.empty : text.emptyForTeacher}
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

      <ClassroomFormModal
        open={creating}
        slug={slug}
        classroom={null}
        defaultCourseId={courseId || undefined}
        onClose={() => setCreating(false)}
        onSaved={(classroom) => {
          setCreating(false);
          router.push(classDetailPath(slug, classroom.id));
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title={text.delete}
        message={deleting ? text.deleteConfirm(deleting.name) : ''}
        confirmLabel={text.delete}
        tone="danger"
        loading={busy}
        onConfirm={() => void remove()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
