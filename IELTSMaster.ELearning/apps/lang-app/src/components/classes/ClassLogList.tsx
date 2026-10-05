'use client';

import { useEffect, useState } from 'react';
import {
  ClassLogAction,
  type ClassLogDetail,
  type ClassLogEntry,
  type ClassroomStatus,
  type Paginated,
} from '@lang/shared';
import { FormAlert, Pagination } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { listClassLogs } from '@/lib/classroom-api';
import { errorMessage } from '@/lib/error-message';
import { formatDate, formatDateTime } from '@/lib/format';
import { formatSessionStart } from '@/components/schedule/schedule-format';

const PAGE_SIZE = 30;

/** "Buổi 5 (T4 21/10/2026 18:00)" – thời điểm ghi lúc thao tác. */
function session(detail: ClassLogDetail): string {
  const label = vi.schedule.sessionLabel(detail.seq ?? null);
  return detail.sessionAt
    ? `${label} (${formatSessionStart(detail.sessionAt)})`
    : label;
}

/** Dòng chữ của một nhật ký (dựng từ `action` + `detail`). */
function describe(entry: ClassLogEntry): { title: string; lines: string[] } {
  const text = vi.classes.logs;
  const { detail } = entry;
  const names = (detail.names ?? []).join(', ');
  const status = (value?: ClassroomStatus) =>
    value ? vi.classes.status[value] : '';
  switch (entry.action) {
    case ClassLogAction.CREATED:
      return { title: text.created(detail.curriculum ?? null), lines: [] };
    case ClassLogAction.UPDATED:
      return {
        title: text.updated(
          (detail.fields ?? []).map((f) => text.fields[f] ?? f).join(', '),
        ),
        lines: [],
      };
    case ClassLogAction.STATUS_CHANGED:
      return {
        title: `${text.statusChanged(status(detail.from), status(detail.to))}${
          detail.finalizedAttempts
            ? ` (${text.finalized(detail.finalizedAttempts)})`
            : ''
        }`,
        lines: [],
      };
    case ClassLogAction.TEACHERS_ADDED:
      return { title: text.teachersAdded(names), lines: [] };
    case ClassLogAction.TEACHER_REMOVED:
      return { title: text.teacherRemoved(names), lines: [] };
    case ClassLogAction.STUDENTS_ADDED:
      return { title: text.studentsAdded(names), lines: [] };
    case ClassLogAction.STUDENT_REMOVED:
      return { title: text.studentRemoved(names), lines: [] };
    case ClassLogAction.CURRICULUM_SAVED: {
      const lines: string[] = [];
      const list = (label: string, values?: string[]) => {
        if (values?.length) lines.push(`${label}: ${values.join(', ')}`);
      };
      list(text.added, detail.added);
      list(text.removed, detail.removed);
      list(text.hidden, detail.hidden);
      list(text.restored, detail.restored);
      for (const change of detail.changed ?? []) {
        lines.push(
          `${text.changed} ${change.title}: ${change.fields
            .map((field) => text.itemFields[field])
            .join(', ')}`,
        );
      }
      list(text.groupsAdded, detail.groupsAdded);
      list(text.groupsRemoved, detail.groupsRemoved);
      list(text.groupsChanged, detail.groupsChanged);
      if (detail.reordered) lines.push(text.reordered);
      return {
        title: text.curriculumSaved,
        lines: lines.length > 0 ? lines : [text.noChange],
      };
    }
    case ClassLogAction.SCHEDULE_SAVED:
    case ClassLogAction.SCHEDULE_RECOMPUTED: {
      const lines: string[] = [];
      const changed = [
        detail.moved ? text.moved(detail.moved) : '',
        detail.createdSessions
          ? text.createdSessions(detail.createdSessions)
          : '',
        detail.removedSessions
          ? text.removedSessions(detail.removedSessions)
          : '',
      ].filter(Boolean);
      if (detail.fields?.length) {
        lines.push(
          `${text.scheduleChanged} ${detail.fields
            .map((field) => text.scheduleFields[field] ?? field)
            .join(', ')}`,
        );
      }
      if (changed.length > 0) lines.push(changed.join(', '));
      if (detail.previousEndDate !== detail.endDate) {
        lines.push(
          text.endDateChange(
            formatDate(detail.previousEndDate),
            formatDate(detail.endDate),
          ),
        );
      }
      return {
        title:
          entry.action === ClassLogAction.SCHEDULE_SAVED
            ? text.scheduleSaved
            : text.scheduleRecomputed(
                detail.holiday ?? '',
                text.holidayActions[detail.holidayAction ?? ''] ?? '',
              ),
        lines,
      };
    }
    case ClassLogAction.SESSION_UPDATED:
      return {
        title: text.sessionUpdated(
          session(detail),
          (detail.sessionFields ?? [])
            .map((field) => text.sessionFields[field])
            .join(', '),
        ),
        lines: [],
      };
    case ClassLogAction.SESSION_CANCELLED:
      return {
        title: text.sessionCancelled(session(detail)),
        lines: detail.reason ? [text.reason(detail.reason)] : [],
      };
    case ClassLogAction.SESSION_RESTORED:
      return { title: text.sessionRestored(session(detail)), lines: [] };
    case ClassLogAction.MAKEUP_ADDED:
      return {
        title: text.makeupAdded(session(detail), detail.makeupForSeq ?? null),
        lines: [],
      };
    case ClassLogAction.MAKEUP_REMOVED:
      return { title: text.makeupRemoved(session(detail)), lines: [] };
    case ClassLogAction.SESSION_LINKS_SAVED:
      return { title: text.linksSaved(session(detail)), lines: [] };
    default:
      return { title: entry.action, lines: [] };
  }
}

/** Tab "Nhật ký thay đổi" của lớp (E2): ai, lúc nào, làm gì. */
export function ClassLogList({
  slug,
  classroomId,
  reloadKey,
}: {
  slug: string;
  classroomId: string;
  /** Đổi giá trị để tải lại (vd. sau khi lưu giáo trình). */
  reloadKey: number;
}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<ClassLogEntry> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listClassLogs(slug, classroomId, { page, pageSize: PAGE_SIZE }).then(
      (result) => {
        if (!cancelled) setData(result);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, classroomId, page, reloadKey]);

  if (error) return <FormAlert tone="error">{error}</FormAlert>;
  if (!data) {
    return (
      <span className="text-[14px] text-[var(--muted)]">
        {vi.common.loading}
      </span>
    );
  }
  if (data.items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--border-strong)] p-6 text-center text-[14px] text-[var(--muted)]">
        {vi.classes.logs.empty}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-2">
        {data.items.map((entry) => {
          const { title, lines } = describe(entry);
          return (
            <li
              key={entry.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[14px] font-medium text-[var(--heading)]">
                  {title}
                </span>
                <span className="text-[12.5px] text-[var(--muted)]">
                  {entry.actor?.fullName ?? vi.classes.logs.system} ·{' '}
                  {formatDateTime(entry.createdAt)}
                </span>
              </div>
              {lines.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-[13px] text-[var(--body)]">
                  {lines.map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      {data.total > data.pageSize && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onChange={setPage}
        />
      )}
    </div>
  );
}
