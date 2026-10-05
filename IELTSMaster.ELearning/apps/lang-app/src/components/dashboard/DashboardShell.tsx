'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/theme';
import {
  findActiveItem,
  navigationFor,
  type NavScope,
} from '@/config/navigation';
import { vi } from '@/i18n/vi';
import { initials } from '@/lib/initials';
import { WorkspaceSwitcher, type WorkspaceOption } from './WorkspaceSwitcher';

export interface ShellUser {
  fullName: string;
  email: string;
}

interface DashboardShellProps {
  scope: NavScope;
  /** Lấy từ AuthProvider qua `AuthedDashboardShell`. */
  user: ShellUser | null;
  workspaces: WorkspaceOption[];
  currentWorkspaceKey: string;
  onLogout?: () => void;
  children: React.ReactNode;
}

const navItemBase =
  'flex w-full items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[14px] font-medium transition';
const navItemClass = `${navItemBase} text-[var(--body)] hover:bg-[var(--hover)]`;
const navItemActiveClass = `${navItemClass} bg-[var(--accent-soft)] !text-[var(--accent)]`;

// Layout dashboard copy từ lightc-general (sidebar 260px, header 68px), menu
// lấy từ cấu hình theo ngữ cảnh thay vì hardcode, thêm switcher không gian.
export function DashboardShell({
  scope,
  user,
  workspaces,
  currentWorkspaceKey,
  onLogout,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  // Mobile: sidebar ẩn mặc định, bấm menu để mở (desktop luôn hiện).
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sections = navigationFor(scope);
  const activeItem = findActiveItem(sections, pathname);
  const fallbackWorkspaceLabel =
    scope.kind === 'system' ? vi.shell.systemWorkspace : scope.slug;

  return (
    // Khung cố định đúng chiều cao màn hình: `main` mới có chiều cao xác định
    // để các trang dùng `h-full` (bảng, danh sách) tự cuộn bên trong.
    <div className="flex h-screen overflow-hidden">
      {/* Backdrop chỉ hiện trên mobile khi sidebar mở. */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-30 bg-[var(--overlay)] sm:hidden ${
          sidebarOpen ? 'block' : 'hidden'
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] transition-transform duration-200 sm:static sm:z-auto sm:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[68px] shrink-0 items-center border-b border-[var(--border)] px-5">
          <Brand />
        </div>

        <div className="shrink-0 px-3 pt-3.5">
          <WorkspaceSwitcher
            workspaces={workspaces}
            currentKey={currentWorkspaceKey}
            fallbackLabel={fallbackWorkspaceLabel}
          />
        </div>

        <nav className="min-h-0 flex-1 overflow-auto px-3 py-3.5">
          {sections.map((section, index) => (
            <div
              key={section.label ?? `section-${index}`}
              className={
                index > 0 ? 'mt-3 border-t border-[var(--border)] pt-3' : ''
              }
            >
              {section.label && (
                <div className="px-3.5 pb-2.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
                  {section.label}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={
                      activeItem?.href === item.href
                        ? navItemActiveClass
                        : navItemClass
                    }
                  >
                    <item.icon size={18} className="shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Thẻ người dùng */}
        <div className="flex shrink-0 items-center gap-2 border-t border-[var(--border)] px-3 py-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-3 px-1.5 py-1">
            <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[13px] font-semibold text-[var(--accent)]">
              {initials(user?.fullName)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-semibold text-[var(--fg)]">
                {user?.fullName ?? vi.shell.notSignedIn}
              </span>
              <span className="block truncate font-mono text-[12px] text-[var(--muted)]">
                {user?.email ?? '—'}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            disabled={!onLogout}
            aria-label={vi.auth.logout}
            title={vi.auth.logout}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--accent)] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--muted)]"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Cột nội dung */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[68px] shrink-0 items-center gap-4 border-b border-[var(--border)] bg-[var(--bg)] px-5 sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={vi.shell.toggleMenu}
            className="grid h-9 w-9 place-items-center rounded-[10px] text-[var(--body)] transition hover:bg-[var(--hover)] sm:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="text-[15px] font-semibold text-[var(--fg)]">
            {activeItem?.label ?? vi.nav.overview}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell />
          </div>

          {/* Mobile đã có thẻ người dùng trong sidebar, ẩn để tiêu đề không xuống dòng. */}
          {user && (
            <div className="hidden items-center gap-3 px-2 py-1.5 sm:flex">
              <span className="text-right">
                <span className="block text-[13.5px] font-semibold text-[var(--fg)]">
                  {user.fullName}
                </span>
                <span className="block font-mono text-[12px] text-[var(--muted)]">
                  {user.email}
                </span>
              </span>
              <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-[var(--accent-soft)] text-[13px] font-semibold text-[var(--accent)]">
                {initials(user.fullName)}
              </span>
            </div>
          )}
        </header>

        <main className="min-h-0 flex-1 overflow-auto bg-[var(--bg)]">
          {children}
        </main>
      </div>
    </div>
  );
}
