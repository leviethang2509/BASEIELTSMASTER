import { RequireAuth } from '@/components/auth/RequireAuth';
import { ChildView } from '@/components/guardian/ChildView';

// Trang tổng quan của một người con: lớp, lịch học và bài làm ngoài lớp.
export default function ChildPage({
  params,
}: {
  params: { slug: string; membershipId: string };
}) {
  return (
    <RequireAuth>
      <ChildView slug={params.slug} membershipId={params.membershipId} />
    </RequireAuth>
  );
}
