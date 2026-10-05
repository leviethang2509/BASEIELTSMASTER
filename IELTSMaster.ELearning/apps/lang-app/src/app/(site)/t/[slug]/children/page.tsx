import { RequireAuth } from '@/components/auth/RequireAuth';
import { ChildrenView } from '@/components/guardian/ChildrenView';

// "Con của tôi" (req-3 Step 13): phụ huynh chọn con để xem kết quả học tập.
export default function ChildrenPage({ params }: { params: { slug: string } }) {
  return (
    <RequireAuth>
      <ChildrenView slug={params.slug} />
    </RequireAuth>
  );
}
