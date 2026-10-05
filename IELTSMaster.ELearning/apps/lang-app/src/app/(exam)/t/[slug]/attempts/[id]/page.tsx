import { AttemptRunner } from '@/components/exam-taking/AttemptRunner';

// Trang thi toàn màn hình (layout `(exam)` đã bọc RequireAuth).
export default function AttemptPage({
  params,
}: {
  params: { slug: string; id: string };
}) {
  return <AttemptRunner slug={params.slug} attemptId={params.id} />;
}
