import type { Metadata } from 'next';
import { vi } from '@/i18n/vi';
import { MeOverview } from './MeOverview';

export const metadata: Metadata = { title: `${vi.me.title} · ${vi.app.name}` };

// Không gian của tôi. Danh sách tenant và nút đăng ký trung tâm làm ở Step 8.
export default function MePage() {
  return <MeOverview />;
}
