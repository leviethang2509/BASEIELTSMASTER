'use client';

import { useTenantDashboard } from '@/components/dashboard/TenantDashboardShell';
import { GradingAttemptView } from '@/components/grading/GradingAttemptView';

/** Chấm một lượt làm (Owner/Admin/Teacher, trừ bài của chính mình). */
export default function GradingAttemptPage({
  params,
}: {
  params: { attemptId: string };
}) {
  const { tenant } = useTenantDashboard();
  return <GradingAttemptView slug={tenant.slug} attemptId={params.attemptId} />;
}
