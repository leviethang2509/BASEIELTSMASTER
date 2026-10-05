'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ExamElement } from '@lang/exam-core';
import { AttemptSectionStatus, type AttemptView } from '@lang/shared';
import { FormAlert, secondaryButtonClass } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import {
  attemptResultPath,
  getAttempt,
  learnerExamPath,
} from '@/lib/learner-api';
import { SectionIntroScreen } from './SectionIntroScreen';
import { SectionWorkspace } from './SectionWorkspace';

const text = vi.examTaking;

/**
 * Trang thi toàn màn hình: màn hình hướng dẫn của section tới lượt → làm bài
 * có đồng hồ → nộp → section kế... Nộp hết thì chuyển sang trang kết quả.
 * Trạng thái luôn lấy từ server, tải lại trang là làm tiếp đúng chỗ.
 */
export function AttemptRunner({
  slug: rawSlug,
  attemptId,
}: {
  slug: string;
  attemptId: string;
}) {
  const slug = rawSlug.toLowerCase();
  const router = useRouter();
  const [view, setView] = useState<AttemptView | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((next: AttemptView) => {
    setClockOffsetMs(Date.parse(next.serverNow) - Date.now());
    setView(next);
  }, []);

  const reload = useCallback(() => {
    getAttempt(slug, attemptId).then(apply, (err: unknown) =>
      setError(errorMessage(err, text.loadFailed)),
    );
  }, [slug, attemptId, apply]);

  useEffect(reload, [reload]);

  const finished = !!view && !view.current;
  useEffect(() => {
    if (finished) router.replace(attemptResultPath(slug, attemptId));
  }, [finished, router, slug, attemptId]);

  if (error) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-16">
        <FormAlert tone="error">{error}</FormAlert>
        <Link
          href={`/t/${slug}`}
          className={`${secondaryButtonClass} self-start`}
        >
          {vi.learner.backToTenant}
        </Link>
      </div>
    );
  }
  if (!view) {
    return (
      <p className="py-24 text-center text-[14px] text-[var(--muted)]">
        {vi.common.loading}
      </p>
    );
  }
  if (!view.current) {
    return (
      <p className="py-24 text-center text-[14px] text-[var(--muted)]">
        {text.finished}
      </p>
    );
  }

  const { current } = view;
  const sectionIndex = view.sections.findIndex(
    (section) => section.id === current.sectionId,
  );
  const exitHref = learnerExamPath(slug, view.exam.id);

  if (current.status === AttemptSectionStatus.NOT_STARTED) {
    return (
      <SectionIntroScreen
        key={current.sectionId}
        slug={slug}
        view={view}
        sectionIndex={sectionIndex}
        intro={current.intro as ExamElement[]}
        exitHref={exitHref}
        onView={apply}
        onReload={reload}
      />
    );
  }
  return (
    <SectionWorkspace
      // Section mới là một bộ ô nhập mới.
      key={current.sectionId}
      slug={slug}
      view={view}
      current={current}
      sectionIndex={sectionIndex}
      clockOffsetMs={clockOffsetMs}
      exitHref={exitHref}
      onView={apply}
      onReload={reload}
    />
  );
}
