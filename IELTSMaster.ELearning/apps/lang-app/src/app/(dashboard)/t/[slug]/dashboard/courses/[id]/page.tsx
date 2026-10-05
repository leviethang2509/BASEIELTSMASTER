'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Link2, Pencil, Unlink } from 'lucide-react';
import {
  TENANT_MANAGER_ROLES,
  hasAnyRole,
  type CategoryItem,
  type CourseDetail,
  type CurriculumListItem,
} from '@lang/shared';
import { CategoryIcon } from '@/components/catalog/catalog-ui';
import { CalendarFeedView } from '@/components/calendar/CalendarFeedView';
import { CourseClassesPanel } from '@/components/classes/CourseClassesPanel';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import { CourseFormModal } from '@/components/training/CourseFormModal';
import { CourseStatusBadge } from '@/components/training/training-ui';
import {
  ConfirmDialog,
  FormAlert,
  compactPrimaryButtonClass,
  iconButtonClass,
  inputClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { getCourseSchedule } from '@/lib/schedule-api';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { formatDateTime } from '@/lib/format';
import {
  attachCurriculum,
  courseListPath,
  curriculumDetailPath,
  detachCurriculum,
  getCourse,
  listCurricula,
} from '@/lib/training-api';

type Tab = 'info' | 'curricula' | 'classes' | 'schedule';

/** Chi tiết khoá học: Thông tin · Giáo trình tham khảo · Lớp (Lịch ở Step 8). */
export default function CourseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { tenant, roles } = useTenantDashboard();
  const slug = tenant.slug;
  const canManage = hasAnyRole(roles, TENANT_MANAGER_ROLES);
  const text = vi.courses;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [tab, setTab] = useState<Tab>('info');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [library, setLibrary] = useState<CurriculumListItem[]>([]);
  const [choice, setChoice] = useState('');
  const [busy, setBusy] = useState(false);
  const [detaching, setDetaching] = useState<CurriculumListItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCourse(slug, params.id).then(
      (result) => {
        if (!cancelled) setCourse(result);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, params.id]);

  // Thư viện giáo trình (để gắn) và danh mục (form sửa): chỉ Owner/Admin cần.
  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    Promise.all([
      listCurricula(slug, { page: 1, pageSize: 100 }),
      api.get<CategoryItem[]>(`/t/${slug}/categories`),
    ]).then(
      ([curricula, categoryRows]) => {
        if (cancelled) return;
        setLibrary(curricula.items);
        setCategories(categoryRows);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [slug, canManage]);

  async function run(action: () => Promise<CourseDetail | void>, done: string) {
    if (!course) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await action();
      setCourse(updated ?? (await getCourse(slug, course.id)));
      setNotice(done);
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusy(false);
    }
  }

  if (!course) {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        {error ? (
          <>
            <FormAlert tone="error">{error}</FormAlert>
            <Link
              href={courseListPath(slug)}
              className="text-[14px] text-[var(--accent)] underline"
            >
              {text.backToList}
            </Link>
          </>
        ) : (
          <span className="text-[14px] text-[var(--muted)]">
            {vi.common.loading}
          </span>
        )}
      </div>
    );
  }

  const attachedIds = new Set(course.curricula.map((row) => row.id));
  const attachable = library.filter((row) => !attachedIds.has(row.id));

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <Link
        href={courseListPath(slug)}
        className="inline-flex w-fit items-center gap-1.5 text-[13px] text-[var(--muted)] hover:text-[var(--accent)]"
      >
        <ArrowLeft size={15} /> {text.backToList}
      </Link>

      <header className="flex flex-wrap items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
        {course.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- ảnh từ R2/URL ngoài
          <img
            src={course.coverUrl}
            alt=""
            className="h-24 w-40 shrink-0 rounded-xl border border-[var(--border)] object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[20px] font-semibold text-[var(--heading)]">
              {course.name}
            </h1>
            <CourseStatusBadge status={course.status} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--muted)]">
            <span className="font-mono">{course.code}</span>
            {course.category && (
              <>
                <span>·</span>
                <CategoryIcon
                  icon={course.category.icon}
                  color={course.category.color}
                  size={18}
                />
                {course.category.name}
              </>
            )}
            {course.level && <span>· {course.level}</span>}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={secondaryButtonClass}
          >
            <Pencil size={15} /> {text.edit}
          </button>
        )}
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
        {(['info', 'curricula', 'classes', 'schedule'] as const).map(
          (value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-[14px] font-medium transition ${
                tab === value
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--heading)]'
              }`}
            >
              {text.tabs[value]}
              {value === 'curricula' && ` (${course.curricula.length})`}
              {value === 'classes' && ` (${course.classCount})`}
            </button>
          ),
        )}
      </nav>

      {notice && <FormAlert tone="success">{notice}</FormAlert>}
      {error && <FormAlert tone="error">{error}</FormAlert>}

      {tab === 'schedule' ? (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-[var(--muted)]">
            {vi.schedule.courseTabHint}
          </p>
          <CalendarFeedView
            slug={slug}
            load={(range) => getCourseSchedule(slug, course.id, range)}
            reloadKey={course.id}
          />
        </div>
      ) : tab === 'classes' ? (
        <CourseClassesPanel slug={slug} course={course} canManage={canManage} />
      ) : tab === 'info' ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
          {!canManage && (
            <p className="mb-4 text-[13px] text-[var(--muted)]">
              {text.readOnlyHint}
            </p>
          )}
          <dl className="grid gap-x-6 gap-y-3 text-[14px] sm:grid-cols-[180px_minmax(0,1fr)]">
            <dt className="text-[var(--muted)]">{text.form.code}</dt>
            <dd className="font-mono text-[var(--heading)]">{course.code}</dd>
            <dt className="text-[var(--muted)]">{text.form.category}</dt>
            <dd className="text-[var(--heading)]">
              {course.category?.name ?? text.noCategory}
            </dd>
            <dt className="text-[var(--muted)]">{text.level}</dt>
            <dd className="text-[var(--heading)]">
              {course.level ?? text.noValue}
            </dd>
            <dt className="text-[var(--muted)]">{text.plannedSessions}</dt>
            <dd className="text-[var(--heading)]">
              {course.plannedSessions === null
                ? text.noValue
                : text.sessions(course.plannedSessions)}
            </dd>
            <dt className="text-[var(--muted)]">{text.form.description}</dt>
            <dd className="whitespace-pre-line text-[var(--heading)]">
              {course.description ?? text.noValue}
            </dd>
            <dt className="text-[var(--muted)]">{vi.exams.updatedAt}</dt>
            <dd className="text-[var(--heading)]">
              {formatDateTime(course.updatedAt)}
            </dd>
          </dl>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <p className="max-w-3xl text-[13.5px] text-[var(--body)]">
            {text.curriculaHint}
          </p>
          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={choice}
                disabled={attachable.length === 0}
                onChange={(event) => setChoice(event.target.value)}
                className={`${inputClass} max-w-md py-2 text-[14px]`}
              >
                <option value="">
                  {attachable.length === 0
                    ? text.noCurriculumToAttach
                    : text.attachPlaceholder}
                </option>
                {attachable.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!choice || busy}
                onClick={() => {
                  const picked = library.find((row) => row.id === choice);
                  void run(
                    () => attachCurriculum(slug, course.id, choice),
                    text.attached(picked?.name ?? ''),
                  ).then(() => setChoice(''));
                }}
                className={compactPrimaryButtonClass}
              >
                <Link2 size={16} /> {text.attach}
              </button>
            </div>
          )}

          {course.curricula.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--border-strong)] p-6 text-center text-[14px] text-[var(--muted)]">
              {text.noCurricula}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {course.curricula.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={curriculumDetailPath(slug, row.id)}
                      className="block truncate text-[14px] font-semibold text-[var(--heading)] hover:text-[var(--accent)]"
                    >
                      {row.name}
                    </Link>
                    <span className="block truncate text-[12.5px] text-[var(--muted)]">
                      {vi.curricula.summary(row.groupCount, row.itemCount)}
                      {row.creator && ` · ${row.creator.fullName}`}
                    </span>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      title={text.detach}
                      aria-label={text.detach}
                      disabled={busy}
                      onClick={() => setDetaching(row)}
                      className={iconButtonClass}
                    >
                      <Unlink size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <CourseFormModal
        open={editing}
        slug={slug}
        course={course}
        categories={categories}
        onClose={() => setEditing(false)}
        onSaved={(updated) => {
          setEditing(false);
          setCourse(updated);
        }}
      />
      <ConfirmDialog
        open={detaching !== null}
        title={text.detach}
        message={detaching ? text.detachConfirm(detaching.name) : ''}
        confirmLabel={text.detach}
        loading={busy}
        onConfirm={() => {
          if (!detaching) return;
          const target = detaching;
          void run(
            () => detachCurriculum(slug, course.id, target.id),
            text.detached(target.name),
          ).then(() => setDetaching(null));
        }}
        onCancel={() => setDetaching(null)}
      />
    </div>
  );
}
