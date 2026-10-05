'use client';

import { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import {
  CurriculumItemType,
  ExamStatus,
  type ExamStatus as ContentStatus,
} from '@lang/shared';
import {
  FormAlert,
  Modal,
  SearchInput,
  compactPrimaryButtonClass,
  secondaryButtonClass,
} from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { listExams } from '@/lib/exam-api';
import { listLessons } from '@/lib/lesson-api';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { contentKey } from './curriculum-draft';
import { ItemTypeIcon } from './training-ui';

const PAGE_SIZE = 50;

export interface PickedContent {
  itemType: CurriculumItemType;
  id: string;
  title: string;
  status: ContentStatus;
}

interface Row extends PickedContent {
  subtitle: string;
}

/**
 * Chọn bài học/đề thi đã publish để thêm vào giáo trình (C5). Thêm được nhiều
 * mục liên tiếp; mục đã có trong giáo trình hiện "Đã có".
 */
export function ContentPickerDialog({
  open,
  slug,
  existing,
  onAdd,
  onClose,
}: {
  open: boolean;
  slug: string;
  /** `contentKey` của các mục đang có trong giáo trình. */
  existing: Set<string>;
  onAdd: (content: PickedContent) => void;
  onClose: () => void;
}) {
  const text = vi.curricula.picker;
  const [type, setType] = useState<CurriculumItemType>(
    CurriculumItemType.LESSON,
  );
  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query.trim());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery('');
      setAdded(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const query = {
      page: 1,
      pageSize: PAGE_SIZE,
      q,
      status: ExamStatus.PUBLISHED,
    };
    const load: Promise<Row[]> =
      type === CurriculumItemType.LESSON
        ? listLessons(slug, query).then((result) =>
            result.items.map((item) => ({
              itemType: type,
              id: item.id,
              title: item.title,
              status: item.status,
              subtitle: item.blueprint.name,
            })),
          )
        : listExams(slug, query).then((result) =>
            result.items.map((item) => ({
              itemType: type,
              id: item.id,
              title: item.title,
              status: item.status,
              subtitle: `${item.blueprint.name} · ${vi.exams.contentSummary(
                item.sectionCount,
                item.totalDurationMinutes,
              )}`,
            })),
          );
    load
      .then(
        (result) => {
          if (cancelled) return;
          setRows(result);
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
  }, [open, slug, type, q]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={text.title}
      widthClass="max-w-2xl"
      footer={
        <>
          {added > 0 && (
            <span className="mr-auto text-[13px] text-[var(--muted)]">
              {text.addedCount(added)}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className={compactPrimaryButtonClass}
          >
            {text.done}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-[var(--muted)]">{text.hint}</p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-[var(--border-strong)] p-0.5">
            {Object.values(CurriculumItemType).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={`rounded-md px-3 py-1.5 text-[13.5px] font-medium transition ${
                  type === value
                    ? 'bg-[var(--accent-bg)] text-white'
                    : 'text-[var(--body)] hover:bg-[var(--hover)]'
                }`}
              >
                {vi.curricula.itemType[value]}
              </button>
            ))}
          </div>
          <SearchInput
            value={query}
            placeholder={text.search}
            onChange={setQuery}
          />
        </div>
        {error && <FormAlert tone="error">{error}</FormAlert>}
        <ul className="flex max-h-[50vh] flex-col gap-1.5 overflow-auto">
          {loading && rows.length === 0 ? (
            <li className="p-4 text-center text-[14px] text-[var(--muted)]">
              {vi.common.loading}
            </li>
          ) : rows.length === 0 ? (
            <li className="p-4 text-center text-[14px] text-[var(--muted)]">
              {text.empty}
            </li>
          ) : (
            rows.map((row) => {
              const inCurriculum = existing.has(
                contentKey(row.itemType, row.id),
              );
              return (
                <li
                  key={row.id}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2"
                >
                  <ItemTypeIcon type={row.itemType} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-[var(--heading)]">
                      {row.title}
                    </span>
                    <span className="block truncate text-[12.5px] text-[var(--muted)]">
                      {row.subtitle}
                    </span>
                  </span>
                  {inCurriculum ? (
                    <span className="inline-flex items-center gap-1 text-[13px] text-[var(--muted)]">
                      <Check size={15} /> {text.added}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onAdd(row);
                        setAdded((count) => count + 1);
                      }}
                      className={secondaryButtonClass}
                    >
                      <Plus size={15} /> {text.add}
                    </button>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </Modal>
  );
}
