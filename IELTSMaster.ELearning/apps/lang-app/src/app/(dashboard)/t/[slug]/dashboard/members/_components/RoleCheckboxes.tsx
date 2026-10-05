'use client';

import { ASSIGNABLE_TENANT_ROLES, type TenantRole } from '@lang/shared';
import { vi } from '@/i18n/vi';

// Chọn nhiều role cấp được qua quản lý thành viên (không có Chủ sở hữu).
export function RoleCheckboxes({
  value,
  onChange,
  disabled = false,
}: {
  value: readonly TenantRole[];
  onChange: (roles: TenantRole[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ASSIGNABLE_TENANT_ROLES.map((role) => {
        const checked = value.includes(role);
        return (
          <label
            key={role}
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[14px] transition ${
              checked
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--heading)]'
                : 'border-[var(--border-strong)] text-[var(--body)]'
            } ${
              disabled
                ? 'cursor-not-allowed opacity-60'
                : 'cursor-pointer hover:bg-[var(--hover)]'
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() =>
                onChange(
                  checked
                    ? value.filter((item) => item !== role)
                    : [...value, role],
                )
              }
              className="h-4 w-4 accent-[var(--accent)]"
            />
            {vi.tenantRoles[role]}
          </label>
        );
      })}
    </div>
  );
}
