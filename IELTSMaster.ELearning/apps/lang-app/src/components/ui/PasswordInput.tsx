'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { vi } from '@/i18n/vi';
import { inputClass } from './form-styles';

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'className'
>;

// Ô mật khẩu có nút hiện/ẩn (copy từ trang đăng nhập LC).
export function PasswordInput(props: PasswordInputProps) {
  const [reveal, setReveal] = useState(false);
  return (
    <span className="relative flex items-center">
      <input
        {...props}
        type={reveal ? 'text' : 'password'}
        className={`${inputClass} pr-12`}
      />
      <button
        type="button"
        onClick={() => setReveal((value) => !value)}
        aria-label={reveal ? vi.auth.hidePassword : vi.auth.showPassword}
        className="absolute right-3 grid place-items-center text-[var(--muted)] transition hover:text-[var(--body)]"
      >
        {reveal ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </span>
  );
}
