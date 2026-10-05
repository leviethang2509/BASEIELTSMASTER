import { RequireAuth } from '@/components/auth/RequireAuth';
import { AttemptResultView } from '@/components/learner/AttemptResultView';

// Kết quả lượt làm (chỉ chủ lượt làm, sau khi nộp hết).
export default function AttemptResultPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  return (
    <RequireAuth>
      <AttemptResultView slug={params.slug} attemptId={params.id} />
    </RequireAuth>
  );
}
