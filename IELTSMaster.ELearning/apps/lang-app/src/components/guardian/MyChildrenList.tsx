'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Users } from 'lucide-react';
import type { GuardianChild } from '@lang/shared';
import { FormAlert } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { ApiError } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import { childPath, listMyChildren } from '@/lib/guardian-api';
import { ChildBadges } from './guardian-ui';

const text = vi.guardian;

/**
 * "Con của tôi" ở trang trung tâm (R19.4). Người không có vai trò Phụ huynh
 * nhận 403 ở API nên khối này tự ẩn; người vừa là Học viên vừa là Phụ huynh
 * thấy cả "Lớp của tôi" lẫn khối này.
 */
export function MyChildrenList({ slug }: { slug: string }) {
  const [children, setChildren] = useState<GuardianChild[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMyChildren(slug).then(
      (result) => {
        if (!cancelled) setChildren(result);
      },
      (err: unknown) => {
        if (cancelled) return;
        // Không phải Phụ huynh: khối này không thuộc về họ, ẩn luôn.
        if (err instanceof ApiError && err.status === 403) return;
        setError(errorMessage(err, vi.common.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) return <FormAlert tone="error">{error}</FormAlert>;
  if (!children || children.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
        {text.heading}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {children.map((child) => (
          <li key={child.membershipId}>
            <Link
              prefetch={false}
              href={childPath(slug, child.membershipId)}
              className="group flex h-full flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition hover:border-[var(--accent)] hover:shadow-[0_12px_28px_var(--shadow-1)]"
            >
              <div className="flex items-center gap-2">
                <Users size={18} className="shrink-0 text-[var(--muted)]" />
                <span className="min-w-0 flex-1 truncate text-[16px] font-bold text-[var(--heading)]">
                  {child.fullName}
                </span>
                <ChevronRight
                  size={16}
                  className="shrink-0 transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
                />
              </div>
              <ChildBadges child={child} />
              <p className="mt-auto text-[12.5px] text-[var(--muted)]">
                {text.classCount(child.classCount)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
