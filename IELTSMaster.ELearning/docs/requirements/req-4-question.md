# Requirement 4 – Câu hỏi làm rõ

> Nguồn: [req-4.md](req-4.md).
> Cách trả lời: ghi ngay dưới dòng **Trả lời:** của từng câu. Mỗi câu đã có **Đề xuất**, nếu đồng ý chỉ cần ghi `OK`.
> Câu đánh dấu 🔴 là câu **chặn** (ảnh hưởng tới kiến trúc/phạm vi), cần trả lời trước khi lập plan.

---

## 0. Hiện trạng (kết quả quét source, để hiểu bối cảnh)

Điều quan trọng nhất: **codebase đã gần như sẵn sàng cho đa theme.**

- `apps/lang-app/src/app/globals.css` khai báo **13 CSS variable** ở `:root` (`--bg`, `--sidebar`, `--card`, `--border`, `--border-strong`, `--fg`, `--heading`, `--body`, `--muted`, `--muted-2`, `--accent`, `--accent-soft`, `--danger`, `--hover`, `--scroll-thumb…`). Toàn bộ UI dùng qua `bg-[var(--…)]`: **1.673 lượt dùng** trong 253 file. Thêm một khối `:root[data-theme='dark']` là đổi được gần hết giao diện.
- **Chỉ 30 lượt** dùng class màu Tailwind cố định (19 file), và đa số là `text-white` đặt trên nền `var(--accent)`/`var(--danger)` – vẫn đúng ở cả hai theme. Thực chất cần sửa: `bg-black/5` (`TagMultiSelect`), 4 dòng màu ô số câu trong `SimulatorState.tsx`.
- **~70 lượt `rgba(...)` viết thẳng** rải trong 33 file (ví dụ `rgba(0,43,54,.08)`, `rgba(133,153,0,.13)`, `rgba(253,246,227,.92)`). Đây là **phần việc chính**: các lớp phủ mờ tính theo nền sáng, sang nền tối sẽ mất hút hoặc lộ vệt sáng.
- **~46 hex cố định** trong 7 file; phần lớn là màu nhấn Solarized (`#268bd2`, `#859900`, `#b58900`, `#dc322f`, `#d33682`) – bản thân Solarized thiết kế để dùng chung cho cả light và dark nên giữ được, trừ vài chỗ đã "nướng" sẵn cho nền sáng: `Badge` (`text-[#5f6d00]`, `bg-[#fdf1ef]`), `.exam-blank` (`rgba(15,23,42,.07)`), caret `<select>` trong `globals.css` (`stroke='%236b7280'`).
- **Không có** bất kỳ dòng code theme/dark-mode nào; `tailwind.config.ts` không bật `darkMode`.
- **Dự án tham chiếu LC không có dark mode** (`design/*.html` và `globals.css` của LC chỉ có Solarized Light). Lần này **không copy được từ LC**, phải tự dựng bảng màu dark.
- Chỗ đặt nút đổi theme (góc phải header) hiện có: header `(site)` (qua `SiteHeaderNav`, cạnh `NotificationBell`), header `DashboardShell`, header `UserManualShell`. `/me/*` nằm trong `(site)` nên dùng chung header. **`(exam)/layout.tsx` không có header nào** (toàn màn hình khi thi).
- `SiteFooter` **cố tình nền tối** (`bg-[#002b36]`, `Brand inverted`) – ở dark mode sẽ lẫn vào nền trang.
- Nội dung đề/bài do người dùng soạn **không lưu màu** (Plate không có plugin font-color) → nội dung tự ăn theo theme. Nhưng **ảnh/scan đề thi tải lên** vẫn là ảnh nền trắng, ở dark mode sẽ chói.

---

## A. Bảng màu & số lượng theme

### A1. 🔴 Theme "light" mới thay thế Solarized Light hiện tại, hay thêm vào thành 3 lựa chọn?
req-4 nói *"default là light mode (màu chủ đạo là trắng)"*. Theme đang chạy là **Solarized Light – tông giấy kem ấm** (`--bg: #fdf6e3`), không phải trắng. Vậy:

- **(a) 2 theme:** `light` (trắng, mới – thay hẳn tông kem) + `dark` (Solarized Dark). Tông kem biến mất.
- **(b) 3 theme:** `light` (trắng, mặc định) + `solarized-light` (tông kem hiện tại, giữ cho ai đang quen) + `dark`. Nút đổi theme thành dropdown 3 mục; mọi biến màu phải kiểm 3 lần.
- **(c) 2 theme nhưng light = kem hiện tại làm nhạt đi** (giữ vệt ấm rất nhẹ, không trắng tinh) – ít lệch so với bộ design LC nhất.

**Đề xuất:** (a). Feedback nêu trong req-4 chia làm 2 nhóm (trắng / tối), tông kem không làm hài lòng nhóm nào; giữ 3 theme làm chi phí kiểm thử tăng 50% mà không có người dùng nào đòi.
**Trả lời:** **(b) 3 theme** – `light` (trắng, mặc định) + `solarized-light` (tông kem hiện tại) + `dark`. Giữ tông kem cho người đang quen.

### A2. Light mode "trắng" đi tới mức nào?
Trắng tinh `#ffffff` cho cả nền trang lẫn panel sẽ làm mất ranh giới giữa nền – sidebar – card (hiện phân biệt bằng 3 sắc kem).

**Đề xuất:** `--bg: #ffffff` (nền trang), `--card: #ffffff`, `--sidebar: #f6f7f8` (xám rất nhạt cho sidebar/ô input), viền đậm hơn hiện tại một chút để bù phần tương phản bị mất. Giữ **nguyên** màu nhấn magenta `#d33682` và bộ màu Solarized cho trạng thái (xanh/vàng/đỏ/lục) ở cả hai theme → nhận diện sản phẩm không đổi.
**Trả lời:** Theo Đề xuất.

### A3. Màu nhấn ở dark mode
Magenta `#d33682` trên nền Solarized Dark `#002b36` vẫn đọc được nhưng hơi tối với chữ nhỏ.

**Đề xuất:** dark dùng `--accent: #e14b92` (magenta sáng hơn ~10%), `--accent-soft` alpha cao hơn. Các màu trạng thái dùng bản sáng của Solarized (`#268bd2`→`#4aa3dd` khi làm chữ trên nền tối), còn khi dùng làm **nền** (ô số câu đã trả lời/đúng/sai) thì giữ nguyên vì chữ trên đó là trắng.
**Trả lời:** Theo Đề xuất.

---

## B. Lưu lựa chọn & tránh nháy màu

### B1. 🔴 Lưu lựa chọn theme ở đâu?
- **(a) `localStorage` + cookie:** cookie để server render đúng `data-theme` ngay từ HTML đầu tiên (không nháy sáng→tối), `localStorage` làm bản sao. Không đụng API, không migration. Theo **thiết bị**.
- **(b) Lưu vào tài khoản (DB):** thêm cột `users.theme`, route `PATCH /me/theme`. Theo **tài khoản**, sang máy khác vẫn giữ. Cần migration + env-free API + cập nhật `toAuthUser`; khách chưa đăng nhập vẫn phải dùng cookie → thành ra làm **cả hai**.
- **(c) Chỉ `localStorage`:** đơn giản nhất nhưng **nháy màu** mỗi lần tải trang (HTML server render theme sáng rồi JS đổi sang tối) – rất lộ ở dark mode.

**Đề xuất:** (a). Cookie `ls_theme` (không httpOnly, `SameSite=Lax`, 1 năm) đọc trong `app/layout.tsx` bằng `cookies()` để đặt `data-theme` trên `<html>`; client ghi cookie + `localStorage`. Nếu sau này cần theo tài khoản thì (b) cộng thêm mà không phải làm lại.
**Trả lời:** **(a)** Cookie + `localStorage`. Không đụng API/DB.

### B2. Có lựa chọn "Theo hệ thống" (theo cài đặt OS) không?
req-4 nói mặc định là light. Nếu có "Theo hệ thống" thì máy đang dark sẽ vào thẳng dark.

**Đề xuất:** có 3 mục trong nút đổi theme: **Sáng · Tối · Theo hệ thống**, nhưng **mặc định khi chưa chọn gì = Sáng** (đúng yêu cầu req-4), "Theo hệ thống" chỉ có hiệu lực khi người dùng tự chọn. Chi phí thêm rất nhỏ (một `matchMedia` listener).
**Trả lời:** **Có**, mặc định khi chưa chọn gì vẫn là **Sáng**. Cộng với A1 thì menu có 4 mục: Sáng · Giấy · Tối · Theo hệ thống.

---

## C. Nút đổi theme

### C1. Hình thức nút
- **(a) Nút 1 lần bấm** đổi qua lại sáng/tối (icon mặt trời/mặt trăng). Gọn nhất, nhưng không diễn tả được "Theo hệ thống".
- **(b) Nút mở menu nhỏ** 2–3 mục có dấu tích – cùng kiểu với `NotificationBell` đang có.

**Đề xuất:** (b) nếu chốt B2 có "Theo hệ thống"; (a) nếu B2 bỏ. Component `ThemeToggle` đặt ở `components/theme/`, chuỗi ở `vi.theme`.
**Trả lời:** Theo Đề xuất.

### C2. 🔴 Trang thi toàn màn hình `(exam)` có nút đổi theme không?
`(exam)/layout.tsx` không có header – cố ý, để học viên không bị phân tán khi thi. Đặt nút ở đây nghĩa là thêm một nút nổi (floating) vào màn hình thi.

- **(a) Không đặt:** học viên chọn theme trước khi vào thi, vào rồi thì theme vẫn đúng (chỉ là không đổi được giữa lúc thi).
- **(b) Đặt nút nổi ở góc trên phải** màn hình thi.
- **(c) Đặt trong màn hình giới thiệu section** (`SectionIntroScreen` – trước khi bấm bắt đầu, chưa tính giờ) nhưng không có trong lúc đang làm bài.

**Đề xuất:** (c). Đúng tinh thần "mọi trang đều đổi được" mà không thêm thứ gây nhiễu vào lúc đang đếm giờ. Màn hình học bài `(site)/t/{slug}/lesson-attempts/{id}` nằm trong `(site)` nên đã có header, không phải làm gì.
**Trả lời:** **(c)** Chỉ ở `SectionIntroScreen`, không có nút khi đang đếm giờ.

---

## D. Vài chỗ phải quyết riêng

### D1. `SiteFooter` đang cố tình nền tối
Ở light mode nó là dải tối kết trang (theo design LC). Ở dark mode nó gần như trùng nền.

**Đề xuất:** ở dark mode cho footer dùng nền **tối hơn nền trang một bậc** (`#00212b` so với `--bg: #002b36`) + viền trên, giữ được cảm giác "kết trang". Light mode giữ nguyên `#002b36` như hiện tại.
**Trả lời:** Theo Đề xuất.

### D2. Ảnh/scan đề thi tải lên có nền trắng
Ở dark mode, ảnh chụp đề giấy sẽ là mảng trắng chói giữa trang tối. Có thể giảm sáng ảnh bằng CSS (`filter: brightness(.85)`) nhưng làm sai màu ảnh gốc – với đề thi ngoại ngữ (ảnh bài đọc, biểu đồ) thì sai màu là rủi ro.

**Đề xuất:** **không** lọc ảnh. Giữ ảnh đúng màu gốc, chỉ bọc nền trắng + viền nhẹ cho ảnh trong suốt để không bị "lem" vào nền tối.
**Trả lời:** Theo Đề xuất.

### D3. Trình soạn đề (Plate) ở dark mode
Giáo viên soạn trong dark mode; học viên có thể đọc ở light mode. Nội dung không lưu màu nên hiển thị luôn đúng theo theme người đọc. Riêng editor có style riêng trong `globals.css` (`.exam-editor`, `.exam-blank`, `.exam-pair`, `.exam-preview-input`) và link `#268bd2` cố định.

**Đề xuất:** chuyển các giá trị cố định đó sang biến (`--blank-bg`, `--link`), không đổi hành vi editor.
**Trả lời:** Theo Đề xuất.

### D4. Phạm vi: có sửa `/user-manual` không?
CLAUDE.md yêu cầu thêm/đổi tính năng phải cập nhật tài liệu JSON tương ứng.

**Đề xuất:** thêm một mục ngắn về đổi theme vào `03-tai-khoan.json` (phần giao diện/tài khoản cá nhân) + đổi `updatedAt`. Không phải viết trang mới. **Bản thân trang `/user-manual` cũng phải chạy được ở dark mode** (nó có shell riêng).
**Trả lời:** Theo Đề xuất.

### D5. req-4 chốt lại là làm theme, không phải nhóm P0 của epic-1?
[epic-1.md](../epic/epic-1.md) đề xuất req-4 = "sẵn sàng vận hành thật" (domain + HTTPS, email/quên mật khẩu, backup, rate limit…). req-4.md hiện tại là việc khác (theme). Hai việc không xung đột, chỉ là thứ tự.

**Đề xuất:** làm theme như req-4.md; nhóm P0 của epic-1 dời sang req-5. Ghi rõ điều này vào epic-1 để không mất dấu (mục 1 *domain + HTTPS* vẫn đang làm Speaking hỏng ngoài đời).
**Trả lời:** Theo Đề xuất.

### D6. Tiêu đề file req-4.md ghi "# Requirement 1"
Nhầm khi copy file. Sẽ sửa thành `# Requirement 4` khi lập plan.
**Trả lời:** Sửa thành `# Requirement 4`.
