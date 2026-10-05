# Requirement 4 – Tiến độ

> **Phiên chat mới:** đọc [CLAUDE.md](../../CLAUDE.md) → file này → phần liên quan của [req-4-plan.md](req-4-plan.md).
> Sau mỗi step: cập nhật bảng trạng thái + thêm mục nhật ký bên dưới.
>
> Trạng thái: ✅ Xong · 🟡 Đang làm · ⬜ Chưa làm · ⛔ Bị chặn

## Bảng trạng thái

| Step | Nội dung | Trạng thái | Ngày xong | Ghi chú |
|---|---|---|---|---|
| 0 | Câu hỏi + plan | ✅ | 2026-09-23 | 4 câu chặn đã chốt (A1 3 theme, B1 cookie, B2 có "Theo hệ thống", C2 chỉ ở màn giới thiệu section); A2/A3/C1/D1–D6 đi theo Đề xuất |
| 1 | Nền tảng theme (token 3 theme, cookie, `ThemeToggle`, chống nháy) | ✅ | 2026-09-23 | Dark mode **đổi được** nhưng chưa dọn màu cứng – Step 2 mới sạch |
| 2 | Dọn màu cứng sang token (~70 `rgba` + hex, 33 file) + ESLint chặn tái phát | ✅ | 2026-09-25 | Không còn màu cứng nào ngoài 5 file bảng màu trong danh sách cho phép |
| 3 | Rà theme tối: khu vực chính, dashboard, docs | ✅ | 2026-09-25 | Chỉ giá trị khối `dark` đổi (25 biến) – `light`/`solarized-light` **không đổi một giá trị nào**, chỉ thêm token mới |
| 4 | Rà theme tối: soạn thảo, thi, chấm bài, lịch | ✅ | 2026-09-25 | Thêm 1 token (`--panel`) + 3 cơ chế `.ls-*`; `light`/`solarized-light` vẫn **không đổi một giá trị nào** |
| 5 | Tài liệu `/user-manual`, `CLAUDE.md`, nghiệm thu, epic-1 | ✅ | 2026-09-25 | Thêm trang **Giao diện** vào `/user-manual`, `req-4-acceptance.md` (7 mục, 46 dòng bấm tay), quy ước màu vào `CLAUDE.md`, dời P0 sang req-5 |

## Nhật ký

### Step 0 – Câu hỏi & plan (2026-09-23)

Quét source trước khi hỏi, kết quả quyết định phạm vi:

- **1.673 lượt `var(--…)`** trong 253 file → thêm khối `:root[data-theme='…']` là đổi được gần hết giao diện, **không sửa dòng nào** ở các file đó.
- **~70 `rgba(...)` viết thẳng** (33 file) là phần việc thật: lớp phủ mờ tính theo nền sáng, sang nền tối sẽ mất hút. Đã nhóm thành token ở plan mục 4.2.
- ~46 hex (7 file) phần lớn là màu nhấn Solarized – dùng chung được cả sáng lẫn tối; chỉ vài chỗ "nướng" cho nền sáng (`Badge`, `.exam-blank`, caret `<select>`).
- Chỉ **30** class màu Tailwind cố định (19 file), đa số `text-white` trên nền nhấn → giữ.
- **LC không có dark mode** (`design/*.html` + `globals.css` chỉ có Solarized Light) → lần này không copy được từ LC, bảng màu dark tự dựng, cần người dùng xem lại.
- `(exam)/layout.tsx` không có header nào → dẫn tới câu hỏi C2.

Lưu ý cho Step 1: `SiteHeaderNav` có 3 nhánh trả về (loading / đã đăng nhập / khách) – nút đổi theme phải có ở **cả ba**, không thì khách vào trang chủ không thấy nút.

### Step 1 – Nền tảng theme (2026-09-23)

**Đã làm**

- `globals.css`: 3 khối bảng màu – `:root, :root[data-theme='light']` (trắng, cũng là mặc định của `:root` trần để trang tự dựng `<html>` riêng như `global-error.tsx` vẫn có màu), `:root[data-theme='solarized-light']`, `:root[data-theme='dark']`. Thêm 27 token mới của plan mục 4.3 (`--bg-blur`, `--shadow-1/2/3`, `--accent-shadow`, `--ok/--warn/--info` × `soft/border/text`, `--danger-soft/-border`, `--link`, `--blank-bg`, `--footer-*`, `--overlay`, `--select-caret`). Thêm `:root[data-theme-switching] *` để tắt transition trong lúc đổi theme.
- `src/theme/`: `theme.ts` (hàm thuần + hằng số), `theme-script.ts`, `ThemeProvider.tsx`, `ThemeToggle.tsx`, `index.ts`.
- `app/layout.tsx`: đọc cookie `ls_theme` ở server → `data-theme` trên `<html>` + `suppressHydrationWarning`, nhúng `themeScript` làm phần tử đầu `<body>`, bọc `ThemeProvider`.
- Gắn `ThemeToggle`: `SiteHeaderNav` (**cả 3 nhánh** loading / đã đăng nhập / khách), `DashboardShell`, `UserManualShell`, `SectionIntroScreen`.
- `vi.theme` (label, `names`, `hints`, `current`).

**Bảng màu chọn theo tương phản đo được** (không chọn bằng mắt), ghi kèm trong `globals.css`:

- Nền trắng: `--muted` **không** dùng base1 `#93a1a1` (chỉ 2.7:1) mà dùng `#66787b` (4.6). `--body` `#5f747b` (4.9), `--fg` base00 (5.4), `--accent` magenta giữ nguyên (4.6 trên trắng, tốt hơn 4.2 trên nền kem).
- Nền tối: `--accent` phải sáng lên thành `#ea5c9e` (4.7; magenta gốc chỉ 3.3), `--danger` `#e9635f`, `--muted` `#82969a`; bóng đổ chuyển sang đen đậm (`rgba(0,0,0,.35→.65)`) vì bóng xanh mờ không nhìn ra trên nền tối.
- `solarized-light` giữ **đúng từng giá trị** của bản trước req-4 – đã đối chiếu bằng script với `git show HEAD:…/globals.css`: cả 16 biến cũ khớp tuyệt đối.

**Sai khác so với plan**

- Plan mục 4.4 định viết test jest `no-hardcoded-color.spec.ts`. `apps/lang-app` **chưa có hạ tầng test nào** (không jest config, không script `test`, không file spec – kể cả các hàm thuần sẵn có như `calendar-model.ts`, `curriculum-draft.ts`). Dựng jest cho lang-app là việc ngoài phạm vi req-4 → đổi sang quy tắc ESLint `no-restricted-syntax`, làm ở Step 2. Plan mục 4.4 đã cập nhật.
- Không cần khối `@media (prefers-color-scheme)` trong CSS: `system` do `themeScript` quy về `light`/`dark` trước khi trang được vẽ, nên không phải nhân đôi bảng màu dark trong CSS.
- Bỏ `themeFromCookieHeader` khỏi `theme.ts`: server đọc cookie bằng `cookies()` của Next, client đọc bằng regex trong `themeScript` – hàm này không có ai dùng.

**Đã nghiệm thu**

- `pnpm build && lint && typecheck && test && format:check` pass (348 test lang-api vẫn xanh).
- Chạy `next start` thật, kiểm HTML server render theo cookie: không cookie → `data-theme="light"`; `dark` → `dark`; `solarized-light` → `solarized-light`; cookie rác `hacker` → rơi về `light`; `system` → `light` (script sửa sau). **HTML đầu tiên đã đúng theme nên không nháy màu**, và 3 theme cụ thể đúng cả khi tắt JS.
- Nút đổi giao diện có trong HTML server render của `SiteHeaderNav` nhánh khách (`aria-label="Giao diện: Sáng"`, icon mặt trời), nhãn đổi theo cookie (`dark` → "Giao diện: Tối", `solarized-light` → "Giao diện: Giấy").
- CSS đã build (`0c5676383c1dade2.css`) có đủ 3 bảng màu + 27 token × 3 lần + `background-image:var(--select-caret)`.
- Chạy **đúng chuỗi script được ship** (lấy lại từ HTML server trả về) trong Node với DOM giả, 12 trường hợp: đường đi thường (không ghi cookie lại), `system` theo OS sáng/tối, cookie mất mà localStorage còn (tự dựng lại cookie), giá trị rác `hacker`/`<script>` (rơi về `light`, **không** ghi giá trị lạ vào `data-theme` hay cookie), `localStorage` ném lỗi ở cửa sổ ẩn danh, cookie lẫn nhiều giá trị, và tên cookie gần giống (`other_ls_theme`) không được khớp.

**Chưa nghiệm thu được ở phiên này**

Môi trường không có tool trình duyệt nên **chưa bấm thử** nút đổi theme, chưa xem mắt thường 3 bảng màu. Cần người dùng kiểm: bấm 4 mục ở cả 4 header (khu vực chính, dashboard, `/user-manual`, màn hình giới thiệu section khi thi), F5 xem có giữ lựa chọn, và nhìn tông màu dark có chấp nhận được không.

**Lưu ý cho Step 2**

Sau Step 1 dark mode **đổi được nhưng chưa sạch** – đúng như plan xếp thứ tự. Các chỗ còn màu cứng còn lộ rõ ở dark, ví dụ:

- Header `(site)` và `UserManualShell` vẫn `bg-[rgba(253,246,227,.92)]` → dải kem sáng trên trang tối. Đổi sang `var(--bg-blur)`.
- `Badge` tone `success`/`warning`/`danger`, `SiteFooter`, bóng `shadow-[0_18px_44px_rgba(0,43,54,.08)]` (tàng hình ở dark), `.exam-blank`, `bg-black/5` của `TagMultiSelect`, `bg-[#859900]` trong `SectionIntroScreen`.
- `app/global-error.tsx` tự dựng `<html>` riêng (không có `data-theme`) và dùng hex cố định – nhờ `:root` trần = light nên vẫn ra trang sáng đọc được; cân nhắc giữ nguyên có chủ đích và ghi chú, thay vì cố cho nó theo theme.

### Step 2 – Dọn màu cứng sang token (2026-09-25)

**Đã làm**

- **64 file** đổi màu cứng sang `var(--…)`: 134 lượt thay máy móc theo bảng plan 4.2 (`rgba` bóng đổ/viền/trạng thái, `bg-black/30·40·5`, `rgba(253,246,227,.92·.94)`) + các chỗ phải xử lý riêng (`Badge`, `FormAlert`, `SiteFooter`, `PlanCards`, `SimulatorState`, `ManualBlocks`, `indicator.tsx`, `SectionIntroScreen`, `SectionTabs`, `IssuePanel`, `RegisterForm`, `Brand`, `ExamToolbar`, `TagMultiSelect`, `form-styles`, `ConfirmDialog`, `SpeakingRecorder`).
- `globals.css`: thêm 12 token vào mỗi khối theme + 7 token **không đổi theo theme** khai báo một lần trong `:root` (chi tiết ở plan mục 4.3, có bảng lý do). Thêm phần đầu file mô tả quy ước `--x` / `--x-text` / `--x-soft` / `--x-border` / `--on-status` để Step 3–4 dùng đúng.
- `.exam-blank` → `var(--blank-bg)`, `.exam-editor a` → `var(--link)` (plan D3: chuyển token, không đổi hành vi).
- **ESLint chặn tái phát** (`apps/lang-app/eslint.config.mjs`): `no-restricted-syntax` báo lỗi khi `Literal`/`TemplateElement` chứa `rgba()`/`rgb()`/`hsl()` hoặc hex màu. Quét **mọi chuỗi**, không chỉ `className`, nên bắt được cả `style={{ color: '#fff' }}`. Đã thử: bắt đúng 3 dạng (className, template string, object style), không báo oan `href="/#features"`.
- Danh sách cho phép 5 file (`colorPalettes`): `global-error.tsx` (tự dựng `<html>`, không có `data-theme` – đã ghi comment giải thích), `(site)/page.tsx` + `calendar-model.ts` + `catalog-ui.tsx` + `ExamToolbar.tsx` (bảng màu minh hoạ/màu người dùng chọn, đọc được ở cả 3 theme).

**Sai khác so với plan**

- Plan chỉ liệt kê token ở 4.3; thực tế cần thêm 12 token nữa mới giữ được "giống hệt ở `solarized-light`" (`--danger-bg`, `--on-status`, `--sidebar-hover`, `--accent-hover`, `--cyan`, `--cyan-soft`, `--code-bg`, `--code-fg`, `--footer-muted`, `--footer-divider`, nhóm `--on-accent*`, `--highlight-*`). Đã cập nhật plan mục 4.3.
- Sửa 3 giá trị của Step 1: `--overlay` thành `rgba(0,0,0,.4)` (bằng `bg-black/40` cũ của `Modal`), `--info-text` của `solarized-light` thành `#1f6fa8` (bằng chữ callout cũ), alpha `--ok-soft`/`--warn-soft`/`--info-soft` gom về .12/.12/.10.
- Plan 4.1 định **giữ** `text-white` trên nền nhấn. Vẫn giữ trên `--accent`, nhưng 6 chỗ `text-white` nằm trên **nền màu trạng thái** (`--ok`/`--warn`/`--info`/`--danger`) đổi sang `--on-status`: ở theme tối các màu này sáng lên (để đủ tương phản khi làm chữ) nên chữ trắng trên đó chỉ còn ~2.4:1. Nút nhấn magenta còn `text-white` – soát lại ở Step 3.
- `#2f9e44` (dấu tích "không có lỗi" của `IssuePanel`) đổi sang `--ok` = `#859900`: bỏ một sắc lục lạc khỏi bảng màu, đây là **thay đổi có chủ ý** ở `solarized-light`.

**Đã nghiệm thu**

- `pnpm build && lint && typecheck && test && format:check` pass.
- **Không còn `rgba()`/hex nào** trong `src` ngoài 5 file bảng màu kể trên (quét lại bằng grep).
- Mọi `var(--…)` được dùng đều có khai báo, và **mọi token khai báo đều có nơi dùng** (script đối chiếu 2 chiều) → không có token chết, không có biến gõ sai.
- 3 khối theme có **đúng cùng 52 tên biến** (+7 biến `:root` không đổi theo theme).
- Đối chiếu **từng cặp (màu cũ → token)** bằng script, giải biến theo khối `solarized-light`: 40/70 khớp tuyệt đối, phần còn lại chỉ lệch alpha ≤ .06 trong cùng một màu. Chỗ lệch nhiều hơn, đã cân nhắc và chấp nhận: viền nút banner vượt giới hạn (.45 → .35), nền mờ sidebar mobile (.30 → .40, dùng chung `--overlay` với modal), quầng sáng dưới logo `Brand` (.45 → .28), ring của `FormAlert` lỗi (`#f4d5d0` → `--danger-border`, cùng độ đậm với 3 tone còn lại), hover nút xoá chip (`black/5` → `--hover`).
- CSS đã build có đủ 3 bảng màu; các utility Tailwind dạng `var()` **đều sinh ra CSS** – kiểm từng class trong file css đã build, kể cả loại dễ hỏng: `ring-[var(--ok-border)]` → `--tw-ring-color`, `shadow-[0_18px_44px_var(--shadow-1)]` → `--tw-shadow`, `hover:bg-[var(--sidebar-hover)]`.
- Chạy `next start` thật (cổng 3123): `/`, `/login`, `/register` trả 200 ở cả 4 giá trị cookie (`light`/`solarized-light`/`dark`/rác), HTML server render có `data-theme` đúng và đã dùng `bg-[var(--footer-bg)]`, `bg-[var(--bg-blur)]`. Không lỗi trong log.

**Chưa nghiệm thu được ở phiên này**

Phép thử chính của step ("so bằng mắt từng trang ở `solarized-light`") vẫn cần bạn: môi trường không có tool trình duyệt. Phần đối chiếu giá trị màu đã làm bằng script (ở trên) nên chỉ còn rủi ro ở những chỗ lệch alpha đã liệt kê. Đề nghị bạn mở `solarized-light` và xem nhanh: trang chủ (hero, thẻ gói dịch vụ, footer), một bảng có `Badge`, một `FormAlert` lỗi, modal (độ tối của nền mờ), trình soạn đề (indicator thiếu dạng câu, ô điền, bút dạ quang) và màn hình kết quả (khối giải thích, ô số câu).

**Lưu ý cho Step 3**

- Nền nhạt của 4 màu trạng thái giờ đi qua `--x-soft`, chữ qua `--x-text`, nền đặc qua `--x` + `--on-status`. Soát theme tối thì sửa **giá trị token**, đừng thêm màu vào component.
- Nút nhấn magenta vẫn `bg-[var(--accent)] text-white` (~2.9:1 ở theme tối vì `--accent` đã sáng lên). Cần quyết ở Step 3: hạ `--accent` riêng cho nền, hay cho nút dùng `--on-status`/`--on-accent`.
- `(site)/page.tsx` dùng bảng màu Solarized trang trí (`IconTile`, `STAT_COLORS`) với `${color}22` – ở theme tối nền 13% của các màu này khá mờ, xem lại khi rà trang chủ.
- Máy có một tiến trình `next start` lạ đang giữ cổng 3100 (không phải của phiên này) – dùng cổng khác khi chạy thử.

### Step 3 – Rà theme tối: khu vực chính, dashboard, docs (2026-09-25)

**Cách rà (không có tool trình duyệt nên đo bằng script)**

Viết 5 script trong scratchpad, đều đọc thẳng `globals.css`:

1. Parser bảng màu: tách 3 khối `:root[data-theme=…]` + khối `:root` chung, giải `var()` lồng nhau, trộn alpha lên nền rồi tính tỉ số tương phản WCAG.
2. Bóc **cặp chữ/nền thật trong code**: quét mọi chuỗi trong `src`, gom `bg-*`/`text-*`/`border-*`/`ring-*` cùng một `className` → 130 cặp, kèm file:dòng.
3. Ma trận **chữ trên nền thừa hưởng** (chữ của con nằm trên nền của cha, ví dụ chữ `--fg` trong callout `--warn-soft` của `/user-manual`) – dựng mọi token chữ trên `--bg`/`--card`/`--sidebar`.
4. **So dark với 2 theme sáng**: chỉ coi là lỗi khi dark **kém hơn mốc sáng**, vì nhiều cặp ở `solarized-light` cũng đã dưới 4.5 (`--muted` trên `--sidebar` chỉ 2.18) – sửa cho dark hơn mốc sáng thì phải đổi cả 2 theme sáng, ngoài phạm vi step.
5. Đối chiếu `globals.css` với `git show HEAD:` theo từng biến, cho cả 3 theme.

**Đã làm**

- **`color-scheme` cho từng theme** (`light`/`light`/`dark`) – phát hiện quan trọng nhất của step. Checkbox (14 chỗ), radio (6), mũi lên-xuống ô số (16), ô `date` (10) / `time` (6) / `datetime-local` (3), `type="file"` (3), bảng chọn ngày, danh sách `<option>` của mọi `<select>`, nền autofill: tất cả do **trình duyệt vẽ**, không ăn theo CSS của mình. Thiếu 1 dòng này thì theme tối lọt mảng trắng ở mọi ô đó (nặng nhất là bảng chọn ngày của Thời khoá biểu / Giáo trình lớp).
- **Quyết việc 1 để lại từ Step 2 – nút nhấn magenta:** tách token `--accent-bg` (nền đặc, `#d33682` ở **cả 3 theme**, `text-white` = 4.55) khỏi `--accent` (chữ/viền, theme tối sáng lên). 18 chỗ `bg-[var(--accent)]` có chữ đổi sang `--accent-bg`; 3 chỗ trang trí (thanh loading, thanh tiến độ hero, dấu chưa đọc) giữ `--accent` vì cần sáng để nổi trên nền tối. `--accent-hover` (chỉ dùng làm hover của nền nút) dồn về `:root` chung, `#b32c6d` cả 3 theme – trước đó theme tối để `#f27ab0`, hover xong chữ chỉ còn **2.38**.
- **Quyết việc 2 để lại từ Step 2 – khối minh hoạ trang chủ:** 6 hex viết thẳng trong `(site)/page.tsx` chuyển sang token (`--info`/`--ok`/`--violet`/`--orange`/`--cyan`/`--accent` + `*-soft`), thêm `--violet`/`--orange` vào 3 khối theme. Ô biểu tượng dùng `--x-soft` thay cho `${color}22`. Nền ô ở theme tối từ **1.05–1.07** (cam/magenta 13% trên nền base03 gần như không thấy) lên **1.19–1.36**, biểu tượng trên ô 4.45–5.24. `solarized-light` giữ đúng 3 mã cũ (`#6c71c4`, `#cb4b16`, `#d33682`); chỉ alpha nền ô lệch ≤ .033. **Trang chủ ra khỏi danh sách miễn ESLint** – giờ chỉ còn 4 file bảng màu.
- **Token `--raised`** (mặt nổi trên `--sidebar`/`--card`). Ở 2 theme sáng "nổi lên" = sáng hơn nền nên `--bg` (trắng/kem) làm được; ở theme tối `--bg` là mặt **tối nhất** nên mọi chỗ đó đang **lõm xuống**. Giá trị 2 theme sáng để đúng `--bg` cũ → không đổi gì. Áp cho: tab đang chọn của `AuthPanel` (đăng nhập/đăng ký), 2 khối trong nền `--sidebar` của trang chủ (dòng phần thi ở hero, thẻ tính năng), ngăn kéo sidebar mobile của `/user-manual`, panel `PreviewDialog`/`LessonPreviewDialog`, 4 popover của trình soạn đề (`SectionTabs`, `ExamToolbar`, `SlashMenu`, `number-popover` – thuộc Step 4 nhưng cùng một lỗi, đổi 1 token nên làm luôn).
- **Token `--img-mat`** (quyết định D2): logo trung tâm nền trong suốt vẽ bằng mực đậm sẽ mất hút trên nền tối. `TenantAvatar` lót `--img-mat` (trắng ở theme tối) thay cho `--hover`; **không** lọc sáng ảnh người dùng. Logo đặc thì `object-cover` che kín nền lót. `LogoPicker` dùng lại `TenantAvatar` nên sửa 1 chỗ là xong.
- **Chữ & nền theme tối sáng lên** (chi tiết ở plan 4.3): `--accent` `#ea5c9e → #ef70ab` (4.04 → 4.69 trên `--card`, mốc sáng 4.46), `--danger` `#e9635f → #ef7b77` (3.97 → 4.81, mốc 4.54), `--ok-text`/`--warn-text`/`--info-text` lên `#a8bd00`/`#d8a800`/`#63b4e8`, alpha `--ok/warn/info/danger-soft` từ .16 về **.12** như 2 theme sáng (.16 làm chìm chữ ~0.3 điểm mà chip cũng không rõ hơn), `--muted`/`--muted-2` `#82969a → #8ba0a4` (4.2 → 4.74 trên `--card`).
- **Nền mờ sau modal** `--overlay` .6 → **.72** ở theme tối: bóng đổ đen của panel không nhìn ra trên nền tối nên panel `--card` phải tự nổi bằng chênh lệch với nền đã tối đi.
- **Khối mã `/user-manual`**: `--code-bg` `#00212b → #001820` và thêm `border` cho `<pre>`. Ở 2 theme sáng khối mã là mảng tối trên nền sáng (13:1) nên rất rõ; ở theme tối nó chỉ tối hơn nền trang 1.12 → không thấy mép khối. Viền vô hại ở 2 theme sáng.
- **Viền trên của footer** `--footer-border` alpha .14 → .2: nền footer chỉ tối hơn nền trang 1.12 (quyết định D1) nên đường kẻ phải rõ bằng `--border` (1.4) mới ra được cảm giác kết trang.

**Sai khác so với plan**

- Plan Step 3 chỉ nói "soát tương phản/viền/backdrop-blur/thanh cuộn/các dialog". Thực tế phải **thêm 8 token** và 1 thuộc tính `color-scheme` (bảng lý do ở plan 4.3, đã cập nhật). Hai token `--raised`, `--img-mat` là **sửa cấu trúc** chứ không phải sửa màu: cùng một token `--bg` không thể vừa là "nền trang" vừa là "mặt nổi" khi thứ tự sáng-tối đảo chiều giữa theme sáng và theme tối.
- Đổi **9 file thuộc Step 4** (trình soạn đề, giả lập, `PreviewDialog`, `CalendarView`): đều là đổi tên token (`--accent` → `--accent-bg`, `--bg` → `--raised`) chứ không phải rà giao diện. Làm gộp ở đây để không có nửa số nút nhấn dùng token này, nửa dùng token kia. Step 4 vẫn phải rà nội dung các màn hình đó.
- Viền ở theme tối **không phải sửa**: `--border` trên `--card` là 1.33 (mốc `solarized-light` chỉ 1.20), `--border-strong` 1.63 (mốc 1.34), viền trạng thái 1.67–1.75 (mốc 1.29–1.37). Thanh cuộn cũng vậy (con trượt alpha .28 trên nền tối rõ hơn .24 trên nền trắng). `backdrop-blur` của 2 header dính dùng `--bg-blur` (alpha .9) – không có gì phải đổi.

**Đã nghiệm thu**

- `pnpm build && lint && typecheck && test && format:check` pass.
- **Đối chiếu từng biến với `HEAD`**: `light` và `solarized-light` **không có biến nào đổi giá trị**, chỉ thêm 7 token mới; chỉ khối `dark` đổi 25 giá trị. 3 khối theme vẫn có **đúng cùng 57 tên biến**.
- Mọi `var(--…)` được dùng đều có khai báo và **mọi token khai báo đều có nơi dùng** (66/66, script 2 chiều).
- **Không còn cặp chữ/nền nào ở theme tối kém hơn mốc 2 theme sáng.** Còn 7 cặp dưới 4.5 (3.99–4.18) nhưng tất cả đều **cao hơn** con số tương ứng ở `solarized-light`/`light` – muốn hơn nữa phải đổi cả 2 theme sáng. Ba "cặp" còn báo đỏ là dương tính giả: `--on-status` và `--highlight-fg` chỉ tồn tại kèm nền của chúng (đã kiểm từng chỗ dùng).
- Mọi nền **đặc** màu trạng thái/nhấn (`--ok`/`--warn`/`--info`/`--danger`/`--accent-bg`, 28 chỗ) đều có màu chữ khai báo tường minh (`--on-status` hoặc `text-white`) – không chỗ nào để chữ thừa hưởng từ trang.
- Chỉ còn **16 `text-white`**, đều nằm trên `--accent-bg` (4.55 cả 3 theme) trừ 1 dấu tích trên ô màu danh mục người dùng chọn. Không còn `bg-white`, không còn class màu Tailwind cố định nào khác.
- CSS đã build có `color-scheme: light` ×2 + `dark` ×1 **đúng trong khối theme tương ứng**, `--raised`/`--img-mat` ×3, `--accent-bg` ×1 (khối `:root` chung), và 2 utility mới `bg-[var(--accent-bg)]`/`bg-[var(--img-mat)]` **đều sinh ra CSS**.
- Chạy server thật (bản `standalone`, cổng 3177 – cổng 3100 có tiến trình lạ): `/`, `/login`, `/register`, trang 404 trả 200 ở cả 3 theme + cookie rác (rơi về `light`), `data-theme` đúng trong HTML server render, và **0 mã màu cứng** trong HTML của cả 4 trang.

**Chưa nghiệm thu được ở phiên này**

Không có tool trình duyệt và các trang trong danh sách [req-3-acceptance.md](req-3-acceptance.md) đều **cần đăng nhập** (dữ liệu render ở client nên đọc HTML server cũng không thấy gì). Phần đo được đã đo bằng script trên **toàn bộ `src`**, không chỉ trang công khai, nên rủi ro còn lại là mỹ quan. Đề nghị bạn mở **theme tối** và xem:

1. **Tông màu chung** – `--accent` và `--danger` đã sáng lên (hồng/đỏ nhạt hơn Step 1) để đủ tương phản làm chữ; nút nhấn thì vẫn đúng magenta `#d33682`. Nếu thấy hồng quá nhạt, nói để hạ lại (đổi 1 dòng, chỉ ảnh hưởng theme tối).
2. **Ô ngày/giờ và checkbox** ở Giáo trình lớp, Thời khoá biểu, Cài đặt → bảng chọn ngày phải tối theo (đây là chỗ `color-scheme` xử lý, chưa ai xem bằng mắt).
3. **Độ nổi của modal** (`Modal`/`ConfirmDialog`/`PromptDialog`): nền mờ đã đậm .72 nhưng panel `--card` trên nền tối chỉ chênh 1.52 (2 theme sáng là 2.85–2.99) – bóng đổ đen vốn không nhìn ra trên nền tối. Nếu thấy panel "phẳng" thì nên cho `Modal` dùng `--raised` (2 theme sáng sẽ đổi nhẹ từ `#fffdf5`/`#ffffff`, cần bạn đồng ý).
4. **Tab đang chọn của 2 khối 2 nút** – trang Chấm bài (Bài thi/Bài học) và `PreviewDialog`. Hai chỗ này để `bg-[var(--card)] shadow-sm`: ở theme tối `shadow-sm` (bóng đen mặc định của Tailwind) không thấy và nền chỉ chênh `--sidebar` 1.09, nên chỉ còn màu chữ phân biệt. **Cố ý không sửa** vì đổi sang `--raised` sẽ làm `solarized-light` đổi (pill từ `#fffdf5` sang `#fdf6e3`) – phạm điều kiện nghiệm thu của step. Bạn xem thấy chìm thì cho phép đổi.
5. **Logo trung tâm nền trong suốt** ở theme tối: giờ có nền trắng lót (D2). Xem có bị "tem trắng" khó coi không.
6. Footer và khối mã `/user-manual`: cả hai chỉ tối hơn nền trang ~1.1 nên phải dựa vào viền.

**Lưu ý cho Step 4**

- Đã có `--accent-bg` (nền nút) / `--accent` (chữ, viền) và `--raised` (mặt nổi). Rà các màn hình soạn thảo/thi/chấm bài thì **dùng đúng token theo vai trò**, đừng lấy `--accent` làm nền có chữ hay `--bg` làm popover.
- **Bút dạ quang** (`--highlight-bg` `#fff3bf` + `--highlight-fg` `#1f2328`, không đổi theo theme) hiện chỉ đúng ở 2 chỗ có khai báo cả cặp. `HighlightPlugin` của Plate render thẻ `<mark>` **mặc định của trình duyệt** trong editor – cần xem thẻ đó ở theme tối có ra vàng/chữ đen hay không.
- Còn 6 chỗ `bg-[var(--bg)]` làm **ô nhập** nằm trong panel `--card` (`SectionEditor`, `ExamSimulator`, `pair.tsx`, `ExamToolbar` select…): ở theme tối ô nhập thành tối hơn panel (lõm), ở 2 theme sáng thì sáng hơn (nổi). Không phải lỗi tương phản, nhưng nếu muốn đồng nhất với các ô nhập khác (đang dùng `--sidebar`) thì sửa ở Step 4.
- `CalendarView` dùng `hover:brightness-95` (tối đi khi hover) cho ô buổi học – trên nền tối nên là sáng lên. Xem lại ở Step 4.
- 5 script đo tương phản nằm trong scratchpad của phiên này (mất khi đổi phiên). Nếu Step 4 cần đo lại thì viết lại theo mô tả ở đầu mục này; phần khó duy nhất là bóc cặp chữ/nền từ `className`.

### Step 4 – Rà theme tối: soạn thảo, thi, chấm bài, lịch (2026-09-25)

**Cách rà**

Viết lại 3 script trong scratchpad (bản Step 3 mất theo phiên): parser `globals.css` → 3 bảng màu + tỉ số tương phản WCAG; bóc cặp chữ/nền thật từ mọi chuỗi trong `src` (79 cặp) + ma trận "chữ trên nền thừa hưởng"; đối chiếu từng biến với `git show`. Hai cái bẫy khi viết lại:

- Regex tách khối `:root` phải **không nuốt dấu `}`** (nuốt thì các khối chẵn bị bỏ qua – lúc đầu `solarized-light` ra 0 biến), và phải **bỏ các khối `:root[data-theme='dark'] .lớp-nào-đó`** ra khỏi bảng màu.
- Nền bán trong suốt (`--x-soft`, `--hover`, `--danger-bg`) phải trộn lên **mặt thật của theme** rồi mới tính; trộn lên trắng thì mọi cặp ở theme tối ra số sai hoàn toàn (`--ok-text/--ok-soft` báo 1.92 thay vì 5.06).

**Phát hiện chính: phần việc của step này không nằm trong bảng token.** Step 2–3 đã tokenise hết các màn hình soạn thảo/thi/chấm bài/lịch, nên đo cặp chữ/nền chỉ còn đúng 1 chỗ lệch nhẹ. Cái hỏng ở theme tối là **3 nhóm màu đứng ngoài bảng token**, đều "nướng" cho nền sáng:

| Nhóm | Nguồn màu | Tệ nhất ở theme tối (trước) |
|---|---|---|
| Màu chữ/nền người soạn chọn trong nội dung đề | 8 + 6 mã màu trong `ExamToolbar`, lưu vào dữ liệu đề | chữ `#1f2328` **1.05:1**; nền `#ffe3e3` với chữ thừa hưởng **1.01:1** |
| Indicator, dạng câu hỏi, callout | `@lang/exam-core` (`INDICATORS`, `QUESTION_TYPES`, `CALLOUT_COLORS`) | `#a61e4d` trên `--card` **1.80:1** (ở `solarized-light` là 6.68) |
| Màu lớp trong lịch | `PALETTE` của `calendar-model.ts` | không hỏng, nhưng hex cố định nên không sáng lên được |

**Đã làm**

- **Quyết định D7 (bạn chọn phương án (d))** – giữ vùng nội dung theo theme, ở theme tối tự chuyển màu người dùng sang bản sáng cùng sắc. Cơ chế đặt trong `globals.css`, không có mã màu nào thêm vào component:
  - `.ls-leaf-fg` / `.ls-leaf-bg`: component ghi màu ra biến `--leaf-fg`/`--leaf-bg`; theme tối `color-mix(in srgb, var(--leaf-fg) 35%, var(--heading))` cho chữ và `color-mix(… var(--leaf-bg) 22%, transparent)` cho nền.
  - Áp cho **cả hai đường render**: bản giả lập (`renderLeaf` của `ExamSimulator` – dùng ở xem trước, thi, học bài, chấm bài, xem lại bài làm) và **trình soạn đề**, bằng cách cấu hình `FontColorPlugin`/`FontBackgroundColorPlugin` của Plate với `transformClassName` + `transformStyle` (ghi biến CSS thay cho `color`/`background-color`). Plate merge sâu nên `nodeKey`/parser của plugin gốc giữ nguyên.
  - Tỉ lệ 35% chọn theo **màu tối nhất phải đỡ**: `#1f2328` đạt **4.48** trên cả `--bg`/`--card`/`--raised` (trộn 55% thì chỉ 3.09). 7 màu chữ còn lại 5.39–7.15. 6 màu nền dạ quang: chữ `--heading` trên nền mới **5.51–5.86** (trước 1.01–1.16), mảng nền vẫn nổi 1.81–1.92 so với `--card`.
- **`.ls-tint` + `-fg`/`-line`/`-dot`/`-soft`/`-faint`** cho bảng màu cố định của trình soạn đề, cùng công thức 35%: 15 màu indicator/dạng câu hỏi từ 1.80–5.23 lên **5.11–7.15**. Áp cho chip indicator (`plate/exam/indicator.tsx`), callout ở cả editor (`rich-blocks.tsx`) lẫn giả lập, và 4 chỗ chấm màu (`Minimap`, `SlashMenu`, `IndicatorDialog`, 2 menu của `ExamToolbar`).
- **Lịch** (quyết định 2): `PALETTE` của `calendar-model.ts` đổi sang 8 token (`--info`, `--accent`, `--ok`, `--orange`, `--violet`, `--cyan`, `--warn`, `--danger`) – ở `solarized-light` là **đúng 8 mã cũ**, ở theme tối tự sáng lên. Nền/viền ô buổi học chuyển vào class `.ls-event`; nền ô ở theme tối chênh nền trang **1.15–1.25** (2 theme sáng 1.12–1.19). File ra khỏi danh sách miễn ESLint → **chỉ còn 3 file** bảng màu.
- **`hover:brightness-95` của `CalendarView`** (2 chỗ, quyết định 4): bỏ, thay bằng `.ls-event:hover` tăng độ đậm 12% → 22%. Trên nền tối "tối đi khi hover" là sai chiều; cách mới đổi một lượng tương đương ở cả 3 theme (1.16–1.23).
- **Bút dạ quang trong editor** (quyết định 3): `HighlightPlugin` render `<mark>` trần nên trong trình soạn đề nó ăn **màu mặc định của trình duyệt** (vàng gắt, và sau Step 3 còn đổi theo `color-scheme: dark`), lệch hẳn với bản giả lập vốn dùng `--highlight-bg`/`--highlight-fg`. Thêm `.exam-editor mark` khai báo cả cặp → 3 theme và mọi trình duyệt ra cùng một màu.
- **Token `--panel`** (quyết định D8, câu Step 3 để lại): mặt của `Modal` (nên cả `ConfirmDialog`/`PromptDialog`) và tab đang chọn của 2 khối 2 nút (trang Chấm bài, `PreviewDialog`). Ở 2 theme sáng bằng **đúng `--card` cũ** nên không đổi gì; ở theme tối nhấc lên `--raised`: panel dialog chênh nền mờ **1.52 → 1.75**, pill chênh thanh `--sidebar` **1.06 → 1.21** (mốc `solarized-light` 1.20).
- **Ảnh trong nội dung đề**: hình vẽ nền trong suốt mực đậm mất hút trên nền tối. Lót `--img-mat` như logo trung tâm (quyết định D2), chỉ trong `:root[data-theme='dark']` nên 2 theme sáng không đổi gì; ảnh đặc thì che kín nền lót.
- **3 màu chữ của theme tối sáng thêm một nấc**: `--accent` `#ef70ab → #f177ae`, `--danger` `#ef7b77 → #f2837f`, `--orange` `#e8834f → #eb8a58` (kèm `*-soft`/`-border`/`-bg` cho khớp rgb). Lý do: `--panel`/`--raised` sáng hơn `--card` nên chữ trên dialog tụt ~0.6 điểm – ba màu này đang **kém mốc 2 theme sáng** 0.08–0.13 khi nằm trên mặt đó. Sau khi sửa: 4.30 / 4.49 / 4.48.

**Sai khác so với plan**

- Plan Step 4 viết là "rà theme tối" các màn hình. Thực tế chỉ **1 token mới**; phần lớn công việc là **3 cơ chế hiển thị** trong `globals.css` (`.ls-tint*`, `.ls-leaf-*`, `.ls-event`) cho màu nằm ngoài bảng token. Plan mục 4.3 đã thêm bảng mô tả, mục 1 thêm quyết định D7/D8.
- Dùng `color-mix()` – lần đầu trong dự án. Baseline từ 2023 (Chrome 111, Safari 16.2, Firefox 113); project không khai báo `browserslist` nên Next đã nhắm trình duyệt hiện đại.
- **Quyết định 5 (6 chỗ `bg-[var(--bg)]` làm ô nhập): không gom về `--sidebar`.** Không phải lỗi tương phản (chữ `--heading` trên `--bg` ở theme tối đạt 12.25), "lõm xuống" là đúng ngữ nghĩa của ô nhập, và gom lại sẽ **đổi `solarized-light`** (`#fdf6e3` → `#eee8d5`) – phạm điều kiện nghiệm thu. Nếu muốn đồng nhất thì làm thành một việc riêng, đổi cả 3 theme cùng lúc.
- `ExamToolbar` **vẫn ở danh sách miễn ESLint**: 8 màu chữ + 6 màu nền là **ô chọn màu**, phải hiện đúng mã màu sẽ lưu vào dữ liệu. Chỉ chỗ *hiển thị* màu đó mới đi qua `.ls-leaf-*`. `catalog-ui.tsx` giữ nguyên theo plan mục 2.8.
- Chip indicator thiếu dạng câu (`missing`) trước đây trộn `var(--danger)` vào cùng chỗ với màu bảng; nay tách hẳn sang class Tailwind (`border-[var(--danger)] bg-[var(--danger-soft)]`) cho khỏi lẫn hai cơ chế.

**Đã nghiệm thu**

- `pnpm build && lint && typecheck && test && format:check` pass.
- **Đối chiếu từng biến với `HEAD` và với `67b82ce`**: `light` và `solarized-light` **không có biến nào đổi giá trị**, chỉ thêm 8 token (7 của Step 3 + `--panel`). Khối `dark` đổi 18 giá trị so với `67b82ce`, trong đó Step 4 đụng 8 (`--accent`, `--accent-soft`, `--danger`, `--danger-soft`, `--danger-border`, `--danger-bg`, `--orange`, `--orange-soft`). 3 khối theme vẫn có **đúng cùng 67 tên biến**.
- **Không còn cặp chữ/nền nào ở theme tối kém hơn mốc 2 theme sáng** – cả trong 79 cặp bóc từ `className` lẫn ma trận nền thừa hưởng (đây là chỗ Step 3 còn 3 cặp lệch trên `--raised`).
- Mọi `var(--…)` được dùng đều có khai báo và mọi token khai báo đều có nơi dùng (script 2 chiều; 4 biến `--tint-raw`/`--leaf-fg`/`--leaf-bg`/`--event-color` là biến đặt bằng inline style từ dữ liệu, không thuộc bảng màu).
- **Không còn `rgba()`/hex nào** trong `src` ngoài `globals.css` và 3 file bảng màu người dùng chọn.
- CSS đã build có đủ: `.ls-tint*` (7 rule), 3 rule `:root[data-theme='dark'] .ls-*`, `.ls-event` + `:hover`, `:root[data-theme='dark'] .exam-media`, `.exam-editor mark`, `--panel` × 3 theme và utility `bg-[var(--panel)]`.
- Chạy server thật (bản `standalone`, cổng 3188): `/`, `/login`, `/register` trả 200 ở cả 3 theme + cookie rác (rơi về `light`), `data-theme` đúng trong HTML server render, **0 mã màu cứng** trong HTML, và CSS lấy qua HTTP có đúng các rule mới.

**Chưa nghiệm thu được ở phiên này**

Phép thử của step ("soạn một đề có đủ khối → xem trước → thi thử → chấm tay ở theme tối") **cần bạn bấm**: máy không có tool trình duyệt, và mọi trang trong phạm vi Step 4 đều cần đăng nhập + render ở client nên đọc HTML server không thấy gì. Những chỗ chỉ bạn xác nhận được:

1. **Màu chữ/nền người dùng chọn ở theme tối** (D7) – mở một đề đã soạn có màu chữ/bút nền. Số đo nói là đọc được (4.48–7.15), nhưng màu hiện ra **nhạt hơn màu đã chọn** và hai màu gần nhau (2 sắc hồng, 2 sắc tím) sẽ khó phân biệt hơn. Muốn đậm hơn thì đổi `35%` thành `45%` trong `globals.css` (`--tint` và `.ls-leaf-fg`), đổi lại màu gần đen tụt xuống 4.03.
2. **Trình soạn đề ở theme tối** – chip indicator, callout, `<mark>` bút dạ quang, chấm màu trong `SlashMenu`/`Minimap`. Riêng đường đi trong editor (cấu hình `transformClassName`/`transformStyle` của Plate) là chỗ mình **không chạy thử được**: nếu Plate không áp, màu chữ sẽ vẫn hiện y như đã chọn (tức là chữ đen trên nền tối) – đây là dấu hiệu duy nhất cần để mắt.
3. **Ô buổi học trong lịch** (tuần/tháng): màu lớp giờ theo token nên **ở `light` có 3 sắc đổi nhẹ** (tím/cam/mòng dùng bản đậm hơn của theme trắng); `solarized-light` giữ đúng 8 mã cũ. Xem hover có thấy đổi không.
4. **Dialog ở theme tối** (D8): panel đã nhấc lên nhưng vẫn thấp hơn mốc 2 theme sáng (1.75 vs 2.85). Nếu còn thấy phẳng thì nói, đổi 1 dòng `--panel` của khối `dark`.
5. **Tông hồng/đỏ/cam** đã sáng thêm một nấc so với Step 3 – nếu thấy nhạt quá, 3 dòng đó lùi lại được mà không ảnh hưởng 2 theme sáng.
6. **Ảnh trong đề có nền trong suốt** ở theme tối: giờ có nền sáng lót, xem có bị "tem trắng" khó coi không.

**Lưu ý cho Step 5**

- `/user-manual` cần thêm: mục đổi theme (D4 đã ghi) **và** một câu ở trang soạn đề rằng màu chữ/nền tự chọn sẽ được làm sáng lên ở giao diện Tối để đọc được (D7) – người soạn sẽ thấy màu hiện ra không đúng y mã đã chọn.
- `CLAUDE.md` (mục lang-app) nên ghi thêm, cạnh quy ước "màu phải qua token": **màu đến từ dữ liệu hoặc bảng màu cố định thì đi qua `.ls-tint*` / `.ls-leaf-*` của `globals.css`, không đặt thẳng `color`/`backgroundColor`**.
- Còn 3 file được miễn luật ESLint màu cứng: `global-error.tsx`, `catalog-ui.tsx`, `ExamToolbar.tsx` – đều có lý do đã ghi trong `eslint.config.mjs`.
- Việc để ngỏ (ngoài phạm vi req-4, cần đổi cả 3 theme): gom 6 chỗ `bg-[var(--bg)]` làm ô nhập về `--sidebar`.


### Step 5 – Tài liệu & khép lại (2026-09-25)

**Đã làm**

- **`/user-manual` – trang mới `Giao diện`** (nhóm **Tài khoản**, `03-tai-khoan.json`, cho mọi vai trò): bảng 4 mục Sáng · Giấy · Tối · Theo hệ thống; nút nằm ở đâu (3 header + màn hình giới thiệu section, không có khi đồng hồ chạy); lựa chọn nhớ **theo trình duyệt** (cookie `ls_theme` + localStorage) chứ không theo tài khoản; một mục riêng giải thích **màu trong nội dung đề/bài học được làm sáng lên ở giao diện Tối** (D7) và nội dung lưu không đổi.
- **`06-de-thi.json` → Trình soạn đề**: chèn callout ngay trước mục **Lưu** – màu chữ/màu nền chọn trên thanh công cụ sẽ hiện nhạt hơn mã đã chọn khi người xem dùng giao diện Tối, kèm liên kết tới trang Giao diện.
- **`09-van-hanh.json`**: thêm dòng **Giao diện** vào bảng *Ngoài phạm vi hiện tại* (lưu theo tài khoản, bảng màu riêng theo trung tâm, tương phản cao, cỡ chữ, lọc sáng ảnh) và 2 dòng vào *Sự cố thường gặp* ("đổi giao diện xong tải lại lại về Sáng" → trình duyệt chặn cookie/bộ nhớ cục bộ; "màu chữ trong đề không đúng màu tôi chọn" → đang ở giao diện Tối).
- `user-manual.content.ts`: `updatedAt` `2026-09-22 → 2026-09-25`.
- **`CLAUDE.md`**: mục *Bắt đầu phiên làm việc* trỏ vào `req-N-progress.md` của requirement đang làm (mới nhất là req-4) thay vì cứng req-3, và thêm cả 2 file nghiệm thu. Mục lang-app thêm 3 gạch đầu dòng: quy ước 3 theme + **cấm `rgba()`/hex trong component** (ESLint, 3 file được miễn); **màu từ dữ liệu / bảng màu cố định đi qua `.ls-tint*` / `.ls-leaf-*` / `.ls-event`**, component chỉ truyền mã màu vào biến CSS; **vai trò từng token** (`--accent-bg` là nền nút + `text-white`, `--accent` chỉ chữ/viền, `--raised`/`--panel` là mặt nổi, bộ `--x`/`-text`/`-soft`/`-border`/`--on-status`).
- **`req-4-acceptance.md`** (mới): checklist bấm tay theo vai trò, 7 mục – cơ chế đổi theme · khách & tài khoản · System Owner/Admin · quản trị trung tâm · giáo viên (soạn thảo/xem trước/chấm bài) · học viên · phụ huynh, cộng mục **"hai giao diện sáng không được đổi"** và mục hướng dẫn sửa màu (kể cả 3 chỗ chỉnh bằng 1 dòng). Cột `Theme` ghi rõ việc nào phải xem ở cả 3 giao diện; 3 dấu hiệu hỏng cần để ý ghi ngay đầu file.
- **`docs/epic/epic-1.md`** (D5): ghi chú dưới tiêu đề nhóm P0 rằng req-4 đã dùng cho giao diện 3 theme nên **nhóm P0 dời sang req-5**; bảng "Đề xuất chia phase" đánh dấu req-4 ✅ và dời 3 phase còn lại thành req-5/6/7 (giữ nguyên nội dung từng phase).

**Sai khác so với plan**

- **D6 không còn việc**: tiêu đề `req-4.md` đã là `# Requirement 4` từ commit Step 1 (`22ab2a5`).
- Plan chỉ nói sửa `03-tai-khoan.json`; thực tế sửa thêm `06-de-thi.json` và `09-van-hanh.json` vì D7 đổi **cách hiển thị màu người soạn chọn** – người dùng sẽ hỏi đúng chỗ đó, và quy ước của `CLAUDE.md` là tính năng/giới hạn đổi thì tài liệu phải đổi theo.
- Sửa thêm mục *Bắt đầu phiên làm việc* của `CLAUDE.md` (plan chỉ yêu cầu thêm quy ước màu): nó đang trỏ cứng vào req-3 nên phiên mới sẽ không biết req-4 tồn tại.

**Đã nghiệm thu**

- `pnpm build && lint && typecheck && test && format:check` pass. `user-manual.content.spec.ts` (kiểm cấu trúc + **liên kết giữa các trang, kể cả anchor `#`**) xanh: 2 liên kết mới `page:trinh-soan-de`, `page:giao-dien` và `page:giao-dien#lua-chon-duoc-nho-o-dau` đều trỏ đúng.
- 3 file JSON đã format bằng Prettier; `updatedAt` mới nằm trong `user-manual.content.ts` nên trang tài liệu hiện đúng ngày.

**Chưa nghiệm thu được ở phiên này**

Trang `/user-manual` chỉ System Owner/Admin xem được và render ở client → cần bạn mở `/user-manual` → **Tài khoản → Giao diện** xem trang mới hiển thị đúng (bảng 4 mục, 2 callout), và mở **Đề thi & Bài học → Trình soạn đề** xem callout mới nằm đúng trước mục **Lưu**.

**Kết thúc req-4**

- 5/5 step xong. Step 1–4 đã commit (`22ab2a5`, `67b82ce`, `09eb637`); phần Step 5 (8 file tài liệu + `CLAUDE.md`) đang ở working tree, **chưa commit**.
- Việc còn lại thuộc về bạn: đi hết [req-4-acceptance.md](req-4-acceptance.md) ở giao diện Tối, đặc biệt 6 mục "cần để mắt" ghi ở cuối nhật ký Step 4 (đáng ngờ nhất là màu chữ/nền tự chọn **trong trình soạn đề** – đường đi qua Plate là chỗ duy nhất không chạy thử được bằng script).
- Việc để ngỏ, ngoài phạm vi req-4: gom 6 chỗ `bg-[var(--bg)]` làm ô nhập về `--sidebar` (đổi cả 3 theme); lưu giao diện **theo tài khoản** (cột `users.theme` + `PATCH /me/theme`) – plan mục 8.
- Requirement tiếp theo (req-5) là nhóm P0 vận hành thật của [epic-1](../epic/epic-1.md): domain + HTTPS, email & quên mật khẩu, đăng nhập cho học viên không có email, sao lưu, rate limit, môi trường production tách biệt.
