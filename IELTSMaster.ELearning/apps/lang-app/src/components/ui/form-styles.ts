// Style ô nhập, nhãn và nút chính theo trang đăng nhập của lightc-general.

export const inputClass =
  'w-full rounded-xl border border-[var(--border-strong)] bg-[var(--sidebar)] px-4 py-3 text-[15px] text-[var(--heading)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:bg-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-60';

export const labelClass = 'flex flex-col gap-1.5';

export const labelTextClass = 'text-[13px] font-semibold text-[var(--body)]';

/** Nút trong dialog/toolbar (cùng cỡ với nút của `ConfirmDialog`). */
export const compactPrimaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent-bg)] px-4 py-2 text-[14px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50';

export const compactDangerButtonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--danger)] px-4 py-2 text-[14px] font-semibold text-[var(--on-status)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50';

export const secondaryButtonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-strong)] px-4 py-2 text-[14px] font-medium text-[var(--body)] transition hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-50';

/** Nút biểu tượng trong cột thao tác của bảng. */
export const iconButtonClass =
  'grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--muted)]';

export const primaryButtonClass =
  'rounded-xl bg-[var(--accent-bg)] px-4 py-3 text-[15px] font-semibold text-white shadow-[0_10px_24px_var(--accent-shadow)] transition hover:brightness-[1.05] disabled:cursor-not-allowed disabled:opacity-60';
