import { LessonAttemptStatus } from '@lang/shared';
import { Badge } from '@/components/ui';
import { vi } from '@/i18n/vi';

/** Đang học / Đã học xong. */
export function LessonStatusBadge({ status }: { status: LessonAttemptStatus }) {
  return (
    <Badge
      tone={status === LessonAttemptStatus.COMPLETED ? 'success' : 'accent'}
    >
      {vi.lessonLearning.status[status]}
    </Badge>
  );
}
