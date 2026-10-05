import type { NotificationList, NotificationUnreadCount } from '@lang/shared';
import { api } from './api';

// Thông báo của chính mình (req-3 Step 12): gộp mọi trung tâm nên không có
// `slug` trong đường dẫn.

export const listNotifications = (params: {
  page?: number;
  pageSize?: number;
  unread?: boolean;
}) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.unread) query.set('unread', 'true');
  const suffix = query.toString();
  return api.get<NotificationList>(
    `/me/notifications${suffix ? `?${suffix}` : ''}`,
  );
};

export const unreadNotificationCount = () =>
  api.get<NotificationUnreadCount>('/me/notifications/unread-count');

export const markNotificationRead = (id: string) =>
  api.post<NotificationUnreadCount>(`/me/notifications/${id}/read`);

export const markAllNotificationsRead = () =>
  api.post<NotificationUnreadCount>('/me/notifications/read-all');
