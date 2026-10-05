import Link from 'next/link';
import { Brand } from '@/components/Brand';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeaderNav } from '@/components/site/SiteHeaderNav';
import { vi } from '@/i18n/vi';

const navLinkClass = 'transition hover:text-[var(--heading)]';

// Layout khu vực chính theo design/Home.html: header dính mờ nền, footer tối.
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg-blur)] backdrop-blur-[10px]">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center gap-3 px-5">
          <Link href="/" aria-label={vi.app.name}>
            <Brand hideLabelOnMobile />
          </Link>
          <nav className="ml-6 hidden items-center gap-6 text-[14.5px] font-medium text-[var(--body)] md:flex">
            <Link href="/#features" className={navLinkClass}>
              {vi.site.navFeatures}
            </Link>
            <Link href="/#pricing" className={navLinkClass}>
              {vi.site.navPlans}
            </Link>
          </nav>
          <SiteHeaderNav />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <SiteFooter />
    </div>
  );
}
