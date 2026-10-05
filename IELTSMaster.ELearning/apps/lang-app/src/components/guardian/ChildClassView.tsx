'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ChildClassDetail } from '@lang/shared';
import { FormAlert } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import { childPath, getChildClass } from '@/lib/guardian-api';
import { ChildClassBoard } from './ChildClassBoard';

const text = vi.guardian;

/** Trang lớp của con: dùng lại giao diện trang lớp của học viên, chỉ đọc. */
export function ChildClassView({
  slug: rawSlug,
  membershipId,
  classId,
}: {
  slug: string;
  membershipId: string;
  classId: string;
}) {
  const slug = rawSlug.toLowerCase();
  const [data, setData] = useState<ChildClassDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getChildClass(slug, membershipId, classId).then(
      (result) => {
        if (!cancelled) setData(result);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, text.loadError));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, membershipId, classId]);

  const back = (
    <Link
      prefetch={false}
      href={childPath(slug, membershipId)}
      className="inline-flex w-fit items-center gap-1.5 text-[13.5px] font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
    >
      <ArrowLeft size={15} />{' '}
      {text.backToChild(data?.child.fullName ?? vi.guardian.heading)}
    </Link>
  );

  if (error) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-16">
        <FormAlert tone="error">{error}</FormAlert>
        {back}
      </div>
    );
  }
  if (!data) {
    return (
      <p className="py-24 text-center text-[14px] text-[var(--muted)]">
        {vi.common.loading}
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-8">
      {back}
      <ChildClassBoard slug={slug} detail={data} />
    </div>
  );
}
