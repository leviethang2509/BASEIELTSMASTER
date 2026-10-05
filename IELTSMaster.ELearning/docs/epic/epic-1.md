# Epic 1 – Đề xuất tính năng cho các giai đoạn sau

> **Trạng thái: đề xuất, chưa chốt.** Tài liệu này tổng hợp những gì **chưa có** hoặc **còn yếu** sau req-1, req-2, req-3, để làm đầu vào cho các requirement tiếp theo. Khi một mục được chọn làm, mở `req-N.md` + `req-N-question.md` như quy trình thường lệ rồi xoá/đánh dấu mục đó ở đây.

**Nguồn tổng hợp** (2026-09-22, ngay sau Step 14 của req-3):

- [req-1.md](../requirements/req-1.md), [req-2.md](../requirements/req-2.md), [req-3.md](../requirements/req-3.md) – yêu cầu gốc.
- Mục 8 "Ngoài phạm vi" của [req-1-plan.md](../requirements/req-1-plan.md) và [req-3-plan.md](../requirements/req-3-plan.md); giả định kỹ thuật mục 2 của cả hai.
- Trang **Ngoài phạm vi hiện tại**, **Giới hạn hệ thống**, **Sự cố thường gặp** trong `/user-manual` (`apps/lang-api/src/user-manual/content/09-van-hanh.json`).
- Nhật ký Step 13–14 trong [req-3-progress.md](../requirements/req-3-progress.md).
- Kiểm tra trực tiếp source cho các mục 4, 5, 21, 24 (không nằm trong danh sách đã ghi nhận trước đó).

---

## 1. P0 – Chặn vận hành thật

Phải xong trước khi mở cho khách hàng trả tiền.

> **Dời phase (2026-09-25):** req-4 đã được dùng cho việc khác – giao diện 3 theme (Sáng/Giấy/Tối), yêu cầu đến từ feedback người dùng, xem [req-4.md](../requirements/req-4.md). Nhóm P0 này **dời sang req-5**, thứ tự ưu tiên giữ nguyên.

| # | Việc | Vì sao gấp |
|---|---|---|
| 1 | **Domain + HTTPS** | Ghi âm Speaking **không chạy trên HTTP**. Tài liệu đang phải hướng dẫn bật cờ `chrome://flags/#unsafely-treat-insecure-origin-as-secure` – không dùng được với học viên thật. Kéo theo `COOKIE_SECURE=true`. Đây là tính năng lõi đang hỏng ngoài đời. |
| 2 | **Dịch vụ email + quên mật khẩu tự phục vụ** | Hiện System Owner/Admin reset mật khẩu bằng tay cho từng người. Không có xác thực email nên không chặn được email giả. Làm xong mở đường luôn cho thông báo qua email (mục 13). |
| 3 | **Đăng nhập cho học viên không có email** | Account bắt buộc email duy nhất, trong khi trung tâm ngoại ngữ đầy học viên nhỏ tuổi. Phương án: username do trung tâm cấp, hoặc email phụ huynh + mã học viên. |
| 4 | **Sao lưu & phục hồi** | **Không có** đề cập nào tới backup trong `docs/`, `deploy/`, `.github/`. Cần cron `pg_dump` giữ N bản + diễn tập phục hồi + vòng đời bucket R2. Mất DB là mất toàn bộ bài làm của học viên. |
| 5 | **Chống dò mật khẩu / lạm dụng API** | **Không có** `@nestjs/throttler` hay rate limit nào trong `apps/lang-api/src`. `/auth/login`, `/auth/refresh`, reset mật khẩu đang mở hoàn toàn. |
| 6 | **Môi trường production tách biệt** | Chỉ một container `:3001` vừa demo vừa thật, migration chạy thẳng lên đó, không có chỗ thử deploy trước. |

---

## 2. P1 – Cải thiện tính năng đã có

### 7. Điểm danh buổi học *(quan trọng nhất nhóm này)*

Plan req-3 mục 1.4 định nghĩa "chuyên cần" = tỉ lệ nộp **mục đề thi có deadline**. Trung tâm thật hiểu chuyên cần là *có mặt ở buổi học*. Hệ quả đã phải ghi vào tài liệu sự cố: *"Chuyên cần của cả lớp bằng 0 hoặc trống – chưa mục đề thi nào đặt hạn nộp"*. Thời khoá biểu đã có đủ buổi, giáo viên, học viên → chỉ thiếu bảng điểm danh và cách gộp hai chỉ số.

### 8. Điểm tổng kết & trọng số

Bảng điểm chỉ có trung bình theo chương. Thiếu trọng số theo loại bài, điểm tổng kết toàn khoá, điểm liệt theo section, và kết luận **Đạt / Không đạt** cuối khoá (hiện chỉ có ô nhận xét chữ).

### 9. Quy đổi thang điểm TOEIC 990 / IELTS band / JLPT

Hệ thống seed sẵn TOEIC, IELTS, JLPT N2 nhưng kết quả trả về vẫn chỉ là **% đúng**. Đây là thứ trung tâm ngoại ngữ mong đợi nhất từ một đề TOEIC.

### 10. Thống kê & báo cáo

Chưa có tỉ lệ đúng theo câu (biết câu nào cả lớp sai để dạy lại), chưa có báo cáo cấp trung tâm (tiến độ nhiều lớp, tải giáo viên, học viên nguy cơ bỏ học). Dashboard trung tâm hiện chỉ là vài thẻ đếm.

### 11. Gia hạn deadline riêng cho một học viên

Hiện chỉ có "Cho làm lại" từng lượt và mục "Thi lại cho X". Học viên nghỉ ốm là chuyện hằng tuần.

### 12. Nhân bản lớp/khoá học + nhập học viên từ file

Mỗi kỳ mở lớp mới phải dựng thủ công lại toàn bộ giáo trình lớp và thời khoá biểu; danh sách học viên nhập tay từng người (giới hạn 200 người mỗi lần).

### 13. Thông báo

Thiếu email/push ngoài ứng dụng, thiếu tắt từng loại, và cần **gộp**: hiện mỗi con một dòng, mỗi mục giáo trình một dòng → phụ huynh có 2 con dễ ngập chuông.

### 14. Phụ huynh

Không có kênh liên hệ giáo viên, không xem được nội dung/đáp án bài của con. Trang "Con của tôi" mới chỉ là báo cáo một chiều.

### 15. Thi

Giới hạn nghe audio 1 lần, thời gian chuẩn bị Speaking, khung giờ được phép làm bài, và **xem đáp án đề thi sau khi thi** (bài học đã có, đề thi thì chưa).

### 16. Thời khoá biểu

Lặp cách tuần; ngày nghỉ lặp hằng năm / cấp hệ thống; kiểm trùng **phòng** (hiện chỉ kiểm trùng người); lịch gộp mọi trung tâm ở `/me`.

---

## 3. P2 – Bổ sung nghiệp vụ

| # | Việc | Ghi chú |
|---|---|---|
| 17 | **Gói dịch vụ & thanh toán** | Ba gói hiện chỉ giới hạn số thành viên: giá để trống, không thời hạn, không quota dung lượng – chưa có đường thu tiền nào |
| 18 | **Học phí & ghi danh** | Thu theo khoá/lớp, công nợ, biên lai |
| 19 | **Trang giới thiệu khoá học công khai + học viên tự đăng ký** | Kênh tuyển sinh cho trung tâm |
| 20 | **Chuyển quyền Chủ sở hữu + tự xin tham gia trung tâm** | Owner nghỉ việc là trung tâm kẹt cứng |
| 21 | **Nhật ký thao tác cấp hệ thống & trung tâm** | Chỉ lớp học có `class_change_logs`. Khoá tài khoản, đổi vai trò, xoá đề, đổi gói, duyệt trung tâm không lưu vết nào |
| 22 | **Nội dung học phong phú hơn** | Flashcard, nhúng YouTube, **ngân hàng câu hỏi dùng lại + tự sinh đề** (hiện mỗi đề soạn độc lập) |
| 23 | **Mobile / PWA** | Học viên học bằng điện thoại là chính; ghi âm Speaking trên mobile cần kiểm riêng |
| 24 | **i18n** | Chỉ có `apps/lang-app/src/i18n/vi.ts` |

---

## 4. Kỹ thuật & chất lượng

| # | Việc | Ghi chú |
|---|---|---|
| 25 | **E2E trình duyệt (Playwright)** | Mọi nghiệm thu hiện là script API + bấm tay theo [req-3-acceptance.md](../requirements/req-3-acceptance.md). Đây là chi phí người lớn nhất mỗi lần deploy |
| 26 | **Giám sát & cảnh báo** | Chỉ có `docker logs` + `/api/health`. Không log tập trung, không cảnh báo khi container restart hay cron chết |
| 27 | **Đếm tham chiếu media khi nhân bản** | Đã ghi nhận ở req-3 mục 8: xoá đề gốc có thể làm hỏng ảnh/audio của đề đã nhân bản |

---

## 5. Đề xuất chia phase

| Phase | Chủ đề | Gồm |
|---|---|---|
| **req-4** ✅ 2026-09-25 | Giao diện 3 theme | Không có trong danh sách trên (đến từ feedback người dùng): Sáng / Giấy / Tối, mặc định Sáng – [req-4.md](../requirements/req-4.md) |
| **req-5** | Sẵn sàng vận hành thật | 1–6, 25, 26 – không thêm nghiệp vụ, chỉ để dám mở cho khách trả tiền |
| **req-6** | Đúng nghiệp vụ trung tâm | 7 (điểm danh buổi), 8, 9, 11, 12, 16 |
| **req-7** | Thương mại hoá | 17, 18, 19, 10, 20, 21 |
| Rải kèm | | 13, 14, 15, 22, 23, 24, 27 |

**Nếu chỉ làm được một việc tiếp theo:** mục 1 (domain + HTTPS). Nó đang làm hỏng Speaking – tính năng khác biệt nhất của sản phẩm – và là tiền đề cho mục 2 và 23.

**Nếu chỉ chọn một tính năng nghiệp vụ:** mục 7 (điểm danh buổi học). Toàn bộ dữ liệu buổi học đã có sẵn, và nó lấp đúng khoảng cách giữa cái hệ thống gọi là "chuyên cần" và cái trung tâm hiểu là chuyên cần.
