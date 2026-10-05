import { RequireAuth } from '@/components/auth/RequireAuth';
import { LearnerExamDetailView } from '@/components/learner/LearnerExamDetailView';

// Thông tin đề đã publish, bắt đầu / làm tiếp và lịch sử lượt làm.
export default function LearnerExamPage({
  params,
}: {
  params: { slug: string; examId: string };
}) {
  return (
    <RequireAuth>
      <LearnerExamDetailView slug={params.slug} examId={params.examId} />
    </RequireAuth>
  );
}
