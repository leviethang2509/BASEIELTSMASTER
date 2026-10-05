import type { Metadata } from 'next';
import { vi } from '@/i18n/vi';
import { AccountSettings } from './AccountSettings';

export const metadata: Metadata = {
  title: `${vi.account.title} · ${vi.app.name}`,
};

export default function AccountPage() {
  return <AccountSettings />;
}
