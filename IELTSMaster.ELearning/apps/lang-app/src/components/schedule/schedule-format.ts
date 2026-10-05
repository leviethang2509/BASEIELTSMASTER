import {
  ClassSessionStatus,
  trainingDateOf,
  trainingTimeOf,
  weekdayOf,
  type ClassSessionView,
  type ScheduleSlot,
} from '@lang/shared';
import type { CalendarEvent } from '@/components/calendar/calendar-model';
import { vi } from '@/i18n/vi';
import { formatDate } from '@/lib/format';
import { sessionDetailPath } from '@/lib/schedule-api';

/** "T2 05/10/2026" theo giờ Việt Nam. */
export function formatSessionDate(iso: string): string {
  const date = trainingDateOf(iso);
  return `${vi.schedule.weekdaysShort[weekdayOf(date)]} ${formatDate(iso)}`;
}

/** "T2 05/10/2026 18:00". */
export function formatSessionStart(iso: string): string {
  return `${formatSessionDate(iso)} ${trainingTimeOf(iso)}`;
}

/** "T2 05/10/2026 18:00–19:30". */
export function formatSessionTime(startsAt: string, endsAt: string): string {
  return `${formatSessionDate(startsAt)} ${trainingTimeOf(startsAt)}–${trainingTimeOf(endsAt)}`;
}

/** "Thứ 2 18:00–19:30". */
export function formatSlot(slot: ScheduleSlot): string {
  return `${vi.schedule.weekdays[slot.weekday]} ${slot.startTime}–${slot.endTime}`;
}

export function isPast(session: { startsAt: string }): boolean {
  return new Date(session.startsAt).getTime() <= Date.now();
}

/** Buổi của một lớp → sự kiện lịch (tab Thời khoá biểu). */
export function classSessionEvent(
  slug: string,
  classroomId: string,
  session: ClassSessionView,
  location: string | null,
): CalendarEvent {
  const text = vi.schedule;
  return {
    id: session.id,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    title: text.sessionLabel(session.seq),
    subtitle: [
      session.location ?? location,
      session.teachers.map((row) => row.fullName).join(', '),
    ]
      .filter(Boolean)
      .join(' · '),
    colorKey: session.seq === null ? `${classroomId}:makeup` : classroomId,
    cancelled: session.status === ClassSessionStatus.CANCELLED,
    conflict: session.conflicts.length > 0,
    badges: session.movedWarning ? [text.moved] : [],
    href: sessionDetailPath(slug, session.id),
  };
}
