import { AttemptStatus, type LearnerAttemptItem } from '@lang/shared';
import { Badge, type BadgeTone } from '@/components/ui';
import { vi } from '@/i18n/vi';

const TONE: Record<AttemptStatus, BadgeTone> = {
  [AttemptStatus.IN_PROGRESS]: 'accent',
  [AttemptStatus.SUBMITTED]: 'warning',
  [AttemptStatus.GRADED]: 'success',
};

export function AttemptStatusBadge({ status }: { status: AttemptStatus }) {
  return <Badge tone={TONE[status]}>{vi.learner.attemptStatus[status]}</Badge>;
}

/** Số câu đúng khi đã nộp hết; đang làm thì hiện tiến độ section. */
export function attemptScoreText(item: LearnerAttemptItem): string {
  return item.status === AttemptStatus.IN_PROGRESS
    ? vi.learner.sectionProgress(item.submittedSectionCount, item.sectionCount)
    : vi.learner.score(item.autoCorrect, item.autoTotal);
}
