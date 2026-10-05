import { ExamStatus } from '@lang/shared';
import { Badge, type BadgeTone } from '@/components/ui';
import { vi } from '@/i18n/vi';

const TONE: Record<ExamStatus, BadgeTone> = {
  [ExamStatus.DRAFT]: 'neutral',
  [ExamStatus.PUBLISHED]: 'success',
  [ExamStatus.ARCHIVED]: 'warning',
};

export function ExamStatusBadge({ status }: { status: ExamStatus }) {
  return <Badge tone={TONE[status]}>{vi.exams.status[status]}</Badge>;
}
