'use client';

import type { ChildClassDetail } from '@lang/shared';
import { LearnerClassBoard } from '@/components/class-learning/LearnerClassView';
import { childPath } from '@/lib/guardian-api';
import { ManualAnswerList } from './guardian-ui';

/**
 * Trang lớp của con dưới góc nhìn phụ huynh: đúng giao diện trang lớp của học
 * viên nhưng `readOnly` (không vào học/làm bài, không mở bài làm) và mỗi mục
 * kèm nhận xét chấm tay (R19.1–2). Nhận dữ liệu qua prop nên render/kiểm được
 * không cần gọi API.
 */
export function ChildClassBoard({
  slug,
  detail,
}: {
  slug: string;
  detail: ChildClassDetail;
}) {
  return (
    <LearnerClassBoard
      slug={slug}
      detail={detail.classroom}
      starting={null}
      onStart={() => undefined}
      readOnly
      // Lịch của con nằm ở trang tổng quan của con.
      scheduleHref={childPath(slug, detail.child.membershipId)}
      itemExtra={(item) => (
        <ManualAnswerList
          answers={
            detail.manualAnswers[
              item.attempt?.id ?? item.lessonAttempt?.attemptId ?? ''
            ]
          }
        />
      )}
    />
  );
}
