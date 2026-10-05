import { RequireAuth } from '@/components/auth/RequireAuth';

// Layout toàn màn hình cho trang thi: không header/sidebar.
export default function ExamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <RequireAuth>{children}</RequireAuth>
    </div>
  );
}
