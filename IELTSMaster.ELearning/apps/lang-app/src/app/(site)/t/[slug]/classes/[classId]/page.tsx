import { RequireAuth } from '@/components/auth/RequireAuth';
import { LearnerClassView } from '@/components/class-learning/LearnerClassView';

// Trang lớp của học viên: giáo trình lớp, trạng thái từng mục, buổi sắp tới.
export default function LearnerClassPage({
  params,
}: {
  params: { slug: string; classId: string };
}) {
  return (
    <RequireAuth>
      <LearnerClassView slug={params.slug} classId={params.classId} />
    </RequireAuth>
  );
}
