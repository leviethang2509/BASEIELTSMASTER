# Requirement 3 – Câu hỏi làm rõ (vòng 4)

> Nguồn: [req-3.md](req-3.md), [vòng 1](req-3-question.md), [vòng 2](req-3-question-r2.md), [vòng 3](req-3-question-r3.md).
> Cách trả lời: ghi ngay dưới dòng **Trả lời:** của từng câu. Mỗi câu đã có **Đề xuất**, nếu đồng ý chỉ cần ghi `OK`.
> Vòng này chỉ gồm: (1) ngày nghỉ **dời buổi học** (T4 – phần "Quan trọng"), (2) chuyển máy dev sang **database local** (R1).

---

## Bối cảnh T4

Vòng 3 đề xuất: ngày nghỉ → **huỷ** buổi trùng ngày. Bạn đổi thành: ngày nghỉ → **dời** các buổi về sau, vì nội dung (bài học) được map theo **thứ tự buổi** (Buổi 1, Buổi 2…). Xoá ngày nghỉ thì dời lại theo thời khoá biểu.

Ví dụ lớp học T2 + T4, 10 buổi, bắt đầu T2 05/01:

| Buổi | Không có ngày nghỉ | Nghỉ T4 07/01 |
|---|---|---|
| 1 | T2 05/01 | T2 05/01 |
| 2 | T4 07/01 | **T2 12/01** |
| 3 | T2 12/01 | T4 14/01 |
| … | … | mỗi buổi lùi 1 "ô" lịch |
| 10 | T4 04/02 | **T2 09/02** (ngày kết thúc lớp lùi theo) |

Để làm được như vậy, tôi đề xuất đổi mô hình: buổi học là **"Buổi thứ N"** (giữ nguyên nội dung map, giáo viên, ghi chú), còn **ngày giờ** được **tính lại** từ lịch lặp và bỏ qua ngày nghỉ. Các câu dưới đây chốt chi tiết.

---

## U1. 🔴 Lịch lặp theo **số buổi** thay vì ngày kết thúc

R13.1 đã chốt: dòng lặp có "từ ngày – đến ngày". Khi ngày nghỉ làm dời buổi thì số buổi giữ nguyên, **ngày kết thúc lùi theo**.

**Đề xuất:**
- Thời khoá biểu lớp = **ngày bắt đầu** + **tổng số buổi** (mặc định lấy "số buổi dự kiến" của khoá học, B1) + các **ô lặp trong tuần** (vd. T2 18:00–19:30, T4 18:00–19:30). Bỏ "đến ngày" ở từng dòng lặp.
- Buổi thứ N rơi vào ô lặp thứ N (theo thứ tự thời gian), **bỏ qua ô trùng ngày nghỉ**.
- "Ngày kết thúc" của lớp (D1) **tự tính** = ngày của buổi cuối, hiện chỉ đọc.
- Buổi nằm ở ô nào thì lấy **giờ của ô đó** (vd. T2 18:00, T4 19:00 thì buổi dời từ T4 sang T2 đổi giờ theo T2).

**Trả lời:**

Đồng ý với đề xuất

## U2. 🔴 Thứ gì đi theo buổi, thứ gì đi theo ngày?

Khi dời, "Buổi 5" sang ngày mới. **Đề xuất:**

| Thuộc tính | Đi theo buổi (dời cùng) | Giữ nguyên theo ngày |
|---|---|---|
| Nội dung map (bài học/đề thi, D4, R17) | ✔ | |
| Ghi chú của buổi | ✔ | |
| Phòng/link đã sửa tay | ✔ | |
| **Giáo viên dạy thế** (R14) | | ? |
| Giờ đã sửa tay (vd. buổi 5 dạy 17:00 thay 18:00) | | ? |

Giáo viên dạy thế thường được xếp **vì ngày đó** giáo viên chính bận. Buổi dời đi thì việc dạy thế có còn đúng không?

**Đề xuất:**
- **Giáo viên dạy thế**: dời cùng buổi, nhưng hiện **cảnh báo** "Buổi 5 đã dời từ 07/01 sang 12/01, kiểm tra lại giáo viên dạy thế" và gửi chuông cho giáo viên dạy thế + Owner/Admin.
- **Giờ sửa tay**: bỏ khi dời (buổi lấy giờ của ô mới), có cảnh báo tương tự.

**Trả lời:**

Đồng ý với đề xuất

## U3. 🔴 Buổi nào bị dời?

**Đề xuất:**
1. Chỉ buổi **chưa diễn ra** (thời điểm bắt đầu > hiện tại) mới dời. Buổi đã qua giữ nguyên, kể cả khi ngày nghỉ được thêm cho quá khứ.
2. **Buổi lẻ/dạy bù thêm tay** (R13.3) có ngày cố định, **không** dời và không tính vào dãy "Buổi thứ N". Nếu buổi lẻ trùng ngày nghỉ thì chỉ cảnh báo, không tự huỷ.
3. **Huỷ tay một buổi** (vd. giáo viên ốm) có 2 lựa chọn ngay khi huỷ:
   - "**Huỷ và dời**": xử lý như ngày nghỉ riêng của lớp, các buổi sau lùi 1 ô, số buổi giữ nguyên.
   - "**Huỷ hẳn**": buổi đó mất, nội dung map của nó hiện cảnh báo "chưa có buổi", tổng số buổi giảm 1.
4. Lớp `finished`/`cancelled`: không dời gì.

**Trả lời:**

(1) Đồng ý với đề xuất
(2) (3) Giáo viên huỷ thì thêm buổi lẻ dạy bù thủ công.
(4) Đồng ý với đề xuất

## U4. 🔴 Dời lịch và deadline / ngày mở của mục giáo trình

Mục giáo trình của lớp có **deadline** và **ngày mở** là mốc thời gian tuyệt đối (E5, R9) do giáo viên đặt, còn buổi học thì bị dời. Ví dụ "Bài kiểm tra 1" mở ở Buổi 5, deadline cuối Buổi 6: khi dời lịch, deadline có dời theo không?

- **(a)** Không dời tự động: deadline/ngày mở độc lập với buổi. Khi lịch dời, trang lớp cảnh báo giáo viên "N mục có deadline trước buổi được map" để giáo viên tự sửa.
- **(b)** Cho mục đặt ngày mở/deadline **theo buổi** (vd. "mở lúc bắt đầu Buổi 5", "hạn: hết Buổi 6 + 2 ngày"), dời lịch thì tự tính lại. Vẫn cho đặt ngày cụ thể như cũ.

**Đề xuất:** (a) cho req-3 (đơn giản, giáo viên chủ động), (b) để sau. Hay bạn muốn (b) luôn?
**Trả lời:**

Đồng ý với đề xuất (a)

## U5. Xoá / sửa ngày nghỉ

**Đề xuất:**
1. Xoá hoặc thu hẹp ngày nghỉ → **tính lại toàn bộ** ngày của các buổi tương lai theo lịch lặp (buổi được kéo về sớm hơn). Kết quả luôn giống như thể ngày nghỉ chưa từng có (với phần tương lai).
2. Sửa **lịch lặp** (đổi thứ/giờ, số buổi, ngày bắt đầu) cũng tính lại theo cùng quy tắc; thay cho R13.2 ("sinh lại buổi chưa sửa tay").
3. Trước khi lưu thay đổi ngày nghỉ, hộp xác nhận liệt kê **các lớp bị ảnh hưởng** và số buổi bị dời. Sau khi lưu gửi **1 thông báo gộp** cho mỗi học viên/giáo viên của lớp ("Lịch lớp X thay đổi: 8 buổi dời, kết thúc mới 09/02").
4. Ngày nghỉ **vẫn hiện** trên lịch (tên + màu xám), không tạo buổi `cancelled` như T4.2 vòng 3 (vì buổi đã dời đi chứ không mất).

**Trả lời:**

Đồng ý với đề xuất

## U6. Lớp có được bỏ qua ngày nghỉ của trung tâm không?

Ví dụ lớp online vẫn học ngày lễ, hoặc lớp cấp tốc.

**Đề xuất:** Mỗi lớp có tuỳ chọn "**Áp dụng ngày nghỉ của trung tâm**" (mặc định bật). Tắt thì lịch lớp không bị ngày nghỉ ảnh hưởng. Không có ngày nghỉ riêng từng lớp (ngoài "Huỷ và dời" ở U3.3).
**Trả lời:**

Đồng ý với đề xuất

---

## U7. 🔴 Database local cho máy dev (R1)

Bạn sẽ chuyển máy dev sang Postgres **local** để không ảnh hưởng DB test trên VPS. Lưu ý trên Postgres local đã có database `lang_simulator` **của dự án khác** (CLAUDE.md ghi "không đụng").

1. Tên database local: đề xuất **`lang_simulator_dev`**, user riêng `lang_simulator_dev` (có quyền `CREATE` trên schema `public`). Bạn tạo database/user, tôi chạy migration + seed System Owner, danh mục mẫu, gói dịch vụ. Hay bạn muốn tên khác?
2. Sau khi chuyển, quy tắc CLAUDE.md "migration phải tương thích ngược với code đang chạy trên :3001" **nới lại**: DB trên VPS chỉ thay đổi khi deploy (container chạy migration rồi mới chạy code mới), nên migration đổi tên/xoá cột được làm trong 1 bước (như R1 phương án (b)). Đồng ý? Tôi sẽ cập nhật CLAUDE.md + plan req-1 mục Database.
3. `.env` của `apps/lang-api` trên máy dev trỏ sang DB local. Bạn tự sửa (có mật khẩu) hay để tôi sửa sau khi bạn cho thông tin kết nối?
4. R2 (media) vẫn dùng chung 2 bucket với :3001? File upload lúc dev sẽ nằm chung bucket với DB VPS nhưng DB local không biết tới. Đề xuất: giữ chung bucket (đơn giản), key có `tenantId` khác nhau nên không đè nhau.

**Trả lời:**

Đồng ý với đề xuất

---

## V. Câu hỏi thêm sau khi đọc trả lời vòng 4

### V1. 🔴 Huỷ một buổi học (U3.2–3)
Bạn trả lời: giáo viên huỷ buổi thì **thêm buổi lẻ dạy bù thủ công** (bỏ "Huỷ và dời"). Đề xuất chi tiết:

1. Buổi bị huỷ **giữ số thứ tự** (vd. "Buổi 5 – Đã huỷ"), trạng thái `cancelled`, ghi lý do. Các buổi sau **không** dời, số buổi của lớp không đổi. Huỷ nhầm thì khôi phục được nếu buổi chưa diễn ra.
2. Nội dung map của buổi bị huỷ **giữ nguyên** và hiện cảnh báo "Buổi đã huỷ – chuyển nội dung sang buổi khác". Giáo viên tự map lại sang buổi bù hoặc buổi khác (R17).
3. **Buổi bù** là buổi lẻ (ngày cố định, không dời theo ngày nghỉ, U3.2), **map nội dung được** như buổi thường, có thể ghi "Bù cho Buổi 5". Buổi bù hiện là "Buổi bù" trong dãy buổi, không đánh số.
4. Học viên, giáo viên (và phụ huynh) nhận chuông khi buổi bị huỷ, khôi phục hoặc có buổi bù.
5. **Ai được huỷ buổi / thêm buổi bù?** R13.6 đã chốt chỉ Owner/Admin sửa thời khoá biểu, nhưng bạn viết "giáo viên huỷ thì thêm buổi lẻ". Đề xuất: **giáo viên của lớp** cũng được huỷ/khôi phục buổi và thêm/sửa/xoá buổi bù của lớp mình. Lịch lặp, số buổi, ngày bắt đầu vẫn chỉ Owner/Admin sửa.

**Trả lời:**

Đồng ý với đề xuất

### V2. Chuẩn bị database local (U7)
Để chuyển máy dev sang DB local, đề xuất chia việc như sau:

1. **Bạn**: tạo database `lang_simulator_dev` + user `lang_simulator_dev` trên Postgres local (quyền `CREATE` trên schema `public`), rồi sửa `apps/lang-api/.env` (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME=lang_simulator_dev`). Tôi không đọc/ghi mật khẩu.
2. **Tôi**: chạy `migration:run`, `seed:owner` (bạn nhập email/mật khẩu System Owner khi chạy, hoặc chạy lệnh này giúp tôi), kiểm `migration:generate` báo "No changes", rồi cập nhật CLAUDE.md (bỏ "dùng chung DB với :3001", nới quy tắc tương thích ngược theo U7.2) và mục Database ở plan req-1.
3. Việc này làm ở **Step 0** của req-3, trước step đổi tên danh mục (R1).

**Trả lời:**

Hướng dẫn tôi tạo database local bằng pgAdmin, tôi quên pass user rồi.

**Kết quả (2026-09-19):** Postgres local xác thực `trust` nên không cần mật khẩu cũ. Database `lang_simulator_dev` đã có sẵn (sót lại từ đầu req-1: chỉ schema `lang_simulator` với bảng `typeorm_migrations` trống). Đã tạo user `lang_simulator_dev` (mật khẩu ngẫu nhiên, ghi thẳng vào `apps/lang-api/.env`), đặt user này làm owner database, cấu hình VPS để comment `# VPS:` trong `.env`. Đã chạy đủ 9 migration trên schema `public`, `migration:generate` báo "No changes". Đã cập nhật CLAUDE.md + req-1-plan. Còn lại: người dùng tự chạy `seed:owner` (cần `SEED_OWNER_PASSWORD`).
