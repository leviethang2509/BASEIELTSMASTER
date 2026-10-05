'use client';

import { vi } from '@/i18n/vi';

// Lỗi ở chính root layout: thay cả <html>, không dùng được CSS/layout chung.
// Vì vậy màu ở đây viết thẳng (không có `data-theme` để ăn theo biến của
// globals.css): luôn ra trang sáng đọc được, kể cả khi người dùng đang ở
// theme tối. Đây là ngoại lệ có chủ đích của luật chặn màu cứng (req-4).
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 16,
          background: '#fdf6e3',
          color: '#073642',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <div>
          <h1 style={{ fontSize: 24 }}>{vi.common.errorTitle}</h1>
          <p style={{ fontSize: 15 }}>{vi.common.errorText}</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 12,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#d33682',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {vi.common.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
