'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, LayoutGrid } from 'lucide-react';
import { vi } from '@/i18n/vi';

export interface WorkspaceOption {
  key: string;
  label: string;
  /** Dòng phụ, vd danh sách role trong tenant. */
  description?: string;
  href: string;
  /** Lấy access token mới trước khi chuyển workspace, vd. AuthService switch-tenant. */
  activate?: () => Promise<void>;
}

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceOption[];
  currentKey: string;
  /** Nhãn hiển thị khi chưa có danh sách không gian (chưa đăng nhập). */
  fallbackLabel: string;
}

// Chuyển giữa "Quản trị hệ thống" và các tenant mà user là thành viên.
export function WorkspaceSwitcher({
  workspaces,
  currentKey,
  fallbackLabel,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activatingKey, setActivatingKey] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = workspaces.find((workspace) => workspace.key === currentKey);
  // Luôn mở được khi đã đăng nhập: cuối danh sách có lối về `/me`.
  const canSwitch = workspaces.length > 0;

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => canSwitch && setOpen((value) => !value)}
        aria-haspopup={canSwitch ? 'listbox' : undefined}
        aria-expanded={canSwitch ? open : undefined}
        title={canSwitch ? vi.shell.switchWorkspace : undefined}
        className={`flex w-full items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-left transition ${
          canSwitch ? 'hover:border-[var(--border-strong)]' : 'cursor-default'
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-[var(--heading)]">
            {current?.label ?? fallbackLabel}
          </span>
          {current?.description && (
            <span className="block truncate text-[12px] text-[var(--muted)]">
              {current.description}
            </span>
          )}
        </span>
        {canSwitch && (
          <ChevronsUpDown size={16} className="shrink-0 text-[var(--muted)]" />
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-[320px] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-[0_10px_26px_var(--shadow-2)]"
        >
          {workspaces.map((workspace) => {
            const selected = workspace.key === currentKey;
            return (
              <Link
                key={workspace.key}
                href={workspace.href}
                role="option"
                aria-selected={selected}
                onClick={(event) => {
                  setOpen(false);
                  if (!workspace.activate) return;
                  event.preventDefault();
                  setActivatingKey(workspace.key);
                  void workspace
                    .activate()
                    .then(
                      () => router.push(workspace.href),
                      () => undefined,
                    )
                    .finally(() => setActivatingKey(null));
                }}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 transition hover:bg-[var(--hover)]"
              >
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[13.5px] ${
                      selected
                        ? 'font-semibold text-[var(--accent)]'
                        : 'text-[var(--body)]'
                    }`}
                  >
                    {workspace.label}
                  </span>
                  {workspace.description && (
                    <span className="block truncate text-[12px] text-[var(--muted)]">
                      {workspace.description}
                    </span>
                  )}
                </span>
                {selected && (
                  <Check size={15} className="shrink-0 text-[var(--accent)]" />
                )}
                {activatingKey === workspace.key && !selected && (
                  <span className="h-3 w-3 shrink-0 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)]" />
                )}
              </Link>
            );
          })}
          <Link
            href="/me"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-lg border-t border-[var(--border)] px-2.5 py-2 text-[13px] text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--body)]"
          >
            <LayoutGrid size={15} className="shrink-0" />
            {vi.shell.allWorkspaces}
          </Link>
        </div>
      )}
    </div>
  );
}
