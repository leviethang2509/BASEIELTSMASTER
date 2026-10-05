# Requirement 4 – Kế hoạch implement

> Nguồn: [req-4.md](req-4.md) + câu trả lời trong [req-4-question.md](req-4-question.md).
> Tiến độ ghi ở [req-4-progress.md](req-4-progress.md).

---

## 1. Quyết định đã chốt

| # | Quyết định | Nguồn |
|---|---|---|
| 1.1 | **3 theme**: `light` (trắng – **mặc định**), `solarized-light` (tông kem hiện tại), `dark` (Solarized Dark) | A1 |
| 1.2 | Lưu lựa chọn bằng **cookie `ls_theme` + `localStorage`**. Không đụng API, không migration | B1 |
| 1.3 | Nút đổi theme có thêm mục **"Theo hệ thống"**; chưa chọn gì thì vẫn là **Sáng** | B2 |
| 1.4 | Trang thi toàn màn hình: nút **chỉ ở `SectionIntroScreen`**, không có khi đồng hồ đang chạy | C2 |
| 1.5 | Nút đặt **góc trên bên phải**, cạnh `NotificationBell`, ở cả 3 header: `(site)`, `DashboardShell`, `UserManualShell` | req-4 |

**Các câu còn lại: người dùng chốt "Theo Đề xuất" (2026-09-23):**

- A2 – Light trắng: `--bg: #ffffff`, `--card: #ffffff`, `--sidebar: #f6f7f8`; viền đậm hơn hiện tại để bù tương phản. Màu nhấn magenta `#d33682` **giữ nguyên ở cả 3 theme**.
- A3 – Dark: `--accent: #e14b92` (magenta sáng hơn) cho chữ/viền; màu trạng thái Solarized giữ nguyên khi làm **nền** (chữ trên đó là trắng), dùng bản sáng khi làm **chữ**.
- C1 – Nút mở menu nhỏ **4 mục**: Sáng · Giấy · Tối · Theo hệ thống (cùng kiểu popover với `NotificationBell`).
- D1 – `SiteFooter`: dark mode dùng nền tối hơn nền trang một bậc (`#00212b`) + viền trên; 2 theme sáng giữ `#002b36` như hiện tại.
- D2 – **Không** lọc sáng ảnh người dùng tải lên. Chỉ bọc nền trắng + viền nhẹ cho ảnh trong suốt.
- D3 – Style editor trong `globals.css` chuyển sang token, không đổi hành vi.
- D4 – Cập nhật `/user-manual` (`03-tai-khoan.json`) + `updatedAt`; trang docs cũng phải chạy đúng ở dark.
- D5 – Nhóm P0 của [epic-1](../epic/epic-1.md) dời sang req-5; ghi chú vào epic-1.
- D6 – Sửa tiêu đề `req-4.md` thành `# Requirement 4`.
- **D7 (chốt ở Step 4, 2026-09-25)** – Màu chữ/nền người soạn tự chọn trong nội dung đề: **giữ vùng nội dung theo theme**, ở theme tối tự chuyển màu sang bản sáng cùng sắc bằng `color-mix` (phương án (d)). Không làm "tờ giấy sáng" ở cả 3 theme, không đổi dữ liệu đã lưu.
- **D8 (chốt ở Step 4)** – Độ nổi của dialog ở theme tối: nhấc lên đúng `--raised` (chênh nền mờ 1.52 → 1.75), **không** chọn giá trị sáng hơn để bằng mốc 2 theme sáng (2.85).

---

## 2. Giả định kỹ thuật

1. **Không đổi API, không migration, không đụng lang-api** ngoài 1 file JSON tài liệu. Toàn bộ req-4 nằm trong `apps/lang-app`.
2. Cookie `ls_theme` **không httpOnly** (client phải ghi được), `SameSite=Lax`, `Max-Age` 1 năm, `Path=/`. Không phải secret nên không cần thêm biến env; **không** thêm gì vào `deploy/.env.example`.
3. `app/layout.tsx` đã là server component và đã gọi `cookies()` (cho `REFRESH_TOKEN_COOKIE`) → đọc thêm 1 cookie không làm đổi chiến lược render.
4. `data-theme` đặt trên `<html>`. Mọi theme khai báo bằng `:root[data-theme='…']` trong `globals.css`. Không bật `darkMode` của Tailwind (project không dùng class `dark:`; đi bằng CSS variable nhất quán với 1.673 lượt dùng sẵn có).
5. **Giữ nguyên tên 13 biến màu hiện có** (`--bg`, `--card`, `--accent`…) → 1.673 lượt dùng trong 253 file không phải sửa dòng nào. Biến mới chỉ thêm, không đổi tên.
6. "Theo hệ thống" khi OS ở chế độ sáng → ra `light` (trắng), không ra `solarized-light`.
7. Không có ảnh chụp thiết kế dark cho sẵn (LC không có dark mode) → bảng màu dark do mình dựng, cần bạn xem và chỉnh ở bước nghiệm thu.
8. Không đổi bảng màu danh mục `CATEGORY_COLOR_HEX` (dữ liệu người dùng chọn) – 8 màu Solarized này đọc được trên cả nền sáng lẫn tối.

---

## 3. Việc bạn cần chuẩn bị

- Xem bảng màu dark sau Step 1 (lúc đó đã đổi theme được, dù các màn hình sâu chưa dọn xong) và nói ngay nếu tông màu lệch ý.
- Quyết bỏ/giữ `solarized-light` sau khi nhìn thật – giữ 3 theme là chi phí kiểm thử liên tục về sau.

---

## 4. Thiết kế token màu

### 4.1 Hiện trạng cần xử lý (số liệu quét thật)

| Loại | Số lượt | Số file | Xử lý |
|---|---|---|---|
| `var(--…)` | 1.673 | 253 | **Không sửa dòng nào** – chỉ cần khai báo lại biến theo theme |
| `rgba(...)` viết thẳng | ~70 | 33 | Chuyển sang token mới (4.3) |
| Hex viết thẳng | ~46 | 7 | Màu nhấn Solarized thì giữ; chỗ "nướng" cho nền sáng thì chuyển token |
| Class màu Tailwind cố định | 30 | 19 | Đa số là `text-white` trên nền nhấn → giữ. Sửa: `bg-black/5`, 4 dòng ô số câu |

### 4.2 Nhóm `rgba` đã quét được (đây là phần việc chính)

| Gốc | Lượt | Ý nghĩa | Token mới |
|---|---|---|---|
| `rgba(0,43,54,…)` .06–.28 | 15 | base03 – bóng đổ / lớp phủ trên nền sáng | `--shadow-sm` · `--shadow-md` · `--shadow-lg` |
| `rgba(88,110,117,…)` .12–.18 | 8 | base01 – viền | dùng `--border` / `--border-strong` sẵn có |
| `rgba(181,137,0,…)` .06–.45 | 11 | vàng `#b58900` – cảnh báo | `--warn` · `--warn-soft` · `--warn-border` · `--warn-text` |
| `rgba(133,153,0,…)` .08–.32 | 8 | lục `#859900` – thành công | `--ok` · `--ok-soft` · `--ok-border` · `--ok-text` |
| `rgba(38,139,210,…)` .07–.3 | 5 | lam `#268bd2` – thông tin | `--info` · `--info-soft` · `--info-border` · `--info-text` |
| `rgba(253,246,227,…)` .3–.94 | 5 | base3 – header dính mờ nền | `--bg-blur` |
| `rgba(211,54,130,…)` .28–.45 | 4 | magenta – bóng nút chính | `--accent-shadow` |
| `rgba(220,50,47,…)` .1 | 2 | đỏ – nền nhạt lỗi | `--danger-soft` · `--danger-border` |
| `rgba(42,161,152,.14)` · `rgba(147,161,161,.2)` | 2 | cyan / base1 | gộp vào `--info-soft` / `--hover` |

### 4.3 Token bổ sung (khai báo 3 lần trong `globals.css`)

```
--bg-blur        nền header dính, có backdrop-blur
--shadow-sm/md/lg   chuỗi box-shadow đầy đủ (dark dùng bóng đậm + alpha cao hơn)
--accent-shadow  bóng dưới nút chính
--ok / --ok-soft / --ok-border / --ok-text
--warn / --warn-soft / --warn-border / --warn-text
--info / --info-soft / --info-border / --info-text
--danger-soft / --danger-border
--link           màu link trong nội dung đề (nay là #268bd2 cứng)
--blank-bg       nền ô điền chỗ trống (.exam-blank – nay rgba(15,23,42,.07), tàng hình ở dark)
--footer-bg / --footer-fg / --footer-heading
--overlay        nền mờ sau modal
```

Caret `<select>` trong `globals.css` đang nhúng `stroke='%236b7280'` trong data-URI – không nhận được biến, nên **khai báo lại nguyên dòng `background-image`** trong mỗi khối theme (3 dòng).

**Token thêm ở Step 2** (khi dọn màu cứng mới thấy thiếu; đã có trong `globals.css`):

| Token | Vì sao cần |
|---|---|
| `--danger-bg` | Nền **đặc** `#fdf1ef` của thông báo lỗi (`FormAlert`, `Badge` danger, `Countdown`…). `--danger-soft` bán trong suốt cho ra tông cam, không giống bản gốc |
| `--on-status` | Chữ trên nền màu trạng thái: trắng ở 2 theme sáng, `#002b36` ở theme tối (nền trạng thái ở theme tối là màu sáng nên chữ trắng sẽ chìm) |
| `--sidebar-hover` · `--accent-hover` | Hover của nút trên nền `--sidebar` (`#e4dcc4`) và của nút nhấn (`#b32c6d`) |
| `--cyan` · `--cyan-soft` | Nhãn thời lượng ở hero trang chủ (`#2aa198`); gộp vào `--info-*` sẽ đổi tông từ mòng sang lam |
| `--code-bg` · `--code-fg` | Khối mã trong `/user-manual`: ở theme tối phải tối hơn `--card` mới phân biệt được |
| `--footer-muted` · `--footer-divider` | Dòng bản quyền và đường kẻ trong footer |
| `--on-accent` · `--on-accent-muted` · `--on-accent-line` · `--on-accent-fg` · `--highlight-bg` · `--highlight-fg` | Màu **không đổi theo theme**: nằm trên nền `--accent` (thẻ gói nổi, CTA) hoặc là màu bút dạ quang. Khai báo một lần trong `:root` |

**Token thêm ở Step 3** (rà theme tối mới thấy thiếu; đã có trong `globals.css`):

| Token | Vì sao cần |
|---|---|
| `--accent-bg` | Nền **đặc** của nút nhấn, `#d33682` ở **cả 3 theme** (chữ `text-white` đạt 4.55). `--accent` ở theme tối phải sáng lên để làm chữ/viền nên dùng nó làm nền thì chữ trắng chỉ còn 3.2. Không đổi theo theme → khai báo ở `:root` chung, cùng chỗ với `--on-accent`. `--accent-hover` cũng dồn về đây |
| `--raised` | Mặt **nổi lên trên** `--sidebar`/`--card`: popover, tab đang chọn, panel `PreviewDialog`, ngăn kéo sidebar mobile. 2 theme sáng để đúng giá trị `--bg` cũ (trắng/kem) nên không đổi gì; theme tối `--bg` là mặt **tối nhất** nên các chỗ đó đang bị lõm xuống |
| `--img-mat` | Nền lót ảnh logo có nền trong suốt (quyết định D2: không lọc sáng ảnh người dùng). Trắng ở theme tối, bằng `--hover` cũ ở 2 theme sáng |
| `--violet` · `--violet-soft` · `--orange` · `--orange-soft` | 2 sắc Solarized còn lại của khối minh hoạ trang chủ. Trước đây là hex viết thẳng trong `(site)/page.tsx` nên ở theme tối nền ô 13% gần như không thấy (1.05) |

**Token thêm ở Step 4** (rà trình soạn đề / thi / lịch; đã có trong `globals.css`):

| Token | Vì sao cần |
|---|---|
| `--panel` | Mặt của **dialog** (`Modal`, nên cả `ConfirmDialog`/`PromptDialog`) và tab đang chọn của 2 khối 2 nút (trang Chấm bài, `PreviewDialog`). Bằng đúng `--card` ở 2 theme sáng nên **không đổi gì**; ở theme tối nhấc lên `--raised` vì bóng đổ đen không nhìn ra trên nền tối – panel `--card` chỉ chênh nền mờ 1.52 (2 theme sáng 2.85–2.99) |

Ngoài token, Step 4 còn thêm **3 cơ chế trong `globals.css`** cho những màu **không** đến từ bảng token (dữ liệu người dùng hoặc bảng màu cố định của trình soạn đề) – chúng "nướng" cho nền sáng nên trên nền tối có cái chỉ còn 1.05:1:

| Class | Dùng ở đâu | Làm gì ở theme tối |
|---|---|---|
| `.ls-tint` + `-fg`/`-line`/`-dot`/`-soft`/`-faint` | indicator & dạng câu hỏi, callout, chấm màu trong `SlashMenu`/`Minimap`/`IndicatorDialog`/`ExamToolbar` (màu nằm ở `@lang/exam-core`) | `--tint = color-mix(in srgb, var(--tint-raw) 35%, var(--heading))` |
| `.ls-leaf-fg` / `.ls-leaf-bg` | màu chữ & màu nền **người soạn tự chọn** trong nội dung đề (quyết định D7) | chữ trộn 35% như trên; nền đặc đổi thành mảng mờ 22% cùng sắc |
| `.ls-event` | ô buổi học trong lịch | không cần trộn (màu lớp đã là token); hover tăng độ đậm 12% → 22% thay cho `brightness-95` (trên nền tối "tối đi" là sai chiều) |

Ngoài token, mỗi khối theme còn khai báo **`color-scheme`** (`light`/`light`/`dark`): checkbox, radio, mũi lên-xuống của ô số, ô ngày/giờ + bảng chọn ngày, nền autofill và thanh cuộn mặc định do trình duyệt vẽ, không ăn theo CSS của mình – thiếu dòng này thì theme tối lọt mảng trắng ở mọi ô đó.

Sửa so với bản Step 1: `--overlay` để `rgba(0,0,0,.4)` ở 2 theme sáng (đúng `bg-black/40` của `Modal` trước req-4), `--info-text` của `solarized-light` để `#1f6fa8` (đúng chữ callout/`FormAlert` trước req-4), alpha của `--ok-soft`/`--warn-soft`/`--info-soft` gom về .12/.12/.10 (giữa dải .06–.15 đang dùng, mọi chỗ lệch ≤ .06 alpha).

### 4.4 Chặn tái phát

Bằng **ESLint** (`no-restricted-syntax` trong config của lang-app): báo lỗi khi gặp chuỗi chứa `rgba(`/hex màu trong `className`, trừ danh sách cho phép (`catalog-ui.tsx` bảng màu danh mục, `calendar-model.ts`, `global-error.tsx`). Cùng tinh thần bảng `ROUTES` của `access-control.e2e.spec.ts`: thêm màu cứng là đỏ ngay, và `pnpm lint` đã nằm trong điều kiện kết thúc step.

> **Sai khác so với bản plan đầu:** ban đầu định viết test jest `no-hardcoded-color.spec.ts`. Nhưng `apps/lang-app` **chưa có hạ tầng test nào** (không jest config, không script `test`, không file spec – các hàm thuần sẵn có như `calendar-model.ts`, `curriculum-draft.ts` cũng chưa có test). Dựng jest cho lang-app là việc ngoài phạm vi req-4; ESLint đạt đúng mục đích mà không thêm hạ tầng.

---

## 5. Phân quyền

**Không đổi.** Không có route mới, không có guard mới, không thêm dòng nào vào bảng `ROUTES`. Đổi theme là thao tác phía client, khách chưa đăng nhập cũng dùng được.

---

## 6. Route & file mới

| File | Vai trò |
|---|---|
| `src/theme/theme.ts` | `Theme` (`light`/`solarized-light`/`dark`/`system`), `THEME_COOKIE`, `resolveTheme`, hàm thuần |
| `src/theme/ThemeProvider.tsx` | Context: theme đã chọn + theme hiệu lực; ghi cookie + `localStorage`; `matchMedia` cho "Theo hệ thống" |
| `src/theme/ThemeToggle.tsx` | Nút + menu 4 mục, đặt góc phải header |
| `src/theme/theme-script.ts` | Script inline chạy trước khi vẽ – đồng bộ `localStorage`/cookie, xử lý "Theo hệ thống" |
| `src/i18n/vi.ts` | Thêm `vi.theme` |
| `src/app/globals.css` | 3 khối `:root[data-theme='…']` + token mới |
| `src/app/layout.tsx` | Đọc cookie → `data-theme` trên `<html>` + `<ThemeProvider>` |

---

## 7. Các step

### Step 1 – Nền tảng theme
- `globals.css`: tách bảng màu hiện tại thành `:root[data-theme='solarized-light']`, thêm `light` (mặc định, cũng là `:root` trần) và `dark`; thêm token mục 4.3.
- `theme/` (4 file trên) + `vi.theme`.
- `layout.tsx`: đọc cookie `ls_theme` → đặt `data-theme` ngay trong HTML server render (**không nháy màu**); nhúng `theme-script` cho trường hợp "Theo hệ thống".
- Gắn `ThemeToggle` vào `SiteHeaderNav`, `DashboardShell`, `UserManualShell`, `SectionIntroScreen`. Lưu ý `SiteHeaderNav` hiện trả về nhánh khác khi **chưa đăng nhập** → phải có nút ở cả hai nhánh, và cả nhánh `status === 'loading'`.
- **Nghiệm thu:** đổi được 4 lựa chọn ở cả 4 chỗ; F5 giữ nguyên lựa chọn và **không chớp sáng**; tắt JS vẫn ra đúng theme đã chọn.

### Step 2 – Dọn màu cứng sang token
- Thay ~70 `rgba` + các hex "nướng sáng" theo bảng 4.2 (33 file). Đổi `Badge` (`success`/`warning`/`danger`), `form-styles.ts`, `bg-black/5` của `TagMultiSelect`, 4 dòng ô số câu `SimulatorState.tsx`, `.exam-blank`/`.exam-editor a`/caret `<select>` trong `globals.css`, `SiteFooter`.
- Thêm quy tắc ESLint chặn tái phát (4.4).
- **Nghiệm thu:** ở `solarized-light` giao diện **giống hệt trước req-4** (đây là phép thử chính của step này – so bằng mắt từng trang).

### Step 3 – Rà theme tối: khu vực chính, dashboard, docs
- `(site)` (trang chủ, bảng giá, đăng nhập/đăng ký, `/me/*`, trang tenant, lớp của học viên, phụ huynh), `(dashboard)` (admin + dashboard tenant: bảng, modal, badge, biểu đồ đếm), `(docs)` `/user-manual`.
- Soát tương phản chữ/nền, viền có còn thấy không, `backdrop-blur` header, thanh cuộn, `Modal`/`ConfirmDialog`/`PromptDialog`/`FormAlert`/`OverLimitBanner`.
- **Nghiệm thu:** đi hết danh sách trang trong [req-3-acceptance.md](req-3-acceptance.md) ở theme tối, không còn chỗ chữ chìm/viền mất/mảng trắng lọt.

### Step 4 – Rà theme tối: soạn thảo, thi, chấm bài, lịch
- Trình soạn đề & bài học (Plate: toolbar, callout, khối gập mở, furigana, indicator, ô điền, cặp ghép), `PreviewDialog`/`LessonPreviewDialog`, giả lập (`ExamSimulator`, ô số câu, cờ), trang thi `(exam)` + `Countdown` + `SpeakingRecorder`, học bài, chấm bài (`GradingAttemptView`), `CalendarView` + `ClassSchedulePanel`, `MediaDialog`/thư viện media, `DataTable`/`Pagination`.
- **Nghiệm thu:** soạn một đề có đủ khối → xem trước → thi thử → chấm tay, toàn bộ ở theme tối.

> Sai khác khi làm: phần lớn công việc **không phải** chỉnh giá trị token (Step 2–3 đã tokenise hết các màn hình này) mà là xử lý 3 nhóm màu nằm ngoài bảng token – xem 3 cơ chế `.ls-*` ở mục 4.3 và quyết định D7/D8.

### Step 5 – Tài liệu & khép lại
- `/user-manual`: mục đổi theme trong `03-tai-khoan.json` + `updatedAt`.
- `CLAUDE.md`: thêm quy ước "màu phải qua token trong `globals.css`, không viết `rgba`/hex thẳng".
- `req-4-acceptance.md` (nghiệm thu theo vai trò, dùng lại sau mỗi deploy), `req-4-progress.md`.
- Sửa tiêu đề `req-4.md`; ghi chú dời P0 vào `docs/epic/epic-1.md`.

> Sai khác khi làm: `/user-manual` sửa **3 file** chứ không chỉ `03-tai-khoan.json` – thêm callout ở trang *Trình soạn đề* (`06-de-thi.json`) và 3 dòng ở *Ngoài phạm vi* / *Sự cố thường gặp* (`09-van-hanh.json`), vì D7 đổi cách hiển thị màu người soạn chọn. `CLAUDE.md` sửa thêm mục *Bắt đầu phiên làm việc* (đang trỏ cứng vào req-3). D6 không còn việc: tiêu đề `req-4.md` đã đúng từ commit Step 1.

Mỗi step kết thúc: `pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm format:check` pass, chạy thử thật, rồi cập nhật `req-4-progress.md`.

---

## 8. Ngoài phạm vi req-4

- Lưu theme **theo tài khoản** (cột `users.theme` + `PATCH /me/theme`) – xem B1 phương án (b), cộng thêm sau được mà không phải làm lại.
- Theme riêng cho từng trung tâm (màu thương hiệu tenant) – hiện tenant mới chỉ có logo.
- Chế độ tương phản cao, cỡ chữ, các mục trợ năng khác.
- Lọc sáng ảnh người dùng tải lên ở dark mode (D2).
- Nhóm P0 vận hành thật của epic-1 (domain + HTTPS, email, backup, rate limit) – dời sang req-5.
