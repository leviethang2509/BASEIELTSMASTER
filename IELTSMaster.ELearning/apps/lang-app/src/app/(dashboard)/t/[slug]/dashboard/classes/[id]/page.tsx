'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import {
  CLASSROOM_STATUS_TRANSITIONS,
  ClassroomStatus,
  isClassroomClosed,
  type ClassCurriculum,
  type ClassroomDetail,
} from '@lang/shared';
import { ClassAttendancePanel } from '@/components/classes/ClassAttendancePanel';
import { ClassCurriculumEditor } from '@/components/classes/ClassCurriculumEditor';
import { ClassGradebookPanel } from '@/components/classes/ClassGradebookPanel';
import { ClassLogList } from '@/components/classes/ClassLogList';
import { ClassMembersPanel } from '@/components/classes/ClassMembersPanel';
import { ClassSchedulePanel } from '@/components/classes/ClassSchedulePanel';
import { ClassroomFormModal } from '@/components/classes/ClassroomFormModal';
import { ClassroomStatusBadge } from '@/components/classes/classes-ui';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import {
  ConfirmDialog,
  FormAlert,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import {
  changeClassroomStatus,
  classListPath,
  deleteClassroom,
  getClassCurriculum,
  getClassroom,
} from '@/lib/classroom-api';
import { errorMessage } from '@/lib/error-message';
import { formatDate, formatDateTime } from '@/lib/format';
import { courseDetailPath, curriculumDetailPath } from '@/lib/training-api';

type Tab =
  | 'info'
  | 'schedule'
  | 'members'
  | 'curriculum'
  | 'progress'
  | 'gradebook'
  | 'logs';
const TABS: Tab[] = [
  'info',
  'schedule',
  'members',
  'curriculum',
  'progress',
  'gradebook',
  'logs',
];

/**
 * Trang lớp: Thông tin · Thời khoá biểu · Giáo viên & Học viên · Giáo trình ·
 * Tiến độ & Chuyên cần · Bảng điểm · Nhật ký. `?tab=` mở sẵn một tab (vd. quay
 * lại từ trang buổi học).
 */
export default function ClassDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const router = useRouter();
  const { tenant } = useTenantDashboard();
  const slug = tenant.slug;
  const text = vi.classes;

  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [curriculum, setCurriculum] = useState<ClassCurriculum | null>(null);
  const [tab, setTab] = useState<Tab>(
    TABS.includes(searchParams.tab as Tab) ? (searchParams.tab as Tab) : 'info',
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState<ClassroomStatus | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [logKey, setLogKey] = useState(0);

  const reload = useCallback(() => {
    getClassroom(slug, params.id).then(setClassroom, (err: unknown) =>
      setError(errorMessage(err, vi.common.loadFailed)),
    );
  }, [slug, params.id]);

  useEffect(reload, [reload]);

  // Giáo trình tải lại khi mở tab (trạng thái lớp có thể vừa đổi).
  useEffect(() => {
    if (tab !== 'curriculum') return;
    let cancelled = false;
    setCurriculum(null);
    getClassCurriculum(slug, params.id).then(
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
  }, [slug, params.id, tab, classroom?.status]);

  // Cảnh báo khi rời trang lúc giáo trình lớp chưa lưu.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const onDirtyChange = useCallback((value: boolean) => setDirty(value), []);

  function switchTab(next: Tab) {
    if (next === tab) return;
    if (dirty && !window.confirm(text.curriculum.leaveConfirm)) return;
    setDirty(false);
    setTab(next);
  }

  async function changeStatus() {
    if (!classroom || !target) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await changeClassroomStatus(slug, classroom.id, target);
      setClassroom(updated);
      setNotice(text.statusActions.done(text.status[updated.status]));
      setLogKey((key) => key + 1);
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusy(false);
      setTarget(null);
    }
  }

  async function remove() {
    if (!classroom) return;
    setBusy(true);
    setError(null);
    try {
      await deleteClassroom(slug, classroom.id);
      router.push(classListPath(slug));
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
      setBusy(false);
      setDeleting(false);
    }
  }

  if (!classroom) {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        {error ? (
          <>
            <FormAlert tone="error">{error}</FormAlert>
            <Link
              href={classListPath(slug)}
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

  const closed = isClassroomClosed(classroom.status);
  const transitions = CLASSROOM_STATUS_TRANSITIONS[classroom.status];
  const statusLabel = (status: ClassroomStatus) =>
    classroom.status === ClassroomStatus.FINISHED &&
    status === ClassroomStatus.ONGOING
      ? text.statusActions.reopen
      : text.statusActions.to[status];

  const info: [string, React.ReactNode][] = [
    [text.form.code, <span className="font-mono">{classroom.code}</span>],
    [
      text.course,
      <Link
        href={courseDetailPath(slug, classroom.course.id)}
        className="text-[var(--accent)] hover:underline"
      >
        {classroom.course.name} ({classroom.course.code})
      </Link>,
    ],
    [text.form.startDate, formatDate(classroom.startDate)],
    [text.form.plannedSessions, text.sessions(classroom.plannedSessions)],
    [
      text.endDate,
      classroom.endDate ? formatDate(classroom.endDate) : text.endDatePending,
    ],
    [
      text.form.maxStudents,
      classroom.maxStudents === null
        ? text.unlimited
        : text.studentCount(classroom.studentCount, classroom.maxStudents),
    ],
    [text.form.location, classroom.location ?? text.noValue],
    [
      text.sourceCurriculum,
      classroom.sourceCurriculum ? (
        <Link
          href={curriculumDetailPath(slug, classroom.sourceCurriculum.id)}
          className="text-[var(--accent)] hover:underline"
        >
          {classroom.sourceCurriculum.name}
        </Link>
      ) : (
        text.noSourceCurriculum
      ),
    ],
    [
      text.teachers,
      classroom.teachers.length === 0
        ? text.noTeacher
        : classroom.teachers.map((row) => row.fullName).join(', '),
    ],
    [text.form.description, classroom.description ?? text.noValue],
    [vi.exams.updatedAt, formatDateTime(classroom.updatedAt)],
  ];

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <Link
        href={classListPath(slug)}
        className="inline-flex w-fit items-center gap-1.5 text-[13px] text-[var(--muted)] hover:text-[var(--accent)]"
      >
        <ArrowLeft size={15} /> {text.backToList}
      </Link>

      <header className="flex flex-wrap items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[20px] font-semibold text-[var(--heading)]">
              {classroom.name}
            </h1>
            <ClassroomStatusBadge status={classroom.status} />
          </div>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            <span className="font-mono">{classroom.code}</span> ·{' '}
            {classroom.course.name} · {formatDate(classroom.startDate)} ·{' '}
            {text.studentCount(classroom.studentCount, classroom.maxStudents)}{' '}
            {text.students.toLowerCase()}
          </p>
        </div>
        {classroom.canManage && (
          <div className="flex flex-wrap gap-2">
            {transitions.map((status) => (
              <button
                key={status}
                type="button"
                disabled={busy}
                onClick={() => setTarget(status)}
                className={secondaryButtonClass}
              >
                {statusLabel(status)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={secondaryButtonClass}
            >
              <Pencil size={15} /> {text.edit}
            </button>
            <button
              type="button"
              disabled={classroom.hasActivity}
              title={classroom.hasActivity ? text.deleteBlocked : undefined}
              onClick={() => setDeleting(true)}
              className={secondaryButtonClass}
            >
              <Trash2 size={15} /> {text.delete}
            </button>
          </div>
        )}
      </header>

      {closed && <FormAlert tone="info">{text.closedHint}</FormAlert>}
      {!closed && classroom.teachers.length === 0 && (
        <FormAlert tone="warning">{text.noTeacherWarning}</FormAlert>
      )}

      <nav className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => switchTab(value)}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-[14px] font-medium transition ${
              tab === value
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--heading)]'
            }`}
          >
            {text.tabs[value]}
          </button>
        ))}
      </nav>

      {notice && <FormAlert tone="success">{notice}</FormAlert>}
      {error && <FormAlert tone="error">{error}</FormAlert>}

      {tab === 'info' && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
          {!classroom.canManage && (
            <p className="mb-4 text-[13px] text-[var(--muted)]">
              {text.readOnlyHint}
            </p>
          )}
          <dl className="grid gap-x-6 gap-y-3 text-[14px] sm:grid-cols-[180px_minmax(0,1fr)]">
            {info.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-[var(--muted)]">{label}</dt>
                <dd className="whitespace-pre-line text-[var(--heading)]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {tab === 'schedule' && (
        <ClassSchedulePanel
          slug={slug}
          classroom={classroom}
          onChanged={() => {
            reload();
            setLogKey((key) => key + 1);
          }}
        />
      )}
      {tab === 'members' && (
        <ClassMembersPanel
          slug={slug}
          classroom={classroom}
          onChanged={() => {
            reload();
            setLogKey((key) => key + 1);
          }}
        />
      )}
      {tab === 'curriculum' &&
        (curriculum ? (
          <ClassCurriculumEditor
            slug={slug}
            classroomId={classroom.id}
            courseId={classroom.course.id}
            curriculum={curriculum}
            onSaved={() => setLogKey((key) => key + 1)}
            onDirtyChange={onDirtyChange}
          />
        ) : (
          <span className="text-[14px] text-[var(--muted)]">
            {vi.common.loading}
          </span>
        ))}
      {tab === 'progress' && (
        <ClassAttendancePanel
          slug={slug}
          classroom={classroom}
          onParamsSaved={() => {
            reload();
            setLogKey((key) => key + 1);
          }}
        />
      )}
      {tab === 'gradebook' && (
        <ClassGradebookPanel
          slug={slug}
          classroom={classroom}
          onCommentSaved={() => setLogKey((key) => key + 1)}
        />
      )}
      {tab === 'logs' && (
        <ClassLogList
          slug={slug}
          classroomId={classroom.id}
          reloadKey={logKey}
        />
      )}

      <ClassroomFormModal
        open={editing}
        slug={slug}
        classroom={classroom}
        onClose={() => setEditing(false)}
        onSaved={(updated) => {
          setEditing(false);
          setClassroom(updated);
          setLogKey((key) => key + 1);
        }}
      />
      <ConfirmDialog
        open={target !== null}
        title={text.statusActions.title}
        message={
          target ? (
            <>
              <p>{text.statusActions.confirm[target](classroom.name)}</p>
              {isClassroomClosed(target) &&
                classroom.inProgressAttemptCount > 0 && (
                  <p className="mt-2 font-medium text-[var(--danger)]">
                    {text.statusActions.inProgress(
                      classroom.inProgressAttemptCount,
                    )}
                  </p>
                )}
            </>
          ) : (
            ''
          )
        }
        confirmLabel={target ? statusLabel(target) : ''}
        tone={target && isClassroomClosed(target) ? 'danger' : 'default'}
        loading={busy}
        onConfirm={() => void changeStatus()}
        onCancel={() => setTarget(null)}
      />
      <ConfirmDialog
        open={deleting}
        title={text.delete}
        message={text.deleteConfirm(classroom.name)}
        confirmLabel={text.delete}
        tone="danger"
        loading={busy}
        onConfirm={() => void remove()}
        onCancel={() => setDeleting(false)}
      />
    </div>
  );
}
