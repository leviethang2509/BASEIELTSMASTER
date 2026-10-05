import { ClassroomStatus } from '@lang/shared';
import { Badge, type BadgeTone } from '@/components/ui';
import { vi } from '@/i18n/vi';

export const CLASSROOM_STATUS_TONE: Record<ClassroomStatus, BadgeTone> = {
  [ClassroomStatus.UPCOMING]: 'accent',
  [ClassroomStatus.ONGOING]: 'success',
  [ClassroomStatus.FINISHED]: 'neutral',
  [ClassroomStatus.CANCELLED]: 'danger',
};

export function ClassroomStatusBadge({ status }: { status: ClassroomStatus }) {
  return (
    <Badge tone={CLASSROOM_STATUS_TONE[status]}>
      {vi.classes.status[status]}
    </Badge>
  );
}
