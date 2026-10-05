import { REFRESH_TOKEN_COOKIE } from '@lang/shared';
import type { Metadata } from 'next';
import { Noto_Sans, Noto_Sans_JP, Roboto, Roboto_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { GlobalLoadingBar } from '@/components/GlobalLoadingBar';
import { vi } from '@/i18n/vi';
import {
  parseThemePref,
  ThemeProvider,
  ThemePref,
  themeScript,
  THEME_COOKIE,
} from '@/theme';

// Roboto: font UI chính (Latin + Vietnamese) theo bộ design.
const roboto = Roboto({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
});

// Roboto Mono: dùng cho email, thời gian, nhãn kỹ thuật.
const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-roboto-mono',
  display: 'swap',
});

// Latin + Vietnamese glyphs (dự phòng cho Roboto).
const notoSans = Noto_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans',
  display: 'swap',
});

// Chữ Nhật cho đề JLPT. Font CJK nặng và không có tham số subset nên không
// preload; font stack chỉ rơi xuống đây khi gặp kana/kanji.
const notoSansJp = Noto_Sans_JP({
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: vi.app.name,
  description: vi.app.tagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = cookies();
  // Theme đọc từ cookie ngay ở server: HTML đầu tiên đã đúng màu nên không
  // nháy sáng→tối. `system` chưa biết được ở đây (server không thấy cài đặt
  // của máy) nên tạm render `light`, `themeScript` sửa trước khi trang được vẽ.
  const themePref = parseThemePref(store.get(THEME_COOKIE)?.value);
  const initialTheme =
    themePref === ThemePref.SYSTEM ? ThemePref.LIGHT : themePref;

  return (
    <html
      lang="vi"
      data-theme={initialTheme}
      // `themeScript` có thể đổi `data-theme` trước khi React hydrate.
      suppressHydrationWarning
      className={`${roboto.variable} ${robotoMono.variable} ${notoSans.variable} ${notoSansJp.variable}`}
    >
      <body className="min-h-screen bg-[var(--bg)] text-[var(--fg)] antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <GlobalLoadingBar />
        <ThemeProvider initialPref={themePref}>
          {/* Chỉ báo có cookie refresh (httpOnly, JS không đọc được) để client
              biết có nên gọi /auth/refresh khi tải trang. */}
          <AuthProvider hasSession={store.has(REFRESH_TOKEN_COOKIE)}>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
