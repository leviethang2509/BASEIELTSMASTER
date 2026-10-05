import type { Metadata } from 'next';
import { vi } from '@/i18n/vi';
import { NotificationsView } from './NotificationsView';

export const metadata: Metadata = {
  title: `${vi.notifications.title} · ${vi.app.name}`,
};

export default function NotificationsPage() {
  return <NotificationsView />;
}
