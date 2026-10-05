'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Users } from 'lucide-react';
import type { GuardianChild } from '@lang/shared';
import { FormAlert } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { childPath, listMyChildren } from '@/lib/guardian-api';
import { ChildBadges } from './guardian-ui';

const text = vi.guardian;

/** Trang "Con của tôi": chọn con để xem lớp, lịch và kết quả (R19.4). */
export function ChildrenView({ slug: rawSlug }: { slug: string }) {
  const slug = rawSlug.toLowerCase();
  const [children, setChildren] = useState<GuardianChild[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMyChildren(slug).then(
      (result) => {
        if (!cancelled) setChildren(result);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, text.loadError));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 px-5 py-8">
      <Link
        href={`/t/${slug}`}
        className="inline-flex w-fit items-center gap-1.5 text-[13.5px] font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
      >
        <ArrowLeft size={15} /> {vi.classLearning.backToTenant}
      </Link>
      <h1 className="text-[22px] font-bold leading-tight text-[var(--heading)]">
        {text.heading}
      </h1>
      <p className="text-[13.5px] text-[var(--body)]">{text.hint}</p>

      {error && <FormAlert tone="error">{error}</FormAlert>}
      {!error && !children && (
        <p className="py-16 text-center text-[14px] text-[var(--muted)]">
          {vi.common.loading}
        </p>
      )}
      {children && children.length === 0 && (
        <FormAlert tone="info">{text.empty}</FormAlert>
      )}
      {children && children.length > 0 && (
        <ul className="flex flex-col gap-2">
          {children.map((child) => (
            <li key={child.membershipId}>
              <Link
                prefetch={false}
                href={childPath(slug, child.membershipId)}
                className="group flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 transition hover:border-[var(--accent)]"
              >
                <Users size={18} className="shrink-0 text-[var(--muted)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-[var(--heading)]">
                    {child.fullName}
                  </span>
                  <span className="block truncate text-[12.5px] text-[var(--muted)]">
                    {child.email} · {text.classCount(child.classCount)}
                  </span>
                </span>
                <ChildBadges child={child} />
                <ChevronRight
                  size={16}
                  className="shrink-0 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
