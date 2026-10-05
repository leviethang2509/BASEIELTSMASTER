'use client';

import { useEffect, useState } from 'react';
import { subscribeLoading } from '@/lib/api';

// Thanh loading mảnh cố định trên đỉnh màn hình. Hiển thị bất cứ khi nào có
// request API đang chạy (bộ đếm > 0) và tự ẩn khi tất cả đã xong.
export function GlobalLoadingBar() {
  const [active, setActive] = useState(0);

  useEffect(() => subscribeLoading(setActive), []);

  const visible = active > 0;

  return (
    <div
      aria-hidden={!visible}
      role="progressbar"
      aria-busy={visible}
      className={`fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="ls-loading-bar h-full w-full bg-[var(--accent)]" />
    </div>
  );
}
