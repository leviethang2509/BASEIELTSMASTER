import { ManualPageView } from '@/components/user-manual/ManualPageView';

// `/user-manual` = trang đầu tiên, `/user-manual/{pageId}` = trang tương ứng
// (đường dẫn nhiều cấp không khớp trang nào nên hiện "không tìm thấy").
export default function UserManualPage({
  params,
}: {
  params: { page?: string[] };
}) {
  return <ManualPageView pageId={params.page?.join('/') ?? null} />;
}
