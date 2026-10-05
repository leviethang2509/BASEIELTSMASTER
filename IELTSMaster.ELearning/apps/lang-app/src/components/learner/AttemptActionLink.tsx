import Link from 'next/link';
import { AttemptStatus, type LearnerAttemptItem } from '@lang/shared';
import { secondaryButtonClass } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { attemptPath, attemptResultPath } from '@/lib/learner-api';

/** Làm tiếp lượt đang dở, hoặc xem kết quả lượt đã nộp. */
export function AttemptActionLink({
  slug,
  item,
}: {
  slug: string;
  item: LearnerAttemptItem;
}) {
  const inProgress = item.status === AttemptStatus.IN_PROGRESS;
  return (
    <Link
      // Route cần đăng nhập (middleware): không prefetch.
      prefetch={false}
      href={
        inProgress
          ? attemptPath(slug, item.id)
          : attemptResultPath(slug, item.id)
      }
      className={`${secondaryButtonClass} !px-3 !py-1.5 !text-[13px]`}
    >
      {inProgress ? vi.learner.continue : vi.learner.viewResult}
    </Link>
  );
}
