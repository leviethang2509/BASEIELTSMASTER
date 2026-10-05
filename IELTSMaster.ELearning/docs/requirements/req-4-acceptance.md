# Requirement 4 – Checklist nghiệm thu giao diện (3 theme)

> Dùng sau mỗi lần deploy, cùng với [req-3-acceptance.md](req-3-acceptance.md) (chức năng).
> Ở đây **không kiểm nghiệp vụ**, chỉ kiểm màu: chữ có đọc được, viền có thấy, có mảng sáng/tối nào lọt ra không.
>
> Cột **Theme**: `T` = giao diện **Tối** (phần lớn việc), `3` = phải xem ở **cả 3** giao diện (Sáng · Giấy · Tối).
> Cột **Bấm** = đánh dấu khi đã xem bằng mắt. Không có script nào thay được cột này.
>
> Cách đổi: nút **Giao diện** góc trên bên phải (cạnh chuông Thông báo) → **Sáng · Giấy · Tối · Theo hệ thống**.
> Môi trường: máy dev `http://127.0.0.1:3100` hoặc VPS `http://…:3001`. Tài khoản thử: bảng ở đầu [req-3-acceptance.md](req-3-acceptance.md).

**Ba dấu hiệu hỏng cần để ý ở mọi trang (giao diện Tối):** mảng **trắng** lọt ra giữa nền tối · chữ **chìm** vào nền (xám trên xám, màu đậm trên nền tối) · **mất viền/mất mép khối** khiến hai mặt phẳng dính vào nhau.

---

## 0. Cơ chế đổi giao diện (mọi vai trò)

| # | Việc | Kết quả mong đợi | Theme | Bấm |
|---|---|---|---|---|
| 0.1 | Nút **Giao diện** ở header khu vực chính (`/`), dashboard (`/admin`, `/t/{slug}/dashboard`), `/user-manual` | Có ở cả 3 nơi, kể cả khi **chưa đăng nhập**; menu 4 mục, mục đang dùng có dấu tích | 3 | ☐ |
| 0.2 | Đang thi: màn hình **giới thiệu section** | Có nút Giao diện; bấm **Bắt đầu** vào làm bài thì **không còn** nút (đồng hồ đang chạy) | T | ☐ |
| 0.3 | Chọn **Tối** rồi F5 | Vẫn Tối, và **không loé sáng** một nhịp trước khi tối | T | ☐ |
| 0.4 | Chọn **Theo hệ thống**, đổi chế độ sáng/tối của máy | Trang đổi theo ngay, không cần F5; máy ở chế độ sáng ra **Sáng** (trắng), không ra Giấy | 3 | ☐ |
| 0.5 | Mở bằng cửa sổ ẩn danh / xoá cookie site | Về **Sáng** (mặc định), không lỗi trang | 3 | ☐ |
| 0.6 | Mở trên máy/trình duyệt khác cùng tài khoản | Vẫn là **Sáng** – lựa chọn nhớ theo trình duyệt, **không** theo tài khoản (đúng thiết kế, xem `/user-manual` → Tài khoản → Giao diện) | 3 | ☐ |

## 1. Khách & tài khoản (khu vực chính)

| # | Việc | Kết quả mong đợi | Theme | Bấm |
|---|---|---|---|---|
| 1.1 | Trang chủ `/` | Header dính (mờ nền) không thành dải sáng; 6 ô minh hoạ phần thi và thẻ tính năng đều thấy nền và biểu tượng | T | ☐ |
| 1.2 | Chân trang | Tối hơn nền trang một bậc **và có đường kẻ trên** – phải thấy được chỗ kết trang | T | ☐ |
| 1.3 | `/login`, `/register` | Tab **Đăng nhập/Đăng ký** đang chọn nổi lên khỏi nền; ô nhập, nút hiện mật khẩu, hộp báo lỗi đọc được | T | ☐ |
| 1.4 | Nút chính (magenta) ở mọi trang | Nền magenta đậm `#d33682` + chữ trắng ở **cả 3** giao diện; rê chuột đậm hơn chứ không nhạt đi | 3 | ☐ |
| 1.5 | `/me`, `/me/account`, `/me/notifications` | Thẻ trung tâm, badge trạng thái, chuông thông báo, dấu chưa đọc đều rõ | T | ☐ |
| 1.6 | Trang 404 và trang báo lỗi | Đọc được (trang lỗi nặng nhất tự dựng `<html>` riêng nên **luôn ra giao diện Sáng** – đúng thiết kế, không phải lỗi) | T | ☐ |

## 2. System Owner / System Admin

| # | Việc | Kết quả mong đợi | Theme | Bấm |
|---|---|---|---|---|
| 2.1 | `/admin` – sidebar, switcher không gian, bảng danh sách | Hàng chẵn/lẻ, dòng rê chuột, phân trang, ô tìm kiếm, bộ lọc đều thấy mép | T | ☐ |
| 2.2 | `/admin/users` → **Reset mật khẩu** | Hộp **Mật khẩu tạm** và nút chép đọc được; hộp thoại nổi rõ trên nền mờ | T | ☐ |
| 2.3 | `/user-manual` | Sidebar, mục lục, ô tìm kiếm, bộ lọc vai trò; **khối mã** phải thấy mép (viền), callout 3 tông (info/mẹo/cảnh báo) phân biệt được | T | ☐ |
| 2.4 | `/user-manual` trên màn hình hẹp | Ngăn kéo sidebar nổi trên nội dung, không lẫn vào nền | T | ☐ |
| 2.5 | `/user-manual` → **Tài khoản → Giao diện** | Có trang này, mô tả đúng 4 mục của menu | 3 | ☐ |

## 3. Chủ sở hữu / Quản trị viên trung tâm

| # | Việc | Kết quả mong đợi | Theme | Bấm |
|---|---|---|---|---|
| 3.1 | Dashboard trung tâm: thẻ số liệu, biểu tượng danh mục, badge trạng thái | Chữ trên nền màu trạng thái đọc được, không có ô nào thành mảng sáng | T | ☐ |
| 3.2 | Logo trung tâm **nền trong suốt** (avatar, `LogoPicker`) | Có nền sáng lót để logo mực đậm không mất hút; nhìn không bị "tem trắng" khó coi | T | ☐ |
| 3.3 | **Lớp học** → tab Giáo trình / Thời khoá biểu: ô **ngày**, **giờ**, ô số, checkbox, radio, `<select>` | Bảng chọn ngày và danh sách `<option>` do trình duyệt vẽ phải **tối theo**, không bung ra mảng trắng | T | ☐ |
| 3.4 | **Lịch** (Lịch dạy của tôi / Lịch trung tâm) – Tuần · Tháng · Danh sách | Ô buổi học: nền pha loãng theo màu lớp, có vạch màu bên trái; **rê chuột thì đậm lên** (không phải tối đi); ngày nghỉ, buổi huỷ, viền đỏ trùng lịch đều phân biệt được | T | ☐ |
| 3.5 | Vẫn màn hình Lịch, đổi sang **Sáng** và **Giấy** | Màu 8 lớp vẫn phân biệt được. *Lưu ý: ở **Sáng** có 3 sắc (tím · cam · mòng) đậm hơn trước một chút – cố ý; **Giấy** giữ đúng 8 mã cũ* | 3 | ☐ |
| 3.6 | Trang **chi tiết buổi học** (huỷ, buổi bù, map nội dung) | Badge trạng thái buổi, nút thao tác, hộp xác nhận đọc được | T | ☐ |
| 3.7 | **Thư viện media** + `MediaDialog` (tải lên hoặc dán URL) | Vùng kéo thả, ảnh xem trước, thanh tiến độ, nút chép URL rõ ràng | T | ☐ |
| 3.8 | **Cài đặt** → ngày nghỉ: hộp **lớp bị ảnh hưởng**, `ConfirmDialog`, `PromptDialog` | Panel hộp thoại **nổi rõ** trên nền mờ (không "phẳng" lẫn vào nền trang) | T | ☐ |
| 3.9 | Tab **Tiến độ & Chuyên cần** | 4 loại ô (Đúng hạn · Chưa tới hạn · Chưa nộp · Không tính) phân biệt được bằng màu, chữ trong ô đọc được | T | ☐ |

## 4. Giáo viên – soạn thảo, xem trước, chấm bài

> Đây là phần đáng ngờ nhất: nội dung đề mang **màu do người soạn chọn** và **bảng màu cố định** của hệ thống, ở giao diện Tối được làm sáng lên bằng công thức chung.

| # | Việc | Kết quả mong đợi | Theme | Bấm |
|---|---|---|---|---|
| 4.1 | Trình soạn đề: gõ chữ, chọn **màu chữ** và **màu nền** đậm (ví dụ đen, xanh đậm) | Chữ **hiện ra nhạt hơn mã màu đã chọn** nhưng đọc rõ trên nền tối. ⚠️ Nếu chữ ra **đúng màu đen như đã chọn** (tức chìm vào nền) là **lỗi** – báo lại | T | ☐ |
| 4.2 | Vẫn nội dung đó, đổi sang **Sáng** / **Giấy** | Hiện **đúng mã màu gốc** – dữ liệu không bị đổi | 3 | ☐ |
| 4.3 | **Bút dạ quang** (đánh dấu) trong trình soạn đề | Nền vàng + chữ đen, giống hệt lúc xem trước; không phải màu mặc định của trình duyệt | T | ☐ |
| 4.4 | **Chèn indicator** (Part/Subpart/Question/Explanation) | Chip indicator: chữ, viền, chấm màu đều rõ; chip **thiếu dạng câu hỏi** ra viền đứt màu đỏ | T | ☐ |
| 4.5 | **Callout** (Lưu ý/Ví dụ/Mẹo), **khối gập/mở**, **furigana** | Vạch màu bên trái và nhãn của callout thấy được; furigana (chữ đọc nhỏ phía trên) không chìm | T | ☐ |
| 4.6 | **Ô trống (blank)** và **cặp ghép** | Ô trống thấy mép; danh sách option, ô chọn đáp án đọc được | T | ☐ |
| 4.7 | Gõ `/` (**SlashMenu**), **Mini map**, thanh công cụ (menu màu, menu cỡ chữ), bảng **Kiểm tra · n lỗi** | Popover nổi trên nền, không lõm xuống; các **chấm màu** trong menu phân biệt được | T | ☐ |
| 4.8 | Chèn **ảnh có nền trong suốt** vào đề | Có nền sáng lót (không mất hình); xem có chấp nhận được không | T | ☐ |
| 4.9 | **Xem trước** đề và bài học | Panel xem trước nổi trên nền; 2 nút **Đề thi/Bài học** – nút đang chọn phân biệt được với nút kia | T | ☐ |
| 4.10 | **Chấm bài** (`/t/{slug}/dashboard/grading` + trang chấm một bài) | 2 nút **Bài thi/Bài học** (nút đang chọn nổi), ô nhập điểm, ô nhận xét, nội dung đề chỉ đọc, phần **giải thích**, trình phát ghi âm | T | ☐ |
| 4.11 | Trang **bài làm của học viên** trong lớp | Đáp án đúng/sai (xanh/đỏ), câu bỏ trống, điểm chấm tay đều rõ | T | ☐ |

## 5. Học viên

| # | Việc | Kết quả mong đợi | Theme | Bấm |
|---|---|---|---|---|
| 5.1 | Học một **bài học** (`/t/{slug}/lesson-attempts/{id}`) | Tab section, nội dung, ô trả lời, nút Nộp; sau khi nộp: đáp án đúng/sai và **giải thích** đọc được | T | ☐ |
| 5.2 | Vào **thi** – màn hình giới thiệu section rồi bấm Bắt đầu | **Đồng hồ** rõ, đổi màu cảnh báo khi sắp hết giờ vẫn đọc được | T | ☐ |
| 5.3 | Bảng **số câu** bên cạnh | Câu đã làm / chưa làm / **đã gắn cờ** / đang xem: 4 trạng thái phân biệt được bằng màu | T | ☐ |
| 5.4 | Câu **Speaking** – ghi âm | Nút ghi/dừng, vạch thời gian, báo lỗi quyền micro đọc được (ghi âm cần HTTPS hoặc localhost) | T | ☐ |
| 5.5 | Nộp bài → trang **kết quả**, **lịch sử làm bài** | Điểm, tỉ lệ, Đậu/Trượt, bảng lịch sử rõ | T | ☐ |
| 5.6 | **Lớp của tôi**, **Lịch học của tôi** | Mục chưa tới ngày mở / quá hạn, ô buổi học trên lịch đều rõ | T | ☐ |

## 6. Phụ huynh

| # | Việc | Kết quả mong đợi | Theme | Bấm |
|---|---|---|---|---|
| 6.1 | **Con của tôi** → trang con → trang lớp của con | Thẻ con, bảng lượt làm, điểm và nhận xét câu chấm tay, lịch học của con | T | ☐ |

## 7. Hai giao diện sáng **không được đổi**

| # | Việc | Kết quả mong đợi | Theme | Bấm |
|---|---|---|---|---|
| 7.1 | Đổi sang **Giấy** rồi đi lại vài trang quen thuộc | Giống **hệt** hệ thống trước khi có req-4 (đã đối chiếu từng biến màu: 0 giá trị thay đổi qua cả 4 step) | 3 | ☐ |
| 7.2 | Đổi sang **Sáng** | Nền trắng, chữ và viền đủ đậm; khác biệt cố ý duy nhất so với Giấy ngoài tông nền: 3 sắc màu lớp trong Lịch (mục 3.5) | 3 | ☐ |

---

## Nếu phải sửa màu sau khi nghiệm thu

- Sửa **giá trị token** trong `apps/lang-app/src/app/globals.css`, **không** viết `rgba()`/hex vào component (ESLint chặn). Đổi token nào thì kiểm lại cả `light` và `solarized-light` **không bị kéo theo**.
- Màu đến từ dữ liệu hoặc bảng màu cố định đi qua `.ls-tint*` / `.ls-leaf-*` / `.ls-event` – xem mục 4.3 của [req-4-plan.md](req-4-plan.md).
- Muốn màu nội dung tự chọn **đậm hơn** ở giao diện Tối: đổi `35%` thành `45%` ở 2 chỗ trong `globals.css` (`--tint` và `.ls-leaf-fg`); đổi lại thì màu gần đen tụt xuống 4.03 (ngưỡng đọc được là 4.5).
- Ba chỗ do bạn chốt ở Step 4, sửa được bằng 1 dòng nếu nhìn thật thấy chưa ổn: độ nổi của panel hộp thoại (`--panel` khối `dark`), độ sáng của tông hồng/đỏ/cam (`--accent`/`--danger`/`--orange`), độ đậm của màu nội dung tự chọn (mục trên).
