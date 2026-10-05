import {
  ClassAttemptState,
  ClassItemLock,
  CurriculumItemType,
  type ClassAttemptSummary,
  type LearnerSessionRef,
} from '@lang/shared';
import { Badge, type BadgeTone } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { formatDateTime } from '@/lib/format';

const text = vi.classLearning;

const STATE_TONE: Record<ClassAttemptState, BadgeTone> = {
  [ClassAttemptState.IN_PROGRESS]: 'accent',
  [ClassAttemptState.PENDING_GRADING]: 'warning',
  [ClassAttemptState.GRADED]: 'neutral',
};

/** Trạng thái lượt thi + điểm % + đậu/trượt. */
export function AttemptResultBadges({
  attempt,
}: {
  attempt: ClassAttemptSummary;
}) {
  return (
    <>
      <Badge tone={STATE_TONE[attempt.state]}>
        {text.state[attempt.state]}
      </Badge>
      {attempt.percent !== null && (
        <Badge tone="neutral">{text.score(attempt.percent)}</Badge>
      )}
      {attempt.passed !== null && (
        <Badge tone={attempt.passed ? 'success' : 'danger'}>
          {attempt.passed ? text.passed : text.failed}
        </Badge>
      )}
    </>
  );
}

/** Lý do mục chưa vào được (mục vẫn hiện — R9). */
export function LockBadge({ lock }: { lock: ClassItemLock }) {
  return (
    <Badge tone={lock === ClassItemLock.DONE ? 'neutral' : 'warning'}>
      {text.lock[lock]}
    </Badge>
  );
}

export const sessionLabel = (session: LearnerSessionRef) =>
  `${text.sessionLabel(session.seq)} · ${formatDateTime(session.startsAt)}`;

/** Nhãn nút mở mục theo loại nội dung. */
export const startLabel = (itemType: CurriculumItemType) =>
  itemType === CurriculumItemType.LESSON ? text.start.lesson : text.start.exam;
