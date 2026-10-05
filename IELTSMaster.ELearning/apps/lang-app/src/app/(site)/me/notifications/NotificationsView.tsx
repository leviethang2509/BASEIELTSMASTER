'use client';

import { useCallback, useEffect, useState } from 'react';
import type { NotificationList } from '@lang/shared';
import { NotificationRow } from '@/components/notifications/NotificationRow';
import { FormAlert, Pagination } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { errorMessage } from '@/lib/error-message';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notification-api';

const PAGE_SIZE = 20;

const tabClass = (active: boolean) =>
  `rounded-lg px-3 py-1.5 text-[13.5px] font-medium transition ${
    active
      ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
      : 'text-[var(--body)] hover:bg-[var(--hover)]'
  }`;

/** Trang "Tất cả thông báo" (R18.4): lọc chưa đọc, phân trang, đọc tất cả. */
export function NotificationsView() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<NotificationList | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(
        await listNotifications({
          page,
          pageSize: PAGE_SIZE,
          unread: unreadOnly,
        }),
      );
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause, vi.notifications.loadError));
    }
  }, [page, unreadOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRead = async (id: string) => {
    try {
      await markNotificationRead(id);
    } finally {
      await load();
    }
  };

  const readAll = async () => {
    try {
      await markAllNotificationsRead();
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause, vi.notifications.loadError));
    }
    await load();
  };

  const switchTab = (unread: boolean) => {
    setUnreadOnly(unread);
    setPage(1);
  };

  return (
    <section className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[var(--heading)]">
            {vi.notifications.title}
          </h1>
          <p className="mt-1 text-[15px] text-[var(--body)]">
            {vi.notifications.subtitle}
          </p>
        </div>
        {(data?.unreadCount ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => void readAll()}
            className="text-[13.5px] font-medium text-[var(--accent)] hover:underline"
          >
            {vi.notifications.markAll}
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center gap-1">
        <button
          type="button"
          onClick={() => switchTab(false)}
          className={tabClass(!unreadOnly)}
        >
          {vi.notifications.filterAll}
        </button>
        <button
          type="button"
          onClick={() => switchTab(true)}
          className={tabClass(unreadOnly)}
        >
          {vi.notifications.filterUnread}
          {(data?.unreadCount ?? 0) > 0 && ` (${data!.unreadCount})`}
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <FormAlert tone="error">{error}</FormAlert>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        {data && data.items.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13.5px] text-[var(--muted)]">
            {unreadOnly ? vi.notifications.emptyUnread : vi.notifications.empty}
          </p>
        ) : (
          data?.items.map((item) => (
            <NotificationRow key={item.id} item={item} onRead={onRead} />
          ))
        )}
        {data && data.total > PAGE_SIZE && (
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onChange={setPage}
          />
        )}
      </div>
    </section>
  );
}
