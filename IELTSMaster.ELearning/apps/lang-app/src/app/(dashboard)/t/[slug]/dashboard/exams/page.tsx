'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Archive,
  Copy,
  Eye,
  FilePlus2,
  History,
  Pencil,
  Send,
  Trash2,
} from 'lucide-react';
import {
  ContentVisibility,
  ExamStatus,
  type ExamBlueprintItem,
  type ExamContentIssue,
  type ExamListItem,
  type ExamUserRef,
  type Paginated,
} from '@lang/shared';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import { CategoryIcon } from '@/components/catalog/catalog-ui';
import { ExamFormModal } from '@/components/exams/ExamFormModal';
import { ExamStatusBadge } from '@/components/exams/ExamStatusBadge';
import {
  Badge,
  ConfirmDialog,
  DataTable,
  FormAlert,
  Pagination,
  SearchInput,
  SelectFilter,
  compactPrimaryButtonClass,
  iconButtonClass,
  type DataColumn,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import {
  archiveExam,
  cloneExam,
  contentIssuesOf,
  deleteExam,
  examEditPath,
  examVersionsPath,
  listExamCreators,
  listExams,
  publishExam,
} from '@/lib/exam-api';
import { formatDateTime } from '@/lib/format';
import { useDebouncedValue } from '@/lib/use-debounced-value';

const PAGE_SIZE = 20;
const GRID =
  'sm:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_110px_minmax(0,1fr)_130px_150px]';

const text = vi.exams;

const PENDING_LABEL = {
  archive: text.archive,
  delete: text.delete,
  clone: text.clone,
};

type PendingAction = {
  kind: 'archive' | 'delete' | 'clone';
  exam: ExamListItem;
};

/** Danh sách đề của trung tâm (Owner/Admin/Teacher). */
export default function TenantExamsPage() {
  const router = useRouter();
  const { tenant } = useTenantDashboard();
  const slug = tenant.slug;

  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query.trim());
  const [status, setStatus] = useState<ExamStatus | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [blueprintId, setBlueprintId] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<ExamListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ExamContentIssue[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [blueprints, setBlueprints] = useState<ExamBlueprintItem[]>([]);
  const [creators, setCreators] = useState<ExamUserRef[]>([]);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => setPage(1), [q, status, categoryId, blueprintId, createdBy]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listExams(slug, {
      page,
      pageSize: PAGE_SIZE,
      q,
      status,
      categoryId,
      blueprintId,
      createdBy,
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
  }, [slug, page, q, status, categoryId, blueprintId, createdBy, reloadKey]);

  // Loại đề (lọc + tạo đề) và người tạo (lọc).
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<ExamBlueprintItem[]>(`/t/${slug}/exam-blueprints`),
      listExamCreators(slug),
    ]).then(
      ([blueprintRows, creatorRows]) => {
        if (cancelled) return;
        setBlueprints(blueprintRows);
        setCreators(creatorRows);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, reloadKey]);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const blueprint of blueprints) {
      seen.set(blueprint.category.id, blueprint.category.name);
    }
    return [...seen].map(([value, label]) => ({ value, label }));
  }, [blueprints]);

  const reload = () => setReloadKey((key) => key + 1);

  async function run(exam: ExamListItem, action: () => Promise<unknown>) {
    setBusyId(exam.id);
    setError(null);
    setIssues([]);
    setNotice(null);
    try {
      await action();
      reload();
      return true;
    } catch (err) {
      setError(errorMessage(err, text.actionFailed));
      setIssues(contentIssuesOf(err));
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function runPending() {
    if (!pending) return;
    const { kind, exam } = pending;
    if (kind === 'clone') {
      let cloneId: string | null = null;
      await run(exam, async () => {
        cloneId = (await cloneExam(slug, exam.id)).id;
      });
      setPending(null);
      // Bản sao là đề nháp của mình: mở luôn trình soạn.
      if (cloneId) router.push(examEditPath(slug, cloneId));
      return;
    }
    const done = await run(exam, () =>
      kind === 'archive'
        ? archiveExam(slug, exam.id)
        : deleteExam(slug, exam.id),
    );
    if (done) {
      setNotice(
        kind === 'archive'
          ? text.archived(exam.title)
          : text.deleted(exam.title),
      );
    }
    setPending(null);
  }

  function renderActions(row: ExamListItem) {
    const busy = busyId === row.id;
    return (
      <div className="flex items-center gap-1">
        <Link
          href={examEditPath(slug, row.id)}
          title={row.canEdit ? text.edit : text.view}
          aria-label={row.canEdit ? text.edit : text.view}
          className={iconButtonClass}
        >
          {row.canEdit ? <Pencil size={16} /> : <Eye size={16} />}
        </Link>
        <Link
          href={examVersionsPath(slug, row.id)}
          title={text.versions}
          aria-label={text.versions}
          className={iconButtonClass}
        >
          <History size={16} />
        </Link>
        {(row.canEdit || row.status === ExamStatus.PUBLISHED) && (
          <button
            type="button"
            title={text.clone}
            aria-label={text.clone}
            disabled={busy}
            onClick={() => setPending({ kind: 'clone', exam: row })}
            className={iconButtonClass}
          >
            <Copy size={16} />
          </button>
        )}
        {row.canEdit && (
          <>
            {row.status === ExamStatus.PUBLISHED ? (
              <button
                type="button"
                title={text.archive}
                aria-label={text.archive}
                disabled={busy}
                onClick={() => setPending({ kind: 'archive', exam: row })}
                className={iconButtonClass}
              >
                <Archive size={16} />
              </button>
            ) : (
              <button
                type="button"
                title={
                  row.status === ExamStatus.ARCHIVED
                    ? text.republish
                    : text.publish
                }
                aria-label={
                  row.status === ExamStatus.ARCHIVED
                    ? text.republish
                    : text.publish
                }
                disabled={busy}
                onClick={() =>
                  void run(row, () => publishExam(slug, row.id)).then(
                    (done) =>
                      done && setNotice(text.publishedNotice(row.title)),
                  )
                }
                className={iconButtonClass}
              >
                <Send size={16} />
              </button>
            )}
            <button
              type="button"
              title={text.delete}
              aria-label={text.delete}
              disabled={busy}
              onClick={() => setPending({ kind: 'delete', exam: row })}
              className={iconButtonClass}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    );
  }

  const columns: DataColumn<ExamListItem>[] = [
    {
      header: text.column,
      render: (row) => (
        <>
          <Link
            href={examEditPath(slug, row.id)}
            className="block truncate text-[14px] font-semibold text-[var(--heading)] hover:text-[var(--accent)]"
          >
            {row.title}
          </Link>
          <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-[var(--muted)]">
            <CategoryIcon
              icon={row.blueprint.category.icon}
              color={row.blueprint.category.color}
              size={18}
            />
            <span className="truncate">
              {row.blueprint.name} · {row.blueprint.category.name}
            </span>
          </span>
          {row.clonedFrom && (
            <span className="block truncate text-[12px] text-[var(--muted)]">
              {text.clonedFrom(row.clonedFrom.title)}
            </span>
          )}
        </>
      ),
    },
    {
      header: text.content,
      render: (row) => (
        <>
          <span className="block text-[13px] text-[var(--body)]">
            {text.contentSummary(row.sectionCount, row.totalDurationMinutes)}
          </span>
          <span className="block text-[12.5px] text-[var(--muted)]">
            {text.questionSummary(row.questionCount, row.currentVersion)}
          </span>
        </>
      ),
    },
    {
      header: text.statusColumn,
      render: (row) => (
        <span className="flex flex-wrap gap-1">
          <ExamStatusBadge status={row.status} />
          {row.visibility === ContentVisibility.PRIVATE && (
            <Badge tone="accent">{text.privateBadge}</Badge>
          )}
        </span>
      ),
    },
    {
      header: text.creator,
      render: (row) => (
        <span className="block truncate text-[13px] text-[var(--body)]">
          {row.creator?.fullName ?? text.noCreator}
        </span>
      ),
    },
    {
      header: text.updatedAt,
      render: (row) => (
        <span className="text-[13px] text-[var(--body)]">
          {formatDateTime(row.updatedAt)}
        </span>
      ),
    },
    { header: vi.admin.actions, render: renderActions },
  ];

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-[13.5px] text-[var(--body)]">
          {text.subtitle}
        </p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={compactPrimaryButtonClass}
        >
          <FilePlus2 size={16} /> {text.create}
        </button>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
        <SearchInput
          value={query}
          placeholder={text.searchPlaceholder}
          onChange={setQuery}
        />
        <SelectFilter
          value={status}
          allLabel={text.allStatuses}
          options={Object.values(ExamStatus).map((value) => ({
            value,
            label: text.status[value],
          }))}
          onChange={setStatus}
        />
        <SelectFilter
          value={categoryId}
          allLabel={text.allCategories}
          options={categories}
          onChange={(value) => {
            setCategoryId(value);
            setBlueprintId('');
          }}
        />
        <SelectFilter
          value={blueprintId}
          allLabel={text.allBlueprints}
          options={blueprints
            .filter((item) => !categoryId || item.category.id === categoryId)
            .map((item) => ({ value: item.id, label: item.name }))}
          onChange={setBlueprintId}
        />
        <SelectFilter
          value={createdBy}
          allLabel={text.allCreators}
          options={creators.map((creator) => ({
            value: creator.id,
            label: creator.fullName,
          }))}
          onChange={setCreatedBy}
        />
      </div>

      {notice && <FormAlert tone="success">{notice}</FormAlert>}
      {error && (
        <FormAlert tone="error">
          <p>{error}</p>
          {issues.some((issue) => issue.severity === 'error') && (
            <ul className="mt-1.5 max-h-[140px] list-disc overflow-auto pl-5">
              {issues
                .filter((issue) => issue.severity === 'error')
                .map((issue, index) => (
                  <li key={index}>
                    {vi.examEditor.issueLine(issue.sectionName, issue.message)}
                  </li>
                ))}
            </ul>
          )}
        </FormAlert>
      )}

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

      <ExamFormModal
        open={creating}
        slug={slug}
        exam={null}
        blueprints={blueprints}
        onClose={() => setCreating(false)}
        onSaved={(exam) => {
          setCreating(false);
          router.push(examEditPath(slug, exam.id));
        }}
      />
      <ConfirmDialog
        open={pending !== null}
        title={pending ? PENDING_LABEL[pending.kind] : ''}
        message={
          pending
            ? {
                archive: text.archiveConfirm,
                delete: text.deleteConfirm,
                clone: text.cloneConfirm,
              }[pending.kind](pending.exam.title)
            : ''
        }
        confirmLabel={pending ? PENDING_LABEL[pending.kind] : ''}
        tone={pending?.kind === 'delete' ? 'danger' : 'default'}
        loading={busyId !== null}
        onConfirm={() => void runPending()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
