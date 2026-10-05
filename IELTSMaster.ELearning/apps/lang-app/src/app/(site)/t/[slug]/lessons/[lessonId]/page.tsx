import { RequireAuth } from '@/components/auth/RequireAuth';
import { LearnerLessonDetailView } from '@/components/lesson-learning/LearnerLessonDetailView';

// Thông tin bài học đã publish, bắt đầu / học tiếp và các lượt học của tôi.
export default function LearnerLessonPage({
  params,
}: {
  params: { slug: string; lessonId: string };
}) {
  return (
    <RequireAuth>
      <LearnerLessonDetailView slug={params.slug} lessonId={params.lessonId} />
    </RequireAuth>
  );
}
