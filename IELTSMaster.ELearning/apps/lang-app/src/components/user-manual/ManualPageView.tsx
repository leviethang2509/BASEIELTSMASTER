'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ManualPage } from '@lang/shared';
import { vi } from '@/i18n/vi';
import { formatDate } from '@/lib/format';
import {
  USER_MANUAL_BASE,
  allManualPages,
  filterManualGroups,
  manualPageHref,
  manualToc,
  type ManualTocItem,
} from '@/lib/user-manual';
import { ManualBlocks } from './ManualBlocks';
import { useUserManual } from './UserManualShell';

/** Nội dung một trang; `pageId` rỗng = trang đầu tiên. */
export function ManualPageView({ pageId }: { pageId: string | null }) {
  const { manual, role } = useUserManual();
  const pages = useMemo(() => allManualPages(manual), [manual]);
  const page = pageId ? pages.find((item) => item.id === pageId) : pages[0];
  const group = manual.groups.find((item) =>
    item.pages.some((candidate) => candidate === page),
  );

  // Trước/Sau đi theo danh sách đang lọc; trang hiện tại không thuộc bộ lọc
  // thì dùng danh sách đầy đủ.
  const [previous, next] = useMemo(() => {
    if (!page) return [undefined, undefined];
    const filtered = filterManualGroups(manual.groups, role).flatMap(
      (item) => item.pages,
    );
    const order = filtered.includes(page) ? filtered : pages;
    const at = order.indexOf(page);
    return [order[at - 1], order[at + 1]];
  }, [manual, role, page, pages]);

  const toc = useMemo(() => (page ? manualToc(page) : []), [page]);

  useEffect(() => {
    if (page) document.title = `${page.title} · ${vi.userManual.title}`;
  }, [page]);

  if (!page) {
    return (
      <div className="px-5 py-16 text-center sm:px-10">
        <h1 className="text-[22px] font-bold text-[var(--heading)]">
          {vi.userManual.pageNotFound}
        </h1>
        <p className="mt-2 text-[14.5px] text-[var(--body)]">
          {vi.userManual.pageNotFoundText}
        </p>
        <Link
          href={USER_MANUAL_BASE}
          className="mt-5 inline-block font-medium text-[var(--accent)] hover:underline"
        >
          {vi.userManual.openFirstPage}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-10 px-5 py-8 sm:px-10">
      <article className="min-w-0 max-w-[820px] flex-1">
        <div className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
          {group?.title}
        </div>
        <h1 className="mt-1.5 text-[28px] font-bold leading-tight text-[var(--heading)]">
          {page.title}
        </h1>
        <p className="mt-2 text-[16px] leading-relaxed text-[var(--body)]">
          {page.summary}
        </p>
        <div className="mt-2 font-mono text-[12px] text-[var(--muted)]">
          {vi.userManual.updatedAt(formatDate(manual.updatedAt))}
        </div>

        <div className="mt-7">
          <ManualBlocks blocks={page.blocks} />
        </div>

        <nav className="mt-12 grid gap-3 border-t border-[var(--border)] pt-6 sm:grid-cols-2">
          {previous ? (
            <PagerLink page={previous} direction="previous" />
          ) : (
            <span />
          )}
          {next && <PagerLink page={next} direction="next" />}
        </nav>
      </article>

      {toc.length > 0 && <Toc items={toc} />}
    </div>
  );
}

function PagerLink({
  page,
  direction,
}: {
  page: ManualPage;
  direction: 'previous' | 'next';
}) {
  const isNext = direction === 'next';
  return (
    <Link
      href={manualPageHref(page.id)}
      className={`group flex items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3 transition hover:border-[var(--accent)] hover:bg-[var(--card)] ${
        isNext ? 'justify-end text-right sm:col-start-2' : ''
      }`}
    >
      {!isNext && (
        <ChevronLeft size={18} className="shrink-0 text-[var(--muted)]" />
      )}
      <span className="min-w-0">
        <span className="block text-[12px] text-[var(--muted)]">
          {isNext ? vi.userManual.next : vi.userManual.previous}
        </span>
        <span className="block truncate font-semibold text-[var(--heading)] group-hover:text-[var(--accent)]">
          {page.title}
        </span>
      </span>
      {isNext && (
        <ChevronRight size={18} className="shrink-0 text-[var(--muted)]" />
      )}
    </Link>
  );
}

// Header dính cao 64px; heading đã qua mốc này coi như đang đọc.
const ACTIVE_OFFSET = 120;

function Toc({ items }: { items: ManualTocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      let current: string | null = null;
      for (const item of items) {
        const element = document.getElementById(item.id);
        if (element && element.getBoundingClientRect().top <= ACTIVE_OFFSET) {
          current = item.id;
        }
      }
      setActiveId(current ?? items[0]?.id ?? null);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [items]);

  return (
    <aside className="hidden w-[230px] shrink-0 xl:block">
      <div className="sticky top-[96px] max-h-[calc(100vh-128px)] overflow-auto">
        <div className="pb-2 text-[11.5px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
          {vi.userManual.toc}
        </div>
        <ul className="space-y-1 border-l border-[var(--border)]">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={`-ml-px block border-l-2 py-1 text-[13px] leading-snug transition ${
                  item.level === 3 ? 'pl-6' : 'pl-3'
                } ${
                  item.id === activeId
                    ? 'border-[var(--accent)] font-semibold text-[var(--accent)]'
                    : 'border-transparent text-[var(--body)] hover:text-[var(--heading)]'
                }`}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
