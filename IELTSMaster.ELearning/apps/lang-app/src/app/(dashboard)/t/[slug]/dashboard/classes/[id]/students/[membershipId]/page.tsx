'use client';

import { StudentAttemptsView } from '@/components/classes/StudentAttemptsView';
import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';

/**
 * Bài làm chi tiết của một học viên trong lớp (req-3 Step 10, F4): giáo viên
 * của lớp và Owner/Admin xem đáp án học viên và đúng/sai từng câu.
 */
export default function ClassStudentAttemptsPage({
  params,
}: {
  params: { id: string; membershipId: string };
}) {
  const { tenant } = useTenantDashboard();
  return (
    <StudentAttemptsView
      slug={tenant.slug}
      classId={params.id}
      membershipId={params.membershipId}
    />
  );
}
