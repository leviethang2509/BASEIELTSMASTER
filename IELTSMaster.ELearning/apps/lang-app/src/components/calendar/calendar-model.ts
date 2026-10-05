import {
  addCalendarDays,
  isHolidayDate,
  trainingDateOf,
  trainingTimeOf,
  weekdayOf,
  type HolidayView,
} from '@lang/shared';

// Hàm thuần của lịch (giả định 12: tự viết, không thư viện). Ngày/giờ luôn
// theo giờ Việt Nam (+07:00) bất kể múi giờ trình duyệt.

export type CalendarViewMode = 'week' | 'month' | 'list';

export interface CalendarEvent {
  id: string;
  startsAt: string;
  endsAt: string;
  title: string;
  /** Dòng phụ: phòng, giáo viên… */
  subtitle?: string;
  /** Khoá chọn màu (thường là id lớp). */
  colorKey: string;
  cancelled?: boolean;
  /** Trùng lịch giáo viên/học viên: viền đỏ (R15). */
  conflict?: boolean;
  /** Nhãn cảnh báo/ghi chú ngắn. */
  badges?: string[];
  href?: string;
}

/** Màu theo lớp: 8 sắc Solarized, lấy qua token nên tự sáng lên ở theme tối. */
const PALETTE = [
  'var(--info)',
  'var(--accent)',
  'var(--ok)',
  'var(--orange)',
  'var(--violet)',
  'var(--cyan)',
  'var(--warn)',
  'var(--danger)',
];

export function colorFor(key: string): string {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length]!;
}

export function todayDate(): string {
  return trainingDateOf(new Date());
}

/** Thứ 2 của tuần chứa ngày. */
export function weekStart(date: string): string {
  return addCalendarDays(date, 1 - weekdayOf(date));
}

export function monthStart(date: string): string {
  return `${date.slice(0, 8)}01`;
}

export function monthEnd(date: string): string {
  const [year, month] = date.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

/** Khoảng ngày cần tải cho chế độ xem (tháng: 6 tuần của lưới). */
export function visibleRange(
  view: CalendarViewMode,
  anchor: string,
): { from: string; to: string } {
  if (view === 'week') {
    const from = weekStart(anchor);
    return { from, to: addCalendarDays(from, 6) };
  }
  if (view === 'month') {
    const from = weekStart(monthStart(anchor));
    return { from, to: addCalendarDays(from, 41) };
  }
  return { from: monthStart(anchor), to: monthEnd(anchor) };
}

/** Chuyển tuần/tháng trước (-1) hoặc sau (+1). */
export function shiftAnchor(
  view: CalendarViewMode,
  anchor: string,
  direction: -1 | 1,
): string {
  if (view === 'week') return addCalendarDays(anchor, 7 * direction);
  const [year, month] = anchor.split('-').map(Number) as [number, number];
  const target = new Date(Date.UTC(year, month - 1 + direction, 1));
  return target.toISOString().slice(0, 10);
}

export function daysOf(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = addCalendarDays(day, 1)) {
    days.push(day);
  }
  return days;
}

export function eventsByDate(
  events: readonly CalendarEvent[],
): Map<string, CalendarEvent[]> {
  const result = new Map<string, CalendarEvent[]>();
  for (const event of [...events].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  )) {
    const date = trainingDateOf(event.startsAt);
    const list = result.get(date) ?? [];
    list.push(event);
    result.set(date, list);
  }
  return result;
}

export function holidayOn(
  date: string,
  holidays: readonly HolidayView[],
): HolidayView | undefined {
  return holidays.find((holiday) => isHolidayDate(date, [holiday]));
}

/** Phút từ 00:00 theo giờ Việt Nam. */
export function minutesOf(iso: string): number {
  const [hours, minutes] = trainingTimeOf(iso).split(':').map(Number) as [
    number,
    number,
  ];
  return hours * 60 + minutes;
}

export interface PlacedEvent {
  event: CalendarEvent;
  column: number;
  columns: number;
}

/** Xếp cột cho các buổi chồng giờ trong một ngày (chia đều bề ngang). */
export function layoutDay(events: readonly CalendarEvent[]): PlacedEvent[] {
  const sorted = [...events].sort(
    (a, b) =>
      a.startsAt.localeCompare(b.startsAt) || b.endsAt.localeCompare(a.endsAt),
  );
  const placed: PlacedEvent[] = [];
  let cluster: PlacedEvent[] = [];
  let clusterEnd = '';
  const flush = () => {
    const columns = Math.max(1, ...cluster.map((row) => row.column + 1));
    for (const row of cluster) row.columns = columns;
    placed.push(...cluster);
    cluster = [];
  };
  for (const event of sorted) {
    if (cluster.length > 0 && event.startsAt >= clusterEnd) flush();
    const used = new Set(
      cluster
        .filter((row) => row.event.endsAt > event.startsAt)
        .map((row) => row.column),
    );
    let column = 0;
    while (used.has(column)) column += 1;
    cluster.push({ event, column, columns: 1 });
    if (event.endsAt > clusterEnd) clusterEnd = event.endsAt;
  }
  flush();
  return placed;
}
