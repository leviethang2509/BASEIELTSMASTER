import { RequireAuth } from '@/components/auth/RequireAuth';
import { LessonAttemptScreen } from '@/components/lesson-learning/LessonAttemptScreen';

// Màn hình học bài (layout khu vực chính, không toàn màn hình).
export default function LessonAttemptPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  return (
    <RequireAuth>
      <LessonAttemptScreen slug={params.slug} attemptId={params.id} />
    </RequireAuth>
  );
}
