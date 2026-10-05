import {
  DEFAULT_THEME_PREF,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  THEME_PREFS,
  THEME_STORAGE_KEY,
  ThemePref,
} from './theme';

/**
 * Script chạy **trước khi trang được vẽ** (đặt làm phần tử đầu của `<body>`).
 *
 * Đường đi thường gặp không cần script này: server đã đọc cookie và render sẵn
 * `data-theme` đúng. Script lo hai việc còn lại:
 *
 * 1. Lựa chọn `system` – server không biết cài đặt sáng/tối của máy, chỉ
 *    `matchMedia` ở client biết.
 * 2. Cookie bị xoá/hết hạn nhưng `localStorage` còn – dựng lại cookie để lần
 *    tải sau server render đúng ngay.
 *
 * Mọi thao tác bọc try/catch: `localStorage` có thể ném lỗi ở cửa sổ ẩn danh
 * hoặc khi trình duyệt chặn site data, và một lỗi ở đây sẽ chặn cả trang.
 *
 * Hằng số lấy từ `theme.ts` để không lệch với phần TypeScript.
 */
export const themeScript = `(function(){try{
try{delete window.__REDUX_DEVTOOLS_EXTENSION__;}catch(e){}
var P=${JSON.stringify(THEME_PREFS)};
var s=null;try{s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}
var c=null,m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);
if(m){try{c=decodeURIComponent(m[1])}catch(e){c=m[1]}}
var p=P.indexOf(s)>=0?s:(P.indexOf(c)>=0?c:${JSON.stringify(DEFAULT_THEME_PREF)});
if(p!==c){document.cookie=${JSON.stringify(THEME_COOKIE)}+'='+p+'; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax'}
var a=p===${JSON.stringify(ThemePref.SYSTEM)}?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;
var r=document.documentElement;
if(r.getAttribute('data-theme')!==a){r.setAttribute('data-theme',a)}
}catch(e){}})();`;
