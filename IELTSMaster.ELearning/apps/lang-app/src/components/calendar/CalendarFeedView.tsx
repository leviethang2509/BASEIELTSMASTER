'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ClassSessionStatus,
  type CalendarFeed,
  type CalendarSession,
} from '@lang/shared';
import { FormAlert } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { sessionDetailPath } from '@/lib/schedule-api';
import { CalendarView } from './CalendarView';
import {
  colorFor,
  todayDate,
  visibleRange,
  type CalendarEvent,
  type CalendarViewMode,
} from './calendar-model';

/**
 * Buổi trên lịch gộp → sự kiện lịch (mỗi lớp một màu). `href` là trang chi
 * tiết buổi; lịch của học viên không có link (trang đó chỉ cho giáo viên).
 */
export function feedEvent(
  slug: string,
  session: CalendarSession,
  href: (session: CalendarSession) => string | undefined = (row) =>
    sessionDetailPath(slug, row.id),
): CalendarEvent {
  const text = vi.schedule;
  return {
    id: session.id,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    title: `${session.classroom.code} · ${text.sessionLabel(session.seq)}`,
    subtitle: [
      session.location,
      session.teachers.map((row) => row.fullName).join(', '),
    ]
      .filter(Boolean)
      .join(' · '),
    colorKey: session.classroom.id,
    cancelled: session.status === ClassSessionStatus.CANCELLED,
    conflict: session.hasConflict,
    badges: [
      ...(session.substitute ? [text.substitute] : []),
      ...(session.movedWarning ? [text.moved] : []),
    ],
    href: href(session),
  };
}

/**
 * Lịch tải theo khoảng ngày đang xem (lịch khoá học, lịch dạy của tôi, lịch
 * trung tâm). `reloadKey` đổi thì tải lại (vd. đổi bộ lọc).
 */
export function CalendarFeedView({
  slug,
  load,
  reloadKey = '',
  toolbarExtra,
  sessionHref,
}: {
  slug: string;
  load: (range: { from: string; to: string }) => Promise<CalendarFeed>;
  reloadKey?: string;
  toolbarExtra?: React.ReactNode;
  /** Link của mỗi buổi; bỏ qua = trang chi tiết buổi trong dashboard. */
  sessionHref?: (session: CalendarSession) => string | undefined;
}) {
  const [view, setView] = useState<CalendarViewMode>('week');
  const [anchor, setAnchor] = useState(todayDate);
  const [feed, setFeed] = useState<CalendarFeed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { from, to } = visibleRange(view, anchor);
  // `load` đổi theo mỗi lần render của cha; tải lại theo khoảng ngày và `reloadKey`.
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadRef
      .current({ from, to })
      .then(
        (result) => {
          if (cancelled) return;
          setFeed(result);
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
  }, [from, to, reloadKey]);

  const classes = new Map(
    (feed?.sessions ?? []).map((row) => [row.classroom.id, row.classroom]),
  );

  return (
    <div className="flex flex-col gap-3">
      {error && <FormAlert tone="error">{error}</FormAlert>}
      <CalendarView
        view={view}
        anchor={anchor}
        onViewChange={setView}
        onAnchorChange={setAnchor}
        events={(feed?.sessions ?? []).map((row) =>
          feedEvent(slug, row, sessionHref),
        )}
        holidays={feed?.holidays ?? []}
        loading={loading}
        toolbarExtra={toolbarExtra}
      />
      {classes.size > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-[var(--muted)]">
          {[...classes.values()].map((row) => (
            <span key={row.id} className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: colorFor(row.id) }}
              />
              {row.code} – {row.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
