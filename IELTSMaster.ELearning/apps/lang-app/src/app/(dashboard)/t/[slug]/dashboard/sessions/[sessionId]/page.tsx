'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  ListChecks,
  Pencil,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  ClassSessionKind,
  ClassSessionStatus,
  type ClassSessionDetail,
} from '@lang/shared';
import { ClassroomStatusBadge } from '@/components/classes/classes-ui';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import { SessionEditDialog } from '@/components/schedule/SessionEditDialog';
import { SessionLinksDialog } from '@/components/schedule/SessionLinksDialog';
import {
  formatSessionStart,
  formatSessionTime,
  isPast,
} from '@/components/schedule/schedule-format';
import {
  Badge,
  ConfirmDialog,
  FormAlert,
  PromptDialog,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { classDetailPath, classSchedulePath } from '@/lib/classroom-api';
import { errorMessage } from '@/lib/error-message';
import {
  cancelSession,
  deleteMakeupSession,
  getSessionDetail,
  restoreSession,
  schedulePagePath,
  updateSession,
} from '@/lib/schedule-api';
import { courseDetailPath } from '@/lib/training-api';

type Dialog = 'edit' | 'links' | 'cancel' | 'restore' | 'delete' | null;

/**
 * Chi tiết buổi học: giáo viên của lớp/Owner/Admin xem và thao tác; giáo viên
 * dạy thế chỉ xem buổi mình dạy (R14.3).
 */
export default function SessionDetailPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const router = useRouter();
  const { tenant } = useTenantDashboard();
  const slug = tenant.slug;
  const text = vi.schedule;
  const [session, setSession] = useState<ClassSessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    getSessionDetail(slug, params.sessionId).then(setSession, (err: unknown) =>
      setError(errorMessage(err, vi.common.loadFailed)),
    );
  }, [slug, params.sessionId]);

  useEffect(reload, [reload]);

  const afterChange = () => {
    setDialog(null);
    setNotice(text.done);
    setError(null);
    reload();
  };

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      afterChange();
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
      setDialog(null);
    } finally {
      setBusy(false);
    }
  }

  async function removeMakeup() {
    if (!session) return;
    setBusy(true);
    try {
      await deleteMakeupSession(slug, session.classroom.id, session.id);
      router.push(classSchedulePath(slug, session.classroom.id));
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
      setDialog(null);
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <div className="flex flex-col items-start gap-3 p-6">
        {error ? (
          <>
            <FormAlert tone="error">{error}</FormAlert>
            <Link
              href={schedulePagePath(slug)}
              className="text-[14px] text-[var(--accent)] underline"
            >
              {text.backToSchedule}
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

  const label = text.sessionLabel(session.seq);
  const classId = session.classroom.id;
  const cancelled = session.status === ClassSessionStatus.CANCELLED;
  const past = isPast(session);
  const makeup = session.kind === ClassSessionKind.MAKEUP;
  const names = (rows: { fullName: string }[]) =>
    rows.map((row) => row.fullName).join(', ');

  const info: [string, React.ReactNode][] = [
    [
      text.classroom,
      session.canOpenClass ? (
        <Link
          href={classDetailPath(slug, classId)}
          className="text-[var(--accent)] hover:underline"
        >
          {session.classroom.name} ({session.classroom.code})
        </Link>
      ) : (
        `${session.classroom.name} (${session.classroom.code})`
      ),
    ],
    [
      text.course,
      session.canOpenClass ? (
        <Link
          href={courseDetailPath(slug, session.classroom.course.id)}
          className="text-[var(--accent)] hover:underline"
        >
          {session.classroom.course.name}
        </Link>
      ) : (
        session.classroom.course.name
      ),
    ],
    [
      text.time,
      <>
        {formatSessionTime(session.startsAt, session.endsAt)}
        {session.timeOverridden && (
          <span className="ml-2 text-[12.5px] text-[var(--muted)]">
            ({text.timeOverridden})
          </span>
        )}
      </>,
    ],
    [
      text.location,
      session.location ??
        (session.classroom.location
          ? text.locationInherited(session.classroom.location)
          : text.noLocation),
    ],
    [
      text.teachers,
      <>
        {session.teachers.length === 0
          ? text.noTeacher
          : names(session.teachers)}
        <span className="ml-2 text-[12.5px] text-[var(--muted)]">
          ({session.customTeachers ? text.customTeachers : text.classTeachers})
        </span>
      </>,
    ],
    ...(session.makeupFor
      ? ([[text.makeupFor, text.sessionLabel(session.makeupFor.seq)]] as [
          string,
          React.ReactNode,
        ][])
      : []),
    [text.note, session.note ?? '—'],
  ];

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <Link
        href={
          session.canOpenClass
            ? classSchedulePath(slug, classId)
            : schedulePagePath(slug)
        }
        className="inline-flex w-fit items-center gap-1.5 text-[13px] text-[var(--muted)] hover:text-[var(--accent)]"
      >
        <ArrowLeft size={15} />{' '}
        {session.canOpenClass ? text.backToClass : text.backToSchedule}
      </Link>

      <header className="flex flex-wrap items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[20px] font-semibold text-[var(--heading)]">
              {text.detailTitle(label, session.classroom.name)}
            </h1>
            <ClassroomStatusBadge status={session.classroom.status} />
            {makeup && <Badge tone="accent">{text.makeup}</Badge>}
            {cancelled && <Badge>{text.cancelled}</Badge>}
            {past && !cancelled && <Badge>{text.past}</Badge>}
          </div>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            {formatSessionStart(session.startsAt)}
          </p>
        </div>
        {session.canEdit && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDialog('edit')}
              className={secondaryButtonClass}
            >
              <Pencil size={15} /> {text.actions.edit}
            </button>
            <button
              type="button"
              onClick={() => setDialog('links')}
              className={secondaryButtonClass}
            >
              <ListChecks size={15} /> {text.actions.links}
            </button>
            {!past && !cancelled && (
              <button
                type="button"
                onClick={() => setDialog('cancel')}
                className={secondaryButtonClass}
              >
                <Ban size={15} /> {text.actions.cancel}
              </button>
            )}
            {!past && cancelled && (
              <button
                type="button"
                onClick={() => setDialog('restore')}
                className={secondaryButtonClass}
              >
                <RotateCcw size={15} /> {text.actions.restore}
              </button>
            )}
            {!past && makeup && (
              <button
                type="button"
                onClick={() => setDialog('delete')}
                className={secondaryButtonClass}
              >
                <Trash2 size={15} /> {text.actions.deleteMakeup}
              </button>
            )}
          </div>
        )}
      </header>

      {!session.canOpenClass && (
        <FormAlert tone="info">{text.substituteHint}</FormAlert>
      )}
      {cancelled && (
        <FormAlert tone="warning">
          {text.cancelledNotice(session.cancelReason)}
          {session.links.length > 0 && ` ${text.cancelledContent}`}
        </FormAlert>
      )}
      {session.movedWarning && (
        <FormAlert tone="warning">
          <span className="flex flex-wrap items-center gap-2">
            {text.movedNotice}
            {session.canEdit && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    updateSession(slug, classId, session.id, {
                      dismissMovedWarning: true,
                    }),
                  )
                }
                className={secondaryButtonClass}
              >
                {text.movedDismiss}
              </button>
            )}
          </span>
        </FormAlert>
      )}
      {session.conflicts.length > 0 && (
        <div className="rounded-2xl border border-[var(--danger)] bg-[var(--danger-bg)] p-4 text-[14px] text-[var(--danger)]">
          <p className="mb-1 flex items-center gap-1.5 font-semibold">
            <AlertTriangle size={16} /> {text.conflictsTitle}
          </p>
          <ul className="list-disc pl-5">
            {session.conflicts.map((row) => (
              <li key={row.sessionId}>
                {text.conflictLine(
                  `${row.classroom.code}`,
                  text.sessionLabel(row.seq),
                  formatSessionTime(row.startsAt, row.endsAt),
                  row.people.join(', '),
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {notice && <FormAlert tone="success">{notice}</FormAlert>}
      {error && <FormAlert tone="error">{error}</FormAlert>}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
        <dl className="grid gap-x-6 gap-y-3 text-[14px] sm:grid-cols-[160px_minmax(0,1fr)]">
          {info.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-[var(--muted)]">{key}</dt>
              <dd className="whitespace-pre-line break-words text-[var(--heading)]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
          <h2 className="mb-2 text-[15px] font-semibold text-[var(--heading)]">
            {text.content}
          </h2>
          {session.links.length === 0 ? (
            <p className="text-[14px] text-[var(--muted)]">{text.noContent}</p>
          ) : (
            <ul className="list-disc pl-5 text-[14px] text-[var(--body)]">
              {session.links.map((row) => (
                <li
                  key={row.groupId ?? row.itemId}
                  className={row.groupId ? 'font-semibold' : ''}
                >
                  {row.title}
                  {row.groupId && (
                    <span className="ml-1 text-[12px] font-normal text-[var(--muted)]">
                      ({text.wholeGroup})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
          <h2 className="mb-2 text-[15px] font-semibold text-[var(--heading)]">
            {text.students} ({session.students.length})
          </h2>
          {session.students.length === 0 ? (
            <p className="text-[14px] text-[var(--muted)]">{text.noStudents}</p>
          ) : (
            <ul className="columns-1 text-[14px] text-[var(--body)] sm:columns-2">
              {session.students.map((row) => (
                <li key={row.membershipId}>{row.fullName}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[13px] text-[var(--muted)]">
            {vi.classes.teachers}:{' '}
            {session.classTeachers.length === 0
              ? vi.classes.noTeacher
              : names(session.classTeachers)}
          </p>
        </section>
      </div>

      <SessionEditDialog
        open={dialog === 'edit'}
        slug={slug}
        session={session}
        onClose={() => setDialog(null)}
        onSaved={afterChange}
      />
      <SessionLinksDialog
        open={dialog === 'links'}
        slug={slug}
        session={session}
        onClose={() => setDialog(null)}
        onSaved={afterChange}
      />
      <PromptDialog
        open={dialog === 'cancel'}
        title={text.cancelTitle}
        hint={text.cancelMessage(label)}
        label={text.cancelReason}
        required={false}
        confirmLabel={text.actions.cancel}
        onSubmit={(reason) =>
          void run(() =>
            cancelSession(slug, classId, session.id, {
              reason: reason.trim() || null,
            }),
          )
        }
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'restore'}
        title={text.actions.restore}
        message={text.restoreConfirm(label)}
        confirmLabel={text.actions.restore}
        loading={busy}
        onConfirm={() =>
          void run(() => restoreSession(slug, classId, session.id))
        }
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        title={text.actions.deleteMakeup}
        message={text.deleteMakeupConfirm}
        confirmLabel={text.actions.deleteMakeup}
        tone="danger"
        loading={busy}
        onConfirm={() => void removeMakeup()}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
