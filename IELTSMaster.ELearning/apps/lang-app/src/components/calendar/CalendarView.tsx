'use client';

import Link from 'next/link';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  trainingDateOf,
  trainingTimeOf,
  weekdayOf,
  type HolidayView,
} from '@lang/shared';
import { Badge, secondaryButtonClass } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { formatDate } from '@/lib/format';
import {
  colorFor,
  daysOf,
  eventsByDate,
  holidayOn,
  layoutDay,
  minutesOf,
  monthStart,
  shiftAnchor,
  todayDate,
  visibleRange,
  type CalendarEvent,
  type CalendarViewMode,
} from './calendar-model';

const HOUR_PX = 44;
const MONTH_VISIBLE = 3;
const VIEWS: CalendarViewMode[] = ['week', 'month', 'list'];

const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const timeRange = (event: CalendarEvent) =>
  `${trainingTimeOf(event.startsAt)}–${trainingTimeOf(event.endsAt)}`;

/**
 * Lịch tuần/tháng/danh sách (R16.4, giả định 12). Ngày nghỉ tô xám, buổi trùng
 * lịch viền đỏ, buổi huỷ gạch ngang; mỗi lớp một màu. Trạng thái xem (chế độ,
 * ngày đang xem) do component cha giữ để tải dữ liệu theo khoảng ngày.
 */
export function CalendarView({
  view,
  anchor,
  onViewChange,
  onAnchorChange,
  events,
  holidays,
  loading = false,
  toolbarExtra,
}: {
  view: CalendarViewMode;
  anchor: string;
  onViewChange: (view: CalendarViewMode) => void;
  onAnchorChange: (anchor: string) => void;
  events: CalendarEvent[];
  holidays: HolidayView[];
  loading?: boolean;
  toolbarExtra?: React.ReactNode;
}) {
  const text = vi.schedule;
  const range = visibleRange(view, anchor);
  const title =
    view === 'week'
      ? text.weekTitle(formatDate(range.from), formatDate(range.to))
      : text.monthTitle(
          Number(monthStart(anchor).slice(5, 7)),
          Number(anchor.slice(0, 4)),
        );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={text.previous}
            title={text.previous}
            onClick={() => onAnchorChange(shiftAnchor(view, anchor, -1))}
            className={secondaryButtonClass}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => onAnchorChange(todayDate())}
            className={secondaryButtonClass}
          >
            {text.today}
          </button>
          <button
            type="button"
            aria-label={text.next}
            title={text.next}
            onClick={() => onAnchorChange(shiftAnchor(view, anchor, 1))}
            className={secondaryButtonClass}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <h3 className="text-[15px] font-semibold text-[var(--heading)]">
          {title}
        </h3>
        {loading && (
          <span className="text-[13px] text-[var(--muted)]">
            {vi.common.loading}
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {toolbarExtra}
          <div className="flex overflow-hidden rounded-lg border border-[var(--border-strong)]">
            {VIEWS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onViewChange(value)}
                className={`px-3 py-1.5 text-[13px] font-medium transition ${
                  view === value
                    ? 'bg-[var(--accent-bg)] text-white'
                    : 'text-[var(--body)] hover:bg-[var(--hover)]'
                }`}
              >
                {text.views[value]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'week' && (
        <WeekGrid
          days={daysOf(range.from, range.to)}
          events={events}
          holidays={holidays}
        />
      )}
      {view === 'month' && (
        <MonthGrid
          days={daysOf(range.from, range.to)}
          month={anchor.slice(0, 7)}
          events={events}
          holidays={holidays}
          onOpenDay={(date) => {
            onAnchorChange(date);
            onViewChange('week');
          }}
        />
      )}
      {view === 'list' && (
        <AgendaList
          days={daysOf(range.from, range.to)}
          events={events}
          holidays={holidays}
        />
      )}
    </div>
  );
}

function EventLink({
  event,
  className,
  style,
  children,
}: {
  event: CalendarEvent;
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const tooltip = [
    event.title,
    timeRange(event),
    event.subtitle,
    ...(event.badges ?? []),
  ]
    .filter(Boolean)
    .join('\n');
  return event.href ? (
    <Link href={event.href} title={tooltip} className={className} style={style}>
      {children}
    </Link>
  ) : (
    <div title={tooltip} className={className} style={style}>
      {children}
    </div>
  );
}

// Nền/viền của ô buổi học nằm ở class `.ls-event` (globals.css) để pha loãng
// và hover đổi theo theme; ở đây chỉ truyền màu của lớp.
function eventStyle(event: CalendarEvent): React.CSSProperties {
  return {
    '--event-color': colorFor(event.colorKey),
    ...(event.conflict
      ? { outline: '2px solid var(--danger)', outlineOffset: '-1px' }
      : {}),
  } as React.CSSProperties;
}

function DayHeader({
  date,
  holiday,
}: {
  date: string;
  holiday: HolidayView | undefined;
}) {
  const today = date === todayDate();
  return (
    <div
      className={`flex flex-col items-center gap-0.5 border-b border-[var(--border)] px-1 py-1.5 text-center ${
        holiday ? 'bg-[var(--hover)]' : ''
      }`}
    >
      <span className="text-[12px] text-[var(--muted)]">
        {vi.schedule.weekdaysShort[weekdayOf(date)]}
      </span>
      <span
        className={`grid h-7 w-7 place-items-center rounded-full text-[14px] font-semibold ${
          today ? 'bg-[var(--accent-bg)] text-white' : 'text-[var(--heading)]'
        }`}
      >
        {Number(date.slice(8, 10))}
      </span>
      {holiday && (
        <span
          className="max-w-full truncate text-[11px] text-[var(--muted)]"
          title={holiday.name}
        >
          {vi.schedule.holiday}: {holiday.name}
        </span>
      )}
    </div>
  );
}

function WeekGrid({
  days,
  events,
  holidays,
}: {
  days: string[];
  events: CalendarEvent[];
  holidays: HolidayView[];
}) {
  const byDate = eventsByDate(events);
  const inWeek = days.flatMap((day) => byDate.get(day) ?? []);
  const startHour = Math.min(
    7,
    ...inWeek.map((event) => Math.floor(minutesOf(event.startsAt) / 60)),
  );
  const endHour = Math.max(
    22,
    ...inWeek.map((event) => {
      const end = minutesOf(event.endsAt);
      // Buổi kéo qua nửa đêm: vẽ tới hết ngày.
      return trainingDateOf(event.endsAt) !== trainingDateOf(event.startsAt)
        ? 24
        : Math.ceil(end / 60);
    }),
  );
  const hours = Array.from(
    { length: endHour - startHour },
    (_, index) => startHour + index,
  );
  const height = hours.length * HOUR_PX;

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <div className="grid min-w-[760px] grid-cols-[48px_repeat(7,minmax(0,1fr))]">
        <div className="border-b border-[var(--border)]" />
        {days.map((day) => (
          <DayHeader key={day} date={day} holiday={holidayOn(day, holidays)} />
        ))}
        <div className="relative" style={{ height }}>
          {hours.map((hour, index) => (
            <span
              key={hour}
              className="absolute right-1.5 -translate-y-1/2 text-[11px] text-[var(--muted)]"
              style={{ top: index * HOUR_PX }}
            >
              {index === 0 ? '' : `${String(hour).padStart(2, '0')}:00`}
            </span>
          ))}
        </div>
        {days.map((day) => {
          const holiday = holidayOn(day, holidays);
          return (
            <div
              key={day}
              className={`relative border-l border-[var(--border)] ${
                holiday ? 'bg-[var(--hover)]' : ''
              }`}
              style={{ height }}
            >
              {hours.map((hour, index) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-dashed border-[var(--border)]"
                  style={{ top: index * HOUR_PX }}
                />
              ))}
              {layoutDay(byDate.get(day) ?? []).map(
                ({ event, column, columns }) => {
                  const start = minutesOf(event.startsAt) - startHour * 60;
                  const end =
                    trainingDateOf(event.endsAt) !== day
                      ? (endHour - startHour) * 60
                      : minutesOf(event.endsAt) - startHour * 60;
                  return (
                    <EventLink
                      key={event.id}
                      event={event}
                      className={`ls-event absolute overflow-hidden rounded-md px-1.5 py-1 text-[11.5px] leading-tight text-[var(--heading)] transition ${
                        event.cancelled ? 'opacity-50' : ''
                      }`}
                      style={{
                        ...eventStyle(event),
                        top: (start / 60) * HOUR_PX,
                        height: Math.max(((end - start) / 60) * HOUR_PX, 22),
                        left: `calc(${(column / columns) * 100}% + 2px)`,
                        width: `calc(${100 / columns}% - 4px)`,
                      }}
                    >
                      <span
                        className={`block truncate font-semibold ${
                          event.cancelled ? 'line-through' : ''
                        }`}
                      >
                        {event.conflict && (
                          <AlertTriangle
                            size={11}
                            className="mr-0.5 inline text-[var(--danger)]"
                          />
                        )}
                        {event.title}
                      </span>
                      <span className="block truncate text-[var(--muted)]">
                        {timeRange(event)}
                      </span>
                      {event.subtitle && (
                        <span className="block truncate text-[var(--muted)]">
                          {event.subtitle}
                        </span>
                      )}
                    </EventLink>
                  );
                },
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthGrid({
  days,
  month,
  events,
  holidays,
  onOpenDay,
}: {
  days: string[];
  month: string;
  events: CalendarEvent[];
  holidays: HolidayView[];
  onOpenDay: (date: string) => void;
}) {
  const byDate = eventsByDate(events);
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <div className="grid min-w-[760px] grid-cols-7">
        {days.slice(0, 7).map((day) => (
          <div
            key={day}
            className="border-b border-[var(--border)] py-1.5 text-center text-[12px] font-semibold text-[var(--muted)]"
          >
            {vi.schedule.weekdaysShort[weekdayOf(day)]}
          </div>
        ))}
        {days.map((day) => {
          const holiday = holidayOn(day, holidays);
          const list = byDate.get(day) ?? [];
          const outside = !day.startsWith(month);
          return (
            <div
              key={day}
              className={`flex min-h-[104px] flex-col gap-1 border-b border-l border-[var(--border)] p-1.5 ${
                holiday ? 'bg-[var(--hover)]' : ''
              } ${outside ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-1">
                <span
                  className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-[12.5px] font-semibold ${
                    day === todayDate()
                      ? 'bg-[var(--accent-bg)] text-white'
                      : 'text-[var(--heading)]'
                  }`}
                >
                  {Number(day.slice(8, 10))}
                </span>
                {holiday && (
                  <span
                    className="truncate text-[11px] text-[var(--muted)]"
                    title={holiday.name}
                  >
                    {holiday.name}
                  </span>
                )}
              </div>
              {list.slice(0, MONTH_VISIBLE).map((event) => (
                <EventLink
                  key={event.id}
                  event={event}
                  className={`ls-event block truncate rounded px-1 py-0.5 text-[11.5px] text-[var(--heading)] ${
                    event.cancelled ? 'line-through opacity-50' : ''
                  }`}
                  style={eventStyle(event)}
                >
                  {trainingTimeOf(event.startsAt)} {event.title}
                </EventLink>
              ))}
              {list.length > MONTH_VISIBLE && (
                <button
                  type="button"
                  onClick={() => onOpenDay(day)}
                  className="w-fit text-[11.5px] font-medium text-[var(--accent)] hover:underline"
                >
                  {vi.schedule.more(list.length - MONTH_VISIBLE)}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgendaList({
  days,
  events,
  holidays,
}: {
  days: string[];
  events: CalendarEvent[];
  holidays: HolidayView[];
}) {
  const byDate = eventsByDate(events);
  const shown = days.filter(
    (day) => byDate.has(day) || holidayOn(day, holidays),
  );
  if (shown.length === 0) {
    return (
      <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-[14px] text-[var(--muted)]">
        {vi.schedule.empty}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {shown.map((day) => {
        const holiday = holidayOn(day, holidays);
        return (
          <section
            key={day}
            className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]"
          >
            <header
              className={`flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-4 py-2 ${
                holiday ? 'bg-[var(--hover)]' : ''
              }`}
            >
              <span className="text-[14px] font-semibold text-[var(--heading)]">
                {vi.schedule.weekdays[weekdayOf(day)]}, {shortDate(day)}/
                {day.slice(0, 4)}
              </span>
              {day === todayDate() && (
                <Badge tone="accent">{vi.schedule.today}</Badge>
              )}
              {holiday && (
                <span className="text-[13px] text-[var(--muted)]">
                  {vi.schedule.holiday}: {holiday.name}
                </span>
              )}
            </header>
            <ul className="divide-y divide-[var(--border)]">
              {(byDate.get(day) ?? []).map((event) => (
                <li key={event.id}>
                  <EventLink
                    event={event}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 hover:bg-[var(--hover)]"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: colorFor(event.colorKey) }}
                    />
                    <span className="w-[92px] shrink-0 text-[13px] tabular-nums text-[var(--muted)]">
                      {timeRange(event)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[14px] font-medium text-[var(--heading)] ${
                          event.cancelled ? 'line-through opacity-60' : ''
                        }`}
                      >
                        {event.title}
                      </span>
                      {event.subtitle && (
                        <span className="block text-[12.5px] text-[var(--muted)]">
                          {event.subtitle}
                        </span>
                      )}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {event.cancelled && (
                        <Badge tone="neutral">{vi.schedule.cancelled}</Badge>
                      )}
                      {event.conflict && (
                        <Badge tone="danger">{vi.schedule.conflict}</Badge>
                      )}
                      {(event.badges ?? []).map((badge) => (
                        <Badge key={badge} tone="warning">
                          {badge}
                        </Badge>
                      ))}
                    </span>
                  </EventLink>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
