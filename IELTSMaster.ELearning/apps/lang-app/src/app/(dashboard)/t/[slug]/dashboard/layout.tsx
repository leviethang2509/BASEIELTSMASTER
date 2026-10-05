import { TenantDashboardShell } from '@/components/dashboard/TenantDashboardShell';

// Dashboard tenant cho Owner/Admin/Teacher; roles lấy từ membership thật.
export default function TenantDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  return (
    <TenantDashboardShell slug={params.slug}>{children}</TenantDashboardShell>
  );
}
