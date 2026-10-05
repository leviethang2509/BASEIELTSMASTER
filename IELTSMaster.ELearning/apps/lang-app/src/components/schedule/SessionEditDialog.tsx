'use client';

import { useEffect, useState } from 'react';
import {
  CLASSROOM_LOCATION_MAX_LENGTH,
  ClassSessionKind,
  SESSION_NOTE_MAX_LENGTH,
  TenantRole,
  trainingDateOf,
  trainingDateTimeToIso,
  trainingTimeOf,
  type ClassSessionDetail,
  type MembershipListItem,
  type UpdateClassSessionInput,
} from '@lang/shared';
import {
  FormAlert,
  Modal,
  compactPrimaryButtonClass,
  inputClass,
  labelClass,
  labelTextClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { listActiveMembers } from '@/lib/classroom-api';
import { errorMessage } from '@/lib/error-message';
import { updateSession } from '@/lib/schedule-api';
import { isPast } from './schedule-format';

/**
 * Sửa buổi: phòng/link, ghi chú; buổi chưa diễn ra thêm giờ học (buổi thường
 * chỉ trong ngày) và giáo viên của buổi (dạy thế, R14).
 */
export function SessionEditDialog({
  open,
  slug,
  session,
  onClose,
  onSaved,
}: {
  open: boolean;
  slug: string;
  session: ClassSessionDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const text = vi.schedule;
  const past = isPast(session);
  const makeup = session.kind === ClassSessionKind.MAKEUP;
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [custom, setCustom] = useState(false);
  const [teacherIds, setTeacherIds] = useState<Set<string>>(new Set());
  const [teachers, setTeachers] = useState<MembershipListItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLocation(session.location ?? '');
    setNote(session.note ?? '');
    setDate(trainingDateOf(session.startsAt));
    setStartTime(trainingTimeOf(session.startsAt));
    setEndTime(trainingTimeOf(session.endsAt));
    setCustom(session.customTeachers);
    setTeacherIds(new Set(session.teachers.map((row) => row.membershipId)));
    setError(null);
  }, [open, session]);

  useEffect(() => {
    if (!open || past) return;
    let cancelled = false;
    listActiveMembers(slug, TenantRole.TEACHER, '', 100).then(
      (result) => {
        if (!cancelled) setTeachers(result.items);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, past, slug]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const input: UpdateClassSessionInput = {
      location: location.trim() || null,
      note: note.trim() || null,
    };
    if (!past) {
      input.startsAt = trainingDateTimeToIso(date, startTime);
      input.endsAt = trainingDateTimeToIso(date, endTime);
      input.teacherMembershipIds = custom ? [...teacherIds] : null;
    }
    try {
      await updateSession(slug, session.classroom.id, session.id, input);
      onSaved();
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusy(false);
    }
  }

  const toggle = (id: string) =>
    setTeacherIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={text.editTitle}
      widthClass="max-w-xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className={secondaryButtonClass}
          >
            {vi.common.cancel}
          </button>
          <button
            type="submit"
            form="session-form"
            disabled={busy}
            className={compactPrimaryButtonClass}
          >
            {busy ? vi.common.processing : vi.classes.form.save}
          </button>
        </>
      }
    >
      <form id="session-form" onSubmit={submit} className="flex flex-col gap-4">
        {error && <FormAlert tone="error">{error}</FormAlert>}
        {past && <FormAlert tone="info">{text.pastHint}</FormAlert>}
        {!past && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className={labelClass}>
                <span className={labelTextClass}>{text.date}</span>
                <input
                  type="date"
                  required
                  disabled={!makeup}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                <span className={labelTextClass}>{text.startTime}</span>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                <span className={labelTextClass}>{text.endTime}</span>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            {!makeup && (
              <p className="-mt-2 text-[12px] text-[var(--muted)]">
                {text.regularTimeHint}
              </p>
            )}
            <fieldset className="flex flex-col gap-2">
              <legend className={`${labelTextClass} mb-1`}>
                {text.teacherMode}
              </legend>
              <label className="flex items-center gap-2 text-[14px]">
                <input
                  type="radio"
                  checked={!custom}
                  onChange={() => setCustom(false)}
                  className="accent-[var(--accent)]"
                />
                {text.teacherModeClass}
                {session.classTeachers.length > 0 &&
                  ` (${session.classTeachers.map((row) => row.fullName).join(', ')})`}
              </label>
              <label className="flex items-center gap-2 text-[14px]">
                <input
                  type="radio"
                  checked={custom}
                  onChange={() => setCustom(true)}
                  className="accent-[var(--accent)]"
                />
                {text.teacherModeCustom}
              </label>
              {custom && (
                <div className="ml-6 flex flex-col gap-1.5">
                  <p className="text-[12px] text-[var(--muted)]">
                    {text.teacherPickerHint}
                  </p>
                  <ul className="flex max-h-[28vh] flex-col gap-1 overflow-auto">
                    {teachers.map((row) => (
                      <li key={row.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[14px] hover:bg-[var(--hover)]">
                          <input
                            type="checkbox"
                            checked={teacherIds.has(row.id)}
                            onChange={() => toggle(row.id)}
                            className="h-4 w-4 accent-[var(--accent)]"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {row.fullName}
                          </span>
                          <span className="truncate text-[12px] text-[var(--muted)]">
                            {row.email}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </fieldset>
          </>
        )}
        <label className={labelClass}>
          <span className={labelTextClass}>{text.location}</span>
          <input
            value={location}
            maxLength={CLASSROOM_LOCATION_MAX_LENGTH}
            placeholder={session.classroom.location ?? text.locationPlaceholder}
            onChange={(event) => setLocation(event.target.value)}
            className={inputClass}
          />
          <span className="text-[12px] text-[var(--muted)]">
            {text.locationPlaceholder}
          </span>
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>{text.note}</span>
          <textarea
            rows={3}
            value={note}
            maxLength={SESSION_NOTE_MAX_LENGTH}
            onChange={(event) => setNote(event.target.value)}
            className={inputClass}
          />
        </label>
      </form>
    </Modal>
  );
}
