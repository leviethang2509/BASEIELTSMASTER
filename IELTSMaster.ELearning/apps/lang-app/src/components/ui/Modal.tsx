'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { vi } from '@/i18n/vi';

/** Modal đang mở theo thứ tự; chỉ modal trên cùng nhận phím Esc. */
const openModals: symbol[] = [];

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Tailwind width class cho panel, mặc định max-w-lg. */
  widthClass?: string;
  /** Tailwind class nền panel, mặc định bg-[var(--panel)]. */
  surfaceClass?: string;
  /** Class thay cho cách cuộn/padding mặc định của phần thân. */
  bodyClass?: string;
  footer?: React.ReactNode;
}

// Modal chung, style theo token Solarized. Panel tối đa cao ~85vh, phần thân
// tự cuộn; header/footer cố định.
// Click ra ngoài backdrop KHÔNG đóng popup — tránh mất dữ liệu đang nhập; chỉ
// đóng qua nút X, nút ở footer hoặc phím Esc.
export function Modal({
  open,
  onClose,
  title,
  children,
  widthClass = 'max-w-lg',
  surfaceClass = 'bg-[var(--panel)]',
  bodyClass = 'overflow-auto px-5 py-4',
  footer,
}: ModalProps) {
  // Giữ onClose mới nhất trong ref để effect không chạy lại (và không đổi thứ
  // tự chồng modal) mỗi lần cha render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const id = Symbol('modal');
    openModals.push(id);
    const onEsc = (event: KeyboardEvent) => {
      // Esc trong dialog con (xác nhận…) không đóng luôn dialog cha.
      if (event.key === 'Escape' && openModals.at(-1) === id) {
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('keydown', onEsc);
      openModals.splice(openModals.indexOf(id), 1);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="ls-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[85vh] w-full ${widthClass} flex-col overflow-hidden rounded-2xl border border-[var(--border)] ${surfaceClass} shadow-[0_30px_70px_var(--shadow-3)]`}
      >
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-[17px] font-bold text-[var(--heading)]">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={vi.common.close}
              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--body)]"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className={`min-h-0 flex-1 ${bodyClass}`}>{children}</div>

        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-[var(--border)] px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
