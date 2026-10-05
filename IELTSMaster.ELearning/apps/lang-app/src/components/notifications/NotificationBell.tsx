'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { NOTIFICATION_BELL_SIZE, type NotificationItem } from '@lang/shared';
import { useAuth } from '@/components/auth/AuthProvider';
import { vi } from '@/i18n/vi';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
} from '@/lib/notification-api';
import { NotificationRow } from './NotificationRow';

/** Gọi lại số chưa đọc mỗi 60 giây (R18.3, không dùng WebSocket). */
const POLL_MS = 60_000;

/**
 * Chuông thông báo ở header, gộp mọi trung tâm của người dùng (R18.2). Chỉ
 * hiện khi đã đăng nhập; mở ra thì tải 10 thông báo mới nhất.
 */
export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      const { unreadCount } = await unreadNotificationCount();
      setUnread(unreadCount);
    } catch {
      // Mất mạng hay phiên hết hạn: giữ số cũ, lần gọi sau cập nhật lại.
    }
  }, []);

  // Đếm lại theo chu kỳ và mỗi khi quay lại tab (R18.3).
  useEffect(() => {
    if (!user) {
      setUnread(0);
      setItems(null);
      return;
    }
    void refreshCount();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshCount();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshCount();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, refreshCount]);

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

  if (!user) return null;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    try {
      const list = await listNotifications({
        page: 1,
        pageSize: NOTIFICATION_BELL_SIZE,
      });
      setItems(list.items);
      setUnread(list.unreadCount);
    } catch {
      setItems([]);
    }
  };

  const onRead = async (id: string) => {
    setItems(
      (rows) =>
        rows?.map((row) =>
          row.id === id && !row.readAt
            ? { ...row, readAt: new Date().toISOString() }
            : row,
        ) ?? rows,
    );
    try {
      const { unreadCount } = await markNotificationRead(id);
      setUnread(unreadCount);
    } catch {
      void refreshCount();
    }
  };

  const readAll = async () => {
    setItems(
      (rows) =>
        rows?.map((row) => ({
          ...row,
          readAt: row.readAt ?? new Date().toISOString(),
        })) ?? rows,
    );
    try {
      await markAllNotificationsRead();
      setUnread(0);
    } catch {
      void refreshCount();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          unread > 0
            ? vi.notifications.unreadCount(unread)
            : vi.notifications.bell
        }
        title={vi.notifications.bell}
        className="relative grid h-9 w-9 place-items-center rounded-[10px] text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--accent)]"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-[var(--accent-bg)] px-1 text-center text-[10.5px] font-semibold leading-[18px] text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-[min(92vw,380px)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[0_10px_26px_var(--shadow-2)]"
        >
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
            <span className="flex-1 text-[13.5px] font-semibold text-[var(--heading)]">
              {vi.notifications.title}
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void readAll()}
                className="text-[12.5px] font-medium text-[var(--accent)] hover:underline"
              >
                {vi.notifications.markAll}
              </button>
            )}
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-auto">
            {items === null ? (
              <div className="px-3 py-6 text-center text-[13px] text-[var(--muted)]">
                …
              </div>
            ) : items.length === 0 ? (
              <div className="px-3 py-6 text-center text-[13px] text-[var(--muted)]">
                {vi.notifications.empty}
              </div>
            ) : (
              items.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onRead={onRead}
                  onNavigate={() => setOpen(false)}
                />
              ))
            )}
          </div>

          <Link
            href="/me/notifications"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="block border-t border-[var(--border)] px-3 py-2 text-center text-[12.5px] font-medium text-[var(--accent)] transition hover:bg-[var(--hover)]"
          >
            {vi.notifications.viewAll}
          </Link>
        </div>
      )}
    </div>
  );
}
