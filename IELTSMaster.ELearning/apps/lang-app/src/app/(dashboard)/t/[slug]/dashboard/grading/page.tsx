'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClipboardCheck, Eye } from 'lucide-react';
import {
  AttemptStatus,
  GRADING_FREE_FILTER,
  type GradingAttemptItem,
  type GradingAttemptList,
  type GradingAttemptStatus,
} from '@lang/shared';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import type { GradingKind } from '@/components/grading/GradingAttemptView';
import {
  Badge,
  DataTable,
  FormAlert,
  Pagination,
  SearchInput,
  SelectFilter,
  iconButtonClass,
  type DataColumn,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { formatDateTime } from '@/lib/format';
import {
  gradingAttemptPath,
  gradingLessonAttemptPath,
  gradingListPath,
  listGradingAttempts,
  listLessonGradingAttempts,
} from '@/lib/grading-api';
import { useDebouncedValue } from '@/lib/use-debounced-value';

const PAGE_SIZE = 20;
const GRID =
  'sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_130px_100px_95px_60px]';

const text = vi.grading;

const STATUSES: GradingAttemptStatus[] = [
  AttemptStatus.SUBMITTED,
  AttemptStatus.GRADED,
];

/** `?status=` trên URL; mặc định mở danh sách bài chờ chấm, `all` = mọi trạng thái. */
function parseStatus(value: string | undefined): GradingAttemptStatus | '' {
  if (value === 'all') return '';
  return STATUSES.find((status) => status === value) ?? AttemptStatus.SUBMITTED;
}

const KINDS: GradingKind[] = ['exam', 'lesson'];

/** Danh sách lượt học bài học, cùng dạng với lượt làm đề thi để dùng chung bảng. */
function listLessons(
  slug: string,
  query: Parameters<typeof listGradingAttempts>[1],
): Promise<GradingAttemptList> {
  const { examId, ...rest } = query;
  return listLessonGradingAttempts(slug, { ...rest, lessonId: examId }).then(
    ({ lessons, items, ...page }) => ({
      ...page,
      exams: lessons,
      items: items.map(({ lesson, lessonVersion: _version, ...item }) => ({
        ...item,
        exam: lesson,
      })),
    }),
  );
}

/**
 * Danh sách bài có câu Writing/Speaking cần chấm (Owner/Admin/Teacher): lượt
 * làm đề thi đã nộp hết hoặc lượt học bài học có phần đã nộp (`?kind=lesson`).
 */
export default function GradingPage({
  searchParams,
}: {
  searchParams: { status?: string; kind?: string };
}) {
  const { tenant } = useTenantDashboard();
  const slug = tenant.slug;
  const router = useRouter();

  const [kind, setKind] = useState<GradingKind>(
    searchParams.kind === 'lesson' ? 'lesson' : 'exam',
  );
  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query.trim());
  const [status, setStatus] = useState(parseStatus(searchParams.status));
  // Đề thi hoặc bài học đang lọc (theo `kind`).
  const [examId, setExamId] = useState('');
  // Lớp (uuid) hoặc `free` = bài làm tự do; mục của lớp đang chọn.
  const [classId, setClassId] = useState('');
  const [itemId, setItemId] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<GradingAttemptList | null>(null);
  const attemptPath =
    kind === 'lesson' ? gradingLessonAttemptPath : gradingAttemptPath;

  function changeKind(next: GradingKind) {
    if (next === kind) return;
    setKind(next);
    setExamId('');
    setClassId('');
    setItemId('');
    setData(null);
    router.replace(
      next === 'lesson'
        ? `${gradingListPath(slug)}?kind=lesson`
        : gradingListPath(slug),
    );
  }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setPage(1), [q, status, examId, classId, itemId, kind]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (kind === 'lesson' ? listLessons : listGradingAttempts)(slug, {
      page,
      pageSize: PAGE_SIZE,
      q,
      status,
      examId,
      classId,
      itemId,
    })
      .then(
        (result) => {
          if (cancelled) return;
          setData(result);
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
  }, [slug, page, q, status, examId, classId, itemId, kind]);

  const columns: DataColumn<GradingAttemptItem>[] = [
    {
      header: text.columns.student,
      render: (row) => (
        <>
          <Link
            href={attemptPath(slug, row.id)}
            className="block truncate text-[14px] font-semibold text-[var(--heading)] hover:text-[var(--accent)]"
          >
            {row.student.fullName}
          </Link>
          <span className="block truncate text-[12.5px] text-[var(--muted)]">
            {row.student.email}
          </span>
        </>
      ),
    },
    {
      header: kind === 'lesson' ? text.columns.lesson : text.columns.exam,
      render: (row) => (
        <>
          <span className="block truncate text-[13.5px] text-[var(--body)]">
            {row.exam.title}
          </span>
          <span className="block text-[12.5px] text-[var(--muted)]">
            {text.autoScore(row.autoCorrect, row.autoTotal)}
          </span>
        </>
      ),
    },
    {
      header: text.columns.classItem,
      render: (row) =>
        row.classItem ? (
          <>
            <span className="block truncate text-[13.5px] text-[var(--body)]">
              {row.classItem.itemTitle}
            </span>
            <span className="block truncate text-[12.5px] text-[var(--muted)]">
              {row.classItem.classroomCode} · {row.classItem.classroomName}
            </span>
          </>
        ) : (
          <span className="text-[13px] text-[var(--muted)]">
            {text.freeAttempt}
          </span>
        ),
    },
    {
      header: text.columns.submittedAt,
      render: (row) => (
        <span className="text-[13px] text-[var(--body)]">
          {formatDateTime(row.submittedAt)}
        </span>
      ),
    },
    {
      header: text.columns.progress,
      render: (row) => (
        <span className="text-[13px] tabular-nums text-[var(--body)]">
          {text.progress(row.manualGradedCount, row.manualCount)}
        </span>
      ),
    },
    {
      header: text.columns.status,
      render: (row) => (
        <Badge
          tone={row.status === AttemptStatus.GRADED ? 'success' : 'warning'}
        >
          {text.status[row.status]}
        </Badge>
      ),
    },
    {
      header: vi.admin.actions,
      render: (row) => {
        const label =
          row.status === AttemptStatus.GRADED ? text.view : text.open;
        return (
          <Link
            href={attemptPath(slug, row.id)}
            title={label}
            aria-label={label}
            className={iconButtonClass}
          >
            {row.status === AttemptStatus.GRADED ? (
              <Eye size={16} />
            ) : (
              <ClipboardCheck size={16} />
            )}
          </Link>
        );
      },
    },
  ];

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div
        role="tablist"
        className="flex shrink-0 gap-1 self-start rounded-xl bg-[var(--sidebar)] p-1"
      >
        {KINDS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={item === kind}
            onClick={() => changeKind(item)}
            className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition ${
              item === kind
                ? 'bg-[var(--panel)] text-[var(--heading)] shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--body)]'
            }`}
          >
            {text.kinds[item]}
          </button>
        ))}
      </div>

      <p className="max-w-3xl shrink-0 text-[13.5px] text-[var(--body)]">
        {kind === 'lesson' ? text.lessonSubtitle : text.subtitle}
      </p>

      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
        <SearchInput
          value={query}
          placeholder={text.searchPlaceholder}
          onChange={setQuery}
        />
        <SelectFilter
          value={status}
          allLabel={text.allStatuses}
          options={STATUSES.map((value) => ({
            value,
            label: text.status[value],
          }))}
          onChange={setStatus}
        />
        <SelectFilter
          value={examId}
          allLabel={kind === 'lesson' ? text.allLessons : text.allExams}
          options={(data?.exams ?? []).map((exam) => ({
            value: exam.id,
            label: exam.title,
          }))}
          onChange={setExamId}
        />
        <SelectFilter
          value={classId}
          allLabel={text.allClasses}
          options={[
            { value: GRADING_FREE_FILTER, label: text.freeClass },
            ...(data?.classes ?? []).map((row) => ({
              value: row.id,
              label: `${row.code} · ${row.name}`,
            })),
          ]}
          onChange={(value) => {
            setClassId(value);
            setItemId('');
          }}
        />
        {classId !== '' && classId !== GRADING_FREE_FILTER && (
          <SelectFilter
            value={itemId}
            allLabel={text.allItems}
            options={(data?.classItems ?? [])
              .filter((item) => item.classroomId === classId)
              .map((item) => ({ value: item.id, label: item.title }))}
            onChange={setItemId}
          />
        )}
      </div>

      {error && <FormAlert tone="error">{error}</FormAlert>}

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(row) => row.id}
        gridClass={GRID}
        loading={loading}
        emptyText={text.empty}
        footer={
          data && data.total > 0 ? (
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onChange={setPage}
            />
          ) : null
        }
      />
    </div>
  );
}
