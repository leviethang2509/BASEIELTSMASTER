'use client';

import { useEffect, useState } from 'react';
import {
  CLASSROOM_LOCATION_MAX_LENGTH,
  ClassSessionStatus,
  SESSION_NOTE_MAX_LENGTH,
  trainingDateTimeToIso,
  type ClassSessionView,
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
import { errorMessage } from '@/lib/error-message';
import { createMakeupSession } from '@/lib/schedule-api';
import { formatSessionDate } from './schedule-format';

/** Thêm buổi bù (V1.3): ngày cố định, có thể ghi "Bù cho Buổi N". */
export function MakeupDialog({
  open,
  slug,
  classroomId,
  sessions,
  onClose,
  onCreated,
}: {
  open: boolean;
  slug: string;
  classroomId: string;
  /** Buổi thường của lớp (chọn buổi được bù; buổi đã huỷ lên đầu). */
  sessions: ClassSessionView[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const text = vi.schedule;
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:30');
  const [target, setTarget] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelled = sessions.filter(
    (row) => row.status === ClassSessionStatus.CANCELLED,
  );
  const others = sessions.filter(
    (row) => row.status !== ClassSessionStatus.CANCELLED,
  );

  useEffect(() => {
    if (!open) return;
    setDate('');
    setStartTime('18:00');
    setEndTime('19:30');
    setTarget(cancelled[0]?.id ?? '');
    setLocation('');
    setNote('');
    setError(null);
    // Chỉ đặt lại khi mở hộp thoại.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createMakeupSession(slug, classroomId, {
        startsAt: trainingDateTimeToIso(date, startTime),
        endsAt: trainingDateTimeToIso(date, endTime),
        makeupForSessionId: target || null,
        location: location.trim() || null,
        note: note.trim() || null,
      });
      onCreated();
    } catch (err) {
      setError(errorMessage(err, vi.exams.actionFailed));
    } finally {
      setBusy(false);
    }
  }

  const option = (row: ClassSessionView) => (
    <option key={row.id} value={row.id}>
      {text.sessionLabel(row.seq)} – {formatSessionDate(row.startsAt)}
      {row.status === ClassSessionStatus.CANCELLED
        ? ` (${text.cancelled})`
        : ''}
    </option>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={text.makeupTitle}
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
            form="makeup-form"
            disabled={busy}
            className={compactPrimaryButtonClass}
          >
            {busy ? vi.common.processing : text.addMakeup}
          </button>
        </>
      }
    >
      <form id="makeup-form" onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-[13px] text-[var(--muted)]">{text.makeupHint}</p>
        {error && <FormAlert tone="error">{error}</FormAlert>}
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={labelClass}>
            <span className={labelTextClass}>{text.date}</span>
            <input
              type="date"
              required
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
        <label className={labelClass}>
          <span className={labelTextClass}>{text.makeupFor}</span>
          <select
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className={inputClass}
          >
            <option value="">{text.makeupForPlaceholder}</option>
            {cancelled.map(option)}
            {others.map(option)}
          </select>
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>{text.location}</span>
          <input
            value={location}
            maxLength={CLASSROOM_LOCATION_MAX_LENGTH}
            placeholder={text.locationPlaceholder}
            onChange={(event) => setLocation(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>{text.note}</span>
          <textarea
            rows={2}
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
