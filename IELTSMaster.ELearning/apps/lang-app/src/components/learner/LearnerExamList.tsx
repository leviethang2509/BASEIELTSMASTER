'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { LearnerExamList as ExamList } from '@lang/shared';
import { CategoryIcon } from '@/components/catalog/catalog-ui';
import {
  FormAlert,
  Pagination,
  SearchInput,
  SelectFilter,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { learnerExamPath, listLearnerExams } from '@/lib/learner-api';
import { useDebouncedValue } from '@/lib/use-debounced-value';

const PAGE_SIZE = 12;
const text = vi.learner;

/** Đề đang publish của trung tâm, cho mọi thành viên (trang `/t/{slug}`). */
export function LearnerExamList({ slug }: { slug: string }) {
  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query.trim());
  const [categoryId, setCategoryId] = useState('');
  const [blueprintId, setBlueprintId] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ExamList | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setPage(1), [q, categoryId, blueprintId]);

  useEffect(() => {
    let cancelled = false;
    listLearnerExams(slug, {
      page,
      pageSize: PAGE_SIZE,
      q,
      categoryId,
      blueprintId,
    }).then(
      (result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, page, q, categoryId, blueprintId]);

  if (error) return <FormAlert tone="error">{error}</FormAlert>;
  if (!data) {
    return (
      <p className="py-10 text-center text-[14px] text-[var(--muted)]">
        {vi.common.loading}
      </p>
    );
  }

  const filtering = !!(q || categoryId || blueprintId);
  if (data.total === 0 && !filtering) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--border-strong)] px-4 py-10 text-center text-[14px] text-[var(--body)]">
        {vi.tenantPage.noExams}
      </p>
    );
  }

  const blueprintOptions = data.blueprints
    .filter((item) => !categoryId || item.categoryId === categoryId)
    .map((item) => ({ value: item.id, label: item.name }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <SearchInput
            value={query}
            placeholder={text.searchPlaceholder}
            onChange={setQuery}
          />
        </div>
        {data.categories.length > 1 && (
          <SelectFilter
            value={categoryId}
            allLabel={text.allCategories}
            options={data.categories.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            onChange={(value) => {
              setCategoryId(value);
              setBlueprintId('');
            }}
          />
        )}
        {data.blueprints.length > 1 && (
          <SelectFilter
            value={blueprintId}
            allLabel={text.allBlueprints}
            options={blueprintOptions}
            onChange={setBlueprintId}
          />
        )}
      </div>

      {data.items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border-strong)] px-4 py-10 text-center text-[14px] text-[var(--body)]">
          {text.noMatch}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((exam) => (
            <li key={exam.id}>
              <Link
                prefetch={false}
                href={learnerExamPath(slug, exam.id)}
                className="group flex h-full flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition hover:border-[var(--accent)] hover:shadow-[0_12px_28px_var(--shadow-1)]"
              >
                <div className="flex items-center gap-2.5">
                  <CategoryIcon
                    icon={exam.blueprint.category.icon}
                    color={exam.blueprint.category.color}
                    size={30}
                  />
                  <span className="min-w-0 truncate text-[12.5px] font-semibold text-[var(--muted)]">
                    {exam.blueprint.category.name} · {exam.blueprint.name}
                  </span>
                </div>
                <h3 className="text-[16px] font-bold leading-snug text-[var(--heading)]">
                  {exam.title}
                </h3>
                {exam.description && (
                  <p className="line-clamp-2 text-[13.5px] text-[var(--body)]">
                    {exam.description}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[12.5px] text-[var(--muted)]">
                  <span>
                    {text.examStats(
                      exam.sectionCount,
                      exam.questionCount,
                      exam.totalDurationMinutes,
                    )}
                  </span>
                  <ChevronRight
                    size={16}
                    className="shrink-0 transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {data.total > PAGE_SIZE && (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={data.total}
            onChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
