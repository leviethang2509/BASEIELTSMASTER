'use client';

import Link from 'next/link';
import type { NotificationItem } from '@lang/shared';
import { vi } from '@/i18n/vi';
import { formatDateTime } from '@/lib/format';
import { notificationText } from './notification-text';

interface NotificationRowProps {
  item: NotificationItem;
  onRead: (id: string) => void;
  /** Đóng chuông sau khi bấm (trang "Tất cả thông báo" không cần). */
  onNavigate?: () => void;
}

/**
 * Một dòng thông báo: bấm vào là đánh dấu đã đọc rồi đi tới trang đích. Loại
 * thông báo mà client chưa biết (bản cũ) không hiện.
 */
export function NotificationRow({
  item,
  onRead,
  onNavigate,
}: NotificationRowProps) {
  const text = notificationText(item);
  if (!text) return null;
  const unread = item.readAt === null;

  const body = (
    <>
      <span className="flex items-start gap-2">
        <span
          aria-hidden
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
            unread ? 'bg-[var(--accent)]' : 'bg-transparent'
          }`}
        />
        <span
          className={`min-w-0 flex-1 text-[13.5px] ${
            unread ? 'font-medium text-[var(--fg)]' : 'text-[var(--body)]'
          }`}
        >
          {text}
        </span>
      </span>
      <span className="mt-1 flex flex-wrap items-center gap-x-2 pl-4 text-[12px] text-[var(--muted)]">
        <span>{formatDateTime(item.createdAt)}</span>
        {item.tenantName && <span>· {item.tenantName}</span>}
        {unread && (
          <span className="text-[var(--accent)]">
            · {vi.notifications.unread}
          </span>
        )}
      </span>
    </>
  );

  const className =
    'block w-full border-b border-[var(--border)] px-3 py-2.5 text-left transition last:border-b-0 hover:bg-[var(--hover)]';

  const activate = () => {
    if (unread) onRead(item.id);
    onNavigate?.();
  };

  if (!item.link) {
    return (
      <button type="button" onClick={activate} className={className}>
        {body}
      </button>
    );
  }
  return (
    <Link
      href={item.link}
      prefetch={false}
      onClick={activate}
      className={className}
    >
      {body}
    </Link>
  );
}
