// Theme giao diện (req-4). Logic thuần, không phụ thuộc React/DOM để dùng được
// ở cả server component (đọc cookie) lẫn client và test.

/**
 * Lựa chọn người dùng chọn được. `system` không phải một bảng màu: nó nghĩa là
 * "theo cài đặt sáng/tối của máy" và được quy về `light`/`dark` khi áp dụng.
 */
export const ThemePref = {
  LIGHT: 'light',
  SOLARIZED_LIGHT: 'solarized-light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;
export type ThemePref = (typeof ThemePref)[keyof typeof ThemePref];

/** Bảng màu thật sự áp lên `<html data-theme>` – không có `system`. */
export const AppliedTheme = {
  LIGHT: 'light',
  SOLARIZED_LIGHT: 'solarized-light',
  DARK: 'dark',
} as const;
export type AppliedTheme = (typeof AppliedTheme)[keyof typeof AppliedTheme];

/** Thứ tự hiện trong menu đổi theme. */
export const THEME_PREFS: readonly ThemePref[] = [
  ThemePref.LIGHT,
  ThemePref.SOLARIZED_LIGHT,
  ThemePref.DARK,
  ThemePref.SYSTEM,
];

/** Chưa chọn gì thì là Sáng (req-4: mặc định là light mode). */
export const DEFAULT_THEME_PREF: ThemePref = ThemePref.LIGHT;

/** Cookie để server render đúng `data-theme` ngay từ HTML đầu (không nháy màu). */
export const THEME_COOKIE = 'ls_theme';

/** Bản sao trong localStorage: cứu khi cookie bị xoá/hết hạn. */
export const THEME_STORAGE_KEY = 'ls:theme';

/** 1 năm. Cookie không phải secret nên không cần biến env. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isThemePref(value: unknown): value is ThemePref {
  return THEME_PREFS.includes(value as ThemePref);
}

/** Giá trị lạ (cookie cũ, người dùng sửa tay) rơi về mặc định. */
export function parseThemePref(value: string | null | undefined): ThemePref {
  return isThemePref(value) ? value : DEFAULT_THEME_PREF;
}

/** Quy lựa chọn về bảng màu thật sự để đặt lên `<html data-theme>`. */
export function appliedTheme(
  pref: ThemePref,
  systemPrefersDark: boolean,
): AppliedTheme {
  if (pref !== ThemePref.SYSTEM) return pref;
  return systemPrefersDark ? AppliedTheme.DARK : AppliedTheme.LIGHT;
}

/**
 * Cookie ghi từ client nên **không** httpOnly. `SameSite=Lax` là đủ (chỉ là
 * lựa chọn hiển thị, không có giá trị bảo mật) và không đặt `Secure` vì VPS
 * đang chạy HTTP – có `Secure` thì trình duyệt bỏ luôn cookie.
 */
export function themeCookieValue(pref: ThemePref): string {
  return `${THEME_COOKIE}=${pref}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}
