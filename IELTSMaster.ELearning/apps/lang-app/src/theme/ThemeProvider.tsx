'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  appliedTheme,
  parseThemePref,
  themeCookieValue,
  ThemePref,
  THEME_STORAGE_KEY,
  type AppliedTheme,
} from './theme';

type ThemeContextValue = {
  /** Lựa chọn của người dùng (có thể là `system`). */
  pref: ThemePref;
  /** Bảng màu đang áp dụng – `system` đã được quy về `light`/`dark`. */
  applied: AppliedTheme;
  setPref: (pref: ThemePref) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(DARK_QUERY).matches;
}

function writeStorage(pref: ThemePref) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Cửa sổ ẩn danh / site data bị chặn: cookie vẫn giữ được lựa chọn.
  }
}

function readStorage(): ThemePref | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === null ? null : parseThemePref(value);
  } catch {
    return null;
  }
}

/**
 * Giữ lựa chọn theme và áp lên `<html data-theme>`.
 *
 * `initialPref` là giá trị server đọc từ cookie – nhờ vậy HTML đầu tiên đã
 * đúng theme, provider không phải "sửa" gì khi chạy (xem `theme-script.ts`).
 */
export function ThemeProvider({
  initialPref,
  children,
}: {
  initialPref: ThemePref;
  children: React.ReactNode;
}) {
  const [pref, setPrefState] = useState<ThemePref>(initialPref);
  // Chỉ dùng khi pref = system. Server không biết cài đặt của máy nên khởi tạo
  // false rồi đọc lại sau khi mount (script trước khi vẽ đã đặt đúng
  // `data-theme`, ở đây chỉ để `applied` trả về đúng cho component dùng tới).
  const [prefersDark, setPrefersDark] = useState(false);
  const mounted = useRef(false);

  const applied = appliedTheme(pref, prefersDark);

  // Đọc lại localStorage sau khi mount: cookie có thể đã bị xoá/hết hạn trong
  // khi localStorage còn giữ lựa chọn cũ.
  useEffect(() => {
    setPrefersDark(systemPrefersDark());
    const stored = readStorage();
    if (stored === null) {
      writeStorage(initialPref);
      return;
    }
    if (stored !== initialPref) {
      setPrefState(stored);
      document.cookie = themeCookieValue(stored);
    }
  }, [initialPref]);

  // Máy đổi sáng/tối trong lúc đang mở trang (chỉ có nghĩa khi chọn `system`).
  useEffect(() => {
    if (pref !== ThemePref.SYSTEM || !window.matchMedia) return;
    const media = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) =>
      setPrefersDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [pref]);

  // Áp `data-theme`. Bỏ qua lần chạy đầu: server/script đã đặt đúng rồi, ghi
  // lại chỉ để lỡ có chênh lệch.
  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute('data-theme') === applied) {
      mounted.current = true;
      return;
    }
    // Tắt transition trong lúc đổi để không giật (xem `globals.css`).
    if (mounted.current) {
      root.setAttribute('data-theme-switching', '');
      root.setAttribute('data-theme', applied);
      const timer = window.setTimeout(
        () => root.removeAttribute('data-theme-switching'),
        60,
      );
      return () => window.clearTimeout(timer);
    }
    mounted.current = true;
    root.setAttribute('data-theme', applied);
  }, [applied]);

  const setPref = useCallback((next: ThemePref) => {
    setPrefState(next);
    setPrefersDark(systemPrefersDark());
    document.cookie = themeCookieValue(next);
    writeStorage(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ pref, applied, setPref }),
    [pref, applied, setPref],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme phải nằm trong ThemeProvider');
  return context;
}
