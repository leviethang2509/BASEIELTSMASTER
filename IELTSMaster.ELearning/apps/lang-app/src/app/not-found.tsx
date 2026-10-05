import { StatusPage } from '@/components/StatusPage';
import { vi } from '@/i18n/vi';

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title={vi.common.notFoundTitle}
      message={vi.common.notFoundText}
    />
  );
}
