'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarDays,
  List,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  COURSE_MAX_PLANNED_SESSIONS,
  ClassSessionStatus,
  SCHEDULE_MAX_SLOTS,
  compareSlots,
  trainingDateOf,
  type ClassScheduleView,
  type ClassroomDetail,
  type SaveClassScheduleInput,
  type ScheduleChangeSummary,
  type ScheduleSlot,
} from '@lang/shared';
import { CalendarView } from '@/components/calendar/CalendarView';
import {
  todayDate,
  type CalendarViewMode,
} from '@/components/calendar/calendar-model';
import { MakeupDialog } from '@/components/schedule/MakeupDialog';
import {
  classSessionEvent,
  formatSessionStart,
  formatSessionTime,
  formatSlot,
  isPast,
} from '@/components/schedule/schedule-format';
import {
  Badge,
  FormAlert,
  Modal,
  compactPrimaryButtonClass,
  iconButtonClass,
  inputClass,
  labelClass,
  labelTextClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { formatDate } from '@/lib/format';
import {
  getClassSchedule,
  previewClassSchedule,
  saveClassSchedule,
  sessionDetailPath,
} from '@/lib/schedule-api';

const DEFAULT_SLOT: ScheduleSlot = {
  weekday: 1,
  startTime: '18:00',
  endTime: '19:30',
};

/**
 * Tab "Thời khoá biểu" (U1–U3, V1): lịch lặp (Owner/Admin sửa, xem trước rồi
 * xác nhận), danh sách/lịch các buổi, thêm buổi bù (giáo viên của lớp +
 * Owner/Admin). Chi tiết và thao tác trên từng buổi ở trang buổi học.
 */
export function ClassSchedulePanel({
  slug,
  classroom,
  onChanged,
}: {
  slug: string;
  classroom: ClassroomDetail;
  /** Lịch đổi (ngày kết thúc, nhật ký) → tải lại lớp. */
  onChanged: () => void;
}) {
  const text = vi.schedule;
  const [schedule, setSchedule] = useState<ClassScheduleView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<'list' | 'calendar'>('list');
  const [makeupOpen, setMakeupOpen] = useState(false);
  const [view, setView] = useState<CalendarViewMode>('month');
  const [anchor, setAnchor] = useState<string | null>(null);

  const reload = useCallback(() => {
    getClassSchedule(slug, classroom.id).then(
      (result) => {
        setSchedule(result);
        // Lịch mở ở buổi sắp tới (hoặc buổi đầu nếu lớp chưa bắt đầu).
        setAnchor((current) => {
          if (current) return current;
          const next = result.sessions.find((row) => !isPast(row));
          return next
            ? trainingDateOf(next.startsAt)
            : result.sessions[0]
              ? trainingDateOf(result.sessions[0].startsAt)
              : todayDate();
        });
      },
      (err: unknown) => setError(errorMessage(err, vi.common.loadFailed)),
    );
  }, [slug, classroom.id]);

  useEffect(reload, [reload, classroom.status]);

  if (!schedule) {
    return error ? (
      <FormAlert tone="error">{error}</FormAlert>
    ) : (
      <span className="text-[14px] text-[var(--muted)]">
        {vi.common.loading}
      </span>
    );
  }

  const regular = schedule.sessions.filter((row) => row.seq !== null);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-[var(--muted)]">{text.tabHint}</p>
      {notice && <FormAlert tone="success">{notice}</FormAlert>}
      {error && <FormAlert tone="error">{error}</FormAlert>}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-[16px] font-semibold text-[var(--heading)]">
            {text.recurring}
          </h2>
          {schedule.canManage && !editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setNotice(null);
              }}
              className={`${secondaryButtonClass} ml-auto`}
            >
              <Pencil size={15} /> {text.editRecurring}
            </button>
          )}
        </div>
        {editing ? (
          <RecurringForm
            slug={slug}
            classroomId={classroom.id}
            schedule={schedule}
            onCancel={() => setEditing(false)}
            onSaved={(result) => {
              setSchedule(result);
              setEditing(false);
              setNotice(text.saved);
              onChanged();
            }}
          />
        ) : (
          <>
            <p className="mb-3 text-[13px] text-[var(--muted)]">
              {text.recurringHint}
            </p>
            <dl className="grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-[200px_minmax(0,1fr)]">
              {(
                [
                  [text.startDate, formatDate(schedule.startDate)],
                  [
                    text.plannedSessions,
                    vi.classes.sessions(schedule.plannedSessions),
                  ],
                  [
                    text.endDate,
                    schedule.endDate
                      ? formatDate(schedule.endDate)
                      : vi.classes.endDatePending,
                  ],
                  [
                    text.applyHolidays,
                    schedule.applyTenantHolidays
                      ? text.applyHolidaysOn
                      : text.applyHolidaysOff,
                  ],
                  [
                    text.slots,
                    schedule.slots.length === 0
                      ? text.noSlots
                      : schedule.slots.map(formatSlot).join(' · '),
                  ],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-[var(--muted)]">{label}</dt>
                  <dd className="text-[var(--heading)]">{value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[16px] font-semibold text-[var(--heading)]">
            {text.sessionsTitle}
          </h2>
          <span className="text-[13px] text-[var(--muted)]">
            {vi.classes.sessions(regular.length)}
            {schedule.heldCount > 0 && ` · ${text.past}: ${schedule.heldCount}`}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode(mode === 'list' ? 'calendar' : 'list')}
              className={secondaryButtonClass}
            >
              {mode === 'list' ? (
                <>
                  <CalendarDays size={15} /> {text.showCalendar}
                </>
              ) : (
                <>
                  <List size={15} /> {text.showList}
                </>
              )}
            </button>
            {schedule.canEditSessions && (
              <button
                type="button"
                onClick={() => setMakeupOpen(true)}
                className={compactPrimaryButtonClass}
              >
                <Plus size={15} /> {text.addMakeup}
              </button>
            )}
          </div>
        </div>
        <p className="text-[13px] text-[var(--muted)]">{text.sessionsHint}</p>

        {mode === 'calendar' ? (
          <CalendarView
            view={view}
            anchor={anchor ?? todayDate()}
            onViewChange={setView}
            onAnchorChange={setAnchor}
            events={schedule.sessions.map((row) =>
              classSessionEvent(slug, classroom.id, row, schedule.location),
            )}
            holidays={schedule.holidays}
          />
        ) : schedule.sessions.length === 0 ? (
          <p className="py-6 text-center text-[14px] text-[var(--muted)]">
            {text.noSessions}
          </p>
        ) : (
          <SessionTable slug={slug} schedule={schedule} />
        )}
      </section>

      <MakeupDialog
        open={makeupOpen}
        slug={slug}
        classroomId={classroom.id}
        sessions={regular}
        onClose={() => setMakeupOpen(false)}
        onCreated={() => {
          setMakeupOpen(false);
          setNotice(text.done);
          reload();
          onChanged();
        }}
      />
    </div>
  );
}

function SessionTable({
  slug,
  schedule,
}: {
  slug: string;
  schedule: ClassScheduleView;
}) {
  const text = vi.schedule;
  return (
    <div className="overflow-x-auto">
      <ul className="min-w-[760px] divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
        <li className="grid grid-cols-[150px_200px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-3 bg-[var(--hover)] px-3 py-2 text-[12.5px] font-semibold text-[var(--muted)]">
          <span>{text.columns.session}</span>
          <span>{text.columns.time}</span>
          <span>{text.columns.teachers}</span>
          <span>{text.columns.location}</span>
          <span>{text.columns.content}</span>
        </li>
        {schedule.sessions.map((session) => {
          const cancelled = session.status === ClassSessionStatus.CANCELLED;
          return (
            <li key={session.id}>
              <Link
                href={sessionDetailPath(slug, session.id)}
                className={`grid grid-cols-[150px_200px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] items-start gap-3 px-3 py-2.5 text-[13.5px] hover:bg-[var(--hover)] ${
                  isPast(session) ? 'text-[var(--muted)]' : ''
                }`}
              >
                <span className="flex flex-wrap items-center gap-1">
                  <span
                    className={`font-semibold text-[var(--heading)] ${
                      cancelled ? 'line-through' : ''
                    }`}
                  >
                    {text.sessionLabel(session.seq)}
                  </span>
                  {session.makeupFor && (
                    <span className="text-[12px] text-[var(--muted)]">
                      ({text.makeupFor}{' '}
                      {text.sessionLabel(session.makeupFor.seq)})
                    </span>
                  )}
                  {cancelled && <Badge>{text.cancelled}</Badge>}
                  {session.conflicts.length > 0 && (
                    <Badge tone="danger">{text.conflict}</Badge>
                  )}
                  {session.movedWarning && (
                    <Badge tone="warning">{text.moved}</Badge>
                  )}
                </span>
                <span className="tabular-nums">
                  {formatSessionTime(session.startsAt, session.endsAt)}
                  {session.timeOverridden && (
                    <span className="block text-[12px] text-[var(--muted)]">
                      {text.timeOverridden}
                    </span>
                  )}
                </span>
                <span>
                  {session.teachers.length === 0
                    ? text.noTeacher
                    : session.teachers.map((row) => row.fullName).join(', ')}
                  {session.customTeachers && (
                    <span className="block text-[12px] text-[var(--muted)]">
                      {text.customTeachers}
                    </span>
                  )}
                </span>
                <span className="break-words">
                  {session.location ?? schedule.location ?? '—'}
                </span>
                <span className="break-words">
                  {session.links.length === 0
                    ? '—'
                    : session.links.map((row) => row.title).join(', ')}
                  {cancelled && session.links.length > 0 && (
                    <span className="mt-0.5 flex items-center gap-1 text-[12px] text-[var(--warn-text)]">
                      <AlertTriangle size={12} /> {text.cancelledContent}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Sửa lịch lặp: xem trước thay đổi (buổi dời/xoá) rồi mới lưu. */
function RecurringForm({
  slug,
  classroomId,
  schedule,
  onCancel,
  onSaved,
}: {
  slug: string;
  classroomId: string;
  schedule: ClassScheduleView;
  onCancel: () => void;
  onSaved: (schedule: ClassScheduleView) => void;
}) {
  const text = vi.schedule;
  const [startDate, setStartDate] = useState(schedule.startDate);
  const [plannedSessions, setPlannedSessions] = useState(
    String(schedule.plannedSessions),
  );
  const [apply, setApply] = useState(schedule.applyTenantHolidays);
  const [slots, setSlots] = useState<ScheduleSlot[]>(
    schedule.slots.length > 0 ? schedule.slots : [DEFAULT_SLOT],
  );
  const [summary, setSummary] = useState<ScheduleChangeSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input = (): SaveClassScheduleInput => ({
    startDate,
    plannedSessions: Number(plannedSessions),
    applyTenantHolidays: apply,
    slots: [...slots].sort(compareSlots),
  });

  const updateSlot = (index: number, patch: Partial<ScheduleSlot>) =>
    setSlots((current) =>
      current.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)),
    );

  async function preview(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setSummary(await previewClassSchedule(slug, classroomId, input()));
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      onSaved(await saveClassSchedule(slug, classroomId, input()));
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
      setSummary(null);
    } finally {
      setBusy(false);
    }
  }

  const changes = summary
    ? summary.created + summary.moved.length + summary.removed.length
    : 0;

  return (
    <form onSubmit={preview} className="flex flex-col gap-4">
      {error && <FormAlert tone="error">{error}</FormAlert>}
      {schedule.heldCount > 0 && (
        <p className="text-[13px] text-[var(--muted)]">
          {text.heldHint(schedule.heldCount)}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          <span className={labelTextClass}>{text.startDate}</span>
          <input
            type="date"
            required
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>{text.plannedSessions}</span>
          <input
            type="number"
            required
            min={Math.max(1, schedule.heldCount)}
            max={COURSE_MAX_PLANNED_SESSIONS}
            value={plannedSessions}
            onChange={(event) => setPlannedSessions(event.target.value)}
            className={inputClass}
          />
        </label>
      </div>
      <label className="flex items-start gap-2 text-[14px] text-[var(--body)]">
        <input
          type="checkbox"
          checked={apply}
          onChange={(event) => setApply(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
        />
        <span>
          {text.applyHolidays}
          <span className="block text-[12.5px] text-[var(--muted)]">
            {text.applyHolidaysHint}
          </span>
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <span className={labelTextClass}>{text.slots}</span>
        {slots.map((slot, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <select
              aria-label={text.slotWeekday}
              value={slot.weekday}
              onChange={(event) =>
                updateSlot(index, { weekday: Number(event.target.value) })
              }
              className={`${inputClass} !w-auto !py-2`}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <option key={day} value={day}>
                  {text.weekdays[day]}
                </option>
              ))}
            </select>
            <input
              type="time"
              required
              aria-label={text.slotStart}
              value={slot.startTime}
              onChange={(event) =>
                updateSlot(index, { startTime: event.target.value })
              }
              className={`${inputClass} !w-auto !py-2`}
            />
            <span className="text-[var(--muted)]">–</span>
            <input
              type="time"
              required
              aria-label={text.slotEnd}
              value={slot.endTime}
              onChange={(event) =>
                updateSlot(index, { endTime: event.target.value })
              }
              className={`${inputClass} !w-auto !py-2`}
            />
            <button
              type="button"
              title={text.removeSlot}
              aria-label={text.removeSlot}
              disabled={slots.length === 1}
              onClick={() =>
                setSlots((current) => current.filter((_, i) => i !== index))
              }
              className={iconButtonClass}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={slots.length >= SCHEDULE_MAX_SLOTS}
          onClick={() =>
            setSlots((current) => [
              ...current,
              { ...(current.at(-1) ?? DEFAULT_SLOT) },
            ])
          }
          className={`${secondaryButtonClass} w-fit`}
        >
          <Plus size={15} /> {text.addSlot}
        </button>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={secondaryButtonClass}
        >
          {vi.common.cancel}
        </button>
        <button
          type="submit"
          disabled={busy}
          className={compactPrimaryButtonClass}
        >
          {busy ? vi.common.processing : text.previewSave}
        </button>
      </div>

      <Modal
        open={summary !== null}
        onClose={() => setSummary(null)}
        title={text.previewTitle}
        widthClass="max-w-xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setSummary(null)}
              className={secondaryButtonClass}
            >
              {vi.common.cancel}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className={compactPrimaryButtonClass}
            >
              {busy ? vi.common.processing : vi.classes.form.save}
            </button>
          </>
        }
      >
        {summary && (
          <div className="flex flex-col gap-2 text-[14px] text-[var(--body)]">
            {changes === 0 && <p>{text.previewNoChange}</p>}
            {summary.created > 0 && (
              <p>{text.previewCreated(summary.created)}</p>
            )}
            {summary.moved.length > 0 && (
              <>
                <p>{text.previewMoved(summary.moved.length)}</p>
                <ul className="max-h-[32vh] list-disc overflow-auto pl-5 text-[13px]">
                  {summary.moved.map((row) => (
                    <li
                      key={row.seq}
                      className={
                        row.movedWarning ? 'text-[var(--warn-text)]' : ''
                      }
                    >
                      {text.sessionLabel(row.seq)}:{' '}
                      {formatSessionStart(row.fromStartsAt)} →{' '}
                      {formatSessionStart(row.startsAt)}
                      {row.movedWarning && ' ⚠'}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {summary.removed.length > 0 && (
              <>
                <p>{text.previewRemoved(summary.removed.length)}</p>
                <ul className="list-disc pl-5 text-[13px]">
                  {summary.removed.map((row) => (
                    <li key={row.seq}>
                      {text.sessionLabel(row.seq)} –{' '}
                      {formatSessionStart(row.startsAt)}
                      {row.linkCount > 0 && (
                        <span className="font-medium text-[var(--danger)]">
                          {' '}
                          ({text.previewRemovedLinks(row.linkCount)})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {summary.moved.some((row) => row.movedWarning) && (
              <FormAlert tone="warning">{text.previewWarning}</FormAlert>
            )}
            {summary.previousEndDate !== summary.endDate && (
              <p className="font-medium">
                {text.previewEndDate(
                  formatDate(summary.previousEndDate),
                  formatDate(summary.endDate),
                )}
              </p>
            )}
          </div>
        )}
      </Modal>
    </form>
  );
}
