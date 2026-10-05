'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LearnerAttemptItem } from '@lang/shared';
import { vi } from '@/i18n/vi';
import { formatDateTime } from '@/lib/format';
import { learnerExamPath, listMyAttempts } from '@/lib/learner-api';
import { AttemptActionLink } from './AttemptActionLink';
import { AttemptStatusBadge, attemptScoreText } from './AttemptStatusBadge';

const LIMIT = 5;
const text = vi.learner;

/** Vài lượt làm mới nhất của tôi trong trung tâm; ẩn khi chưa có. */
export function MyRecentAttempts({ slug }: { slug: string }) {
  const [items, setItems] = useState<LearnerAttemptItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    listMyAttempts(slug, { page: 1, pageSize: LIMIT }).then(
      (result) => {
        if (!cancelled) setItems(result.items);
      },
      // Phần phụ của trang: lỗi thì chỉ không hiện.
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (items.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
        {text.recentAttempts}
      </h2>
      <ul className="mt-3 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="min-w-0 flex-1">
              <Link
                prefetch={false}
                href={learnerExamPath(slug, item.exam.id)}
                className="font-semibold text-[var(--heading)] hover:text-[var(--accent)]"
              >
                {item.exam.title}
              </Link>
              <p className="text-[12.5px] text-[var(--muted)]">
                {text.startedAt(formatDateTime(item.startedAt))} ·{' '}
                {attemptScoreText(item)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <AttemptStatusBadge status={item.status} />
              <AttemptActionLink slug={slug} item={item} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
