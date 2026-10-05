import { initials } from '@/lib/initials';

const sizeClass = {
  md: 'h-11 w-11 rounded-xl text-[15px]',
  lg: 'h-[72px] w-[72px] rounded-2xl text-[24px]',
} as const;

// Logo trung tâm; chưa có logo thì hiện chữ cái đầu của tên.
export function TenantAvatar({
  name,
  logoUrl = null,
  size = 'md',
}: {
  name: string;
  logoUrl?: string | null;
  size?: keyof typeof sizeClass;
}) {
  if (logoUrl) {
    return (
      // Ảnh từ R2 (domain đặt trong env, cố định lúc build) nên không dùng next/image.
      // Logo nền trong suốt: lót `--img-mat` (trắng ở theme tối) thay vì lọc sáng
      // ảnh của người dùng; logo đặc thì `object-cover` che kín nền lót.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        aria-hidden
        className={`shrink-0 bg-[var(--img-mat)] object-cover ${sizeClass[size]}`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center bg-[var(--accent-soft)] font-bold text-[var(--accent)] ${sizeClass[size]}`}
    >
      {initials(name)}
    </span>
  );
}
