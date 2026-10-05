import { RequireAuth } from '@/components/auth/RequireAuth';
import { ChildClassView } from '@/components/guardian/ChildClassView';

// Trang lớp của con: giáo trình lớp và kết quả từng mục, chỉ xem.
export default function ChildClassPage({
  params,
}: {
  params: { slug: string; membershipId: string; classId: string };
}) {
  return (
    <RequireAuth>
      <ChildClassView
        slug={params.slug}
        membershipId={params.membershipId}
        classId={params.classId}
      />
    </RequireAuth>
  );
}
