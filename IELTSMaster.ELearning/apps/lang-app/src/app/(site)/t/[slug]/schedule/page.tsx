import { RequireAuth } from '@/components/auth/RequireAuth';
import { LearnerSchedulePage } from '@/components/class-learning/LearnerSchedulePage';

// "Lịch học của tôi": buổi học của các lớp mình đang học (R16).
export default function MySchedulePage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <RequireAuth>
      <LearnerSchedulePage slug={params.slug} />
    </RequireAuth>
  );
}
