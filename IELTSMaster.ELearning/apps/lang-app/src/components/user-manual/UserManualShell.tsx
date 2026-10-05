'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { MANUAL_ROLES, type ManualRole, type UserManual } from '@lang/shared';
import { Brand } from '@/components/Brand';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { FormAlert, SearchInput, SelectFilter } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/error-message';
import {
  USER_MANUAL_BASE,
  buildSearchIndex,
  filterManualGroups,
  manualPageHref,
  searchManual,
} from '@/lib/user-manual';
import { ThemeToggle } from '@/theme';
import { manualRoleLabel } from './ManualBlocks';

interface UserManualContextValue {
  manual: UserManual;
  /** Vai trò đang lọc; rỗng = mọi vai trò. */
  role: ManualRole | '';
}

const UserManualContext = createContext<UserManualContextValue | null>(null);

export function useUserManual(): UserManualContextValue {
  const value = useContext(UserManualContext);
  if (!value) {
    throw new Error('useUserManual phải dùng bên trong UserManualShell');
  }
  return value;
}

/** Layout `/user-manual`: chỉ System Owner/Admin (API cũng chặn). */
export function UserManualShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth systemManager>
      <ManualLoader>{children}</ManualLoader>
    </RequireAuth>
  );
}

function ManualLoader({ children }: { children: React.ReactNode }) {
  const [manual, setManual] = useState<UserManual | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<UserManual>('/admin/user-manual').then(
      (data) => {
        if (!cancelled) setManual(data);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, vi.userManual.loadFailed));
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <FormAlert tone="error">{error}</FormAlert>
      </div>
    );
  }
  if (!manual) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-[14px] text-[var(--muted)]">
        {vi.common.loading}
      </div>
    );
  }
  return <ManualLayout manual={manual}>{children}</ManualLayout>;
}

const ROLE_OPTIONS = MANUAL_ROLES.map((role) => ({
  value: role,
  label: manualRoleLabel(role),
}));

function ManualLayout({
  manual,
  children,
}: {
  manual: UserManual;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<ManualRole | ''>('');
  // Mobile: sidebar ẩn mặc định, bấm menu để mở.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const index = useMemo(() => buildSearchIndex(manual), [manual]);
  const groups = useMemo(
    () => filterManualGroups(manual.groups, role),
    [manual, role],
  );
  const results = useMemo(() => {
    const visible = new Set(
      groups.flatMap((group) => group.pages.map((page) => page.id)),
    );
    return searchManual(index, query).filter((result) =>
      visible.has(result.page.id),
    );
  }, [index, groups, query]);

  const firstPageId = manual.groups[0]?.pages[0]?.id;
  const activeId =
    pathname === USER_MANUAL_BASE
      ? firstPageId
      : pathname.slice(USER_MANUAL_BASE.length + 1);
  const searching = query.trim() !== '';
  const closeSidebar = () => setSidebarOpen(false);

  const context = useMemo(() => ({ manual, role }), [manual, role]);

  const linkClass = (pageId: string) =>
    `block rounded-lg px-3 py-1.5 text-[14px] transition ${
      pageId === activeId
        ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
        : 'text-[var(--body)] hover:bg-[var(--hover)] hover:text-[var(--heading)]'
    }`;

  return (
    <UserManualContext.Provider value={context}>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg-blur)] backdrop-blur-[10px]">
          <div className="mx-auto flex h-[64px] max-w-[1440px] items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={vi.shell.toggleMenu}
              className="grid h-9 w-9 place-items-center rounded-[10px] text-[var(--body)] transition hover:bg-[var(--hover)] lg:hidden"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link href={USER_MANUAL_BASE} aria-label={vi.userManual.title}>
              <Brand hideLabelOnMobile />
            </Link>
            <span className="hidden h-6 w-px bg-[var(--border-strong)] sm:block" />
            <span className="truncate text-[15px] font-semibold text-[var(--heading)]">
              {vi.userManual.title}
            </span>
            <div className="ml-auto shrink-0">
              <ThemeToggle />
            </div>
            <Link
              href="/admin"
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[14px] font-medium text-[var(--body)] transition hover:bg-[var(--hover)]"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">
                {vi.userManual.backToAdmin}
              </span>
            </Link>
          </div>
        </header>

        <div className="mx-auto flex max-w-[1440px]">
          {/* Backdrop chỉ hiện trên mobile khi sidebar mở. */}
          <div
            onClick={closeSidebar}
            className={`fixed inset-0 top-[64px] z-20 bg-[var(--overlay)] lg:hidden ${
              sidebarOpen ? 'block' : 'hidden'
            }`}
          />
          <aside
            className={`fixed bottom-0 left-0 top-[64px] z-20 flex w-[290px] flex-col border-r border-[var(--border)] bg-[var(--raised)] transition-transform duration-200 lg:sticky lg:h-[calc(100vh-64px)] lg:translate-x-0 lg:bg-transparent ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex shrink-0 flex-col gap-2 border-b border-[var(--border)] p-4">
              <SearchInput
                value={query}
                placeholder={vi.userManual.searchPlaceholder}
                onChange={setQuery}
              />
              <SelectFilter
                value={role}
                allLabel={vi.userManual.allRoles}
                options={ROLE_OPTIONS}
                onChange={setRole}
              />
            </div>

            <nav className="min-h-0 flex-1 overflow-auto px-3 py-4">
              {searching ? (
                <>
                  <div className="px-3 pb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                    {results.length > 0
                      ? vi.userManual.resultCount(results.length)
                      : vi.userManual.noResults}
                  </div>
                  <ul className="space-y-0.5">
                    {results.map(({ page, snippet }) => (
                      <li key={page.id}>
                        <Link
                          href={manualPageHref(page.id)}
                          onClick={closeSidebar}
                          className={linkClass(page.id)}
                        >
                          {page.title}
                          {snippet && (
                            <span className="mt-0.5 block text-[12.5px] font-normal leading-snug text-[var(--muted)]">
                              {snippet}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setRole('');
                    }}
                    className="mx-3 mt-3 text-[13px] font-medium text-[var(--accent)] hover:underline"
                  >
                    {vi.userManual.clearFilters}
                  </button>
                </>
              ) : (
                groups.map((group) => (
                  <div key={group.id} className="mb-4">
                    <div className="px-3 pb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
                      {group.title}
                    </div>
                    <ul className="space-y-0.5">
                      {group.pages.map((page) => (
                        <li key={page.id}>
                          <Link
                            href={manualPageHref(page.id)}
                            onClick={closeSidebar}
                            className={linkClass(page.id)}
                          >
                            {page.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </nav>
          </aside>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </UserManualContext.Provider>
  );
}
