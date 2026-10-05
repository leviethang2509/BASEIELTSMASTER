// Khối nội dung có tiêu đề trong trang form (tài khoản, đăng ký trung tâm).
export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold text-[var(--heading)]">
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-[13.5px] text-[var(--body)]">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}
