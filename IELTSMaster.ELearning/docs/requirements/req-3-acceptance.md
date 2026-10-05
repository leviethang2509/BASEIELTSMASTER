# Requirement 3 – Checklist nghiệm thu tổng

> Dùng cho Step 14. Bấm theo từng vai trò, đăng nhập bằng tài khoản thật (không dùng token ký tay).
> Cột **API** = đã được `accept14.js` kiểm tự động trên `step4-test` (máy dev, 2026-09-22);
> cột **Bấm** = cần mở trình duyệt xem giao diện.
>
> Môi trường: máy dev `http://127.0.0.1:3100` (API :3101) hoặc VPS `http://…:3001` sau khi deploy giai đoạn 3.
> Dữ liệu thử: trung tâm **step4-test**, lớp **N5-2026-01** (Đang học), khoá **Tiếng Nhật N5**.

## Tài khoản thử (step4-test)

| Vai trò | Tài khoản | Ghi chú |
|---|---|---|
| Chủ sở hữu trung tâm (+ System Owner) | `admin@lang-simulator.com` | cũng là System Owner |
| Giáo viên **của lớp** N5-2026-01 | `step4-teacher@example.com` | soạn Minna bài 1–4, giáo trình N5 |
| Giáo viên **ngoài lớp** | `step4-teacher2@example.com` | dùng để kiểm 403 |
| Học viên | `step7-student1@example.com` / `Step7-Passw0rd` | có lượt thi, lượt học, thi lại |
| Học viên | `step7-student2@example.com` / `Step7-Passw0rd` | đậu lần 1, thi lại 50% |
| Học viên (ngoài lớp N5) | `step4-student@example.com` | có lượt học tự do |
| Phụ huynh | `step13-parent@example.com` / `Step13-Passw0rd` | liên kết 2 con ở trên |

---

## 1. System Owner / System Admin (`/admin`)

| # | Việc | Kết quả mong đợi | API | Bấm |
|---|---|---|---|---|
| 1.1 | `/admin/categories` | Danh mục hệ thống Tiếng Anh, Tiếng Nhật; cột **Loại đề**, **Mẫu bài học**, **Khoá học** | | ☐ |
| 1.2 | `/admin/lesson-blueprints` | Mẫu **Minna no Nihongo – 1 bài** (5 phần), sửa/xoá được; mẫu đã có bài học chỉ ngừng dùng | ✔ | ☐ |
| 1.3 | `/user-manual` | 9 nhóm; có trang Bài học, Khoá học, Giáo trình, Lớp học, Thời khoá biểu, Giáo trình lớp, Chuyên cần & bảng điểm, Lịch, Học bài học, Lớp học của tôi, Con của tôi, Thông báo, Cài đặt trung tâm | ✔ | ☐ |
| 1.4 | `/user-manual` → lọc **Vai trò = Phụ huynh** | Có **Con của tôi**; lọc Giáo viên thì không có trang này | | ☐ |
| 1.5 | `/user-manual/gioi-han-he-thong` | Có bảng **Đào tạo: khoá học, giáo trình, lớp, lịch** | | ☐ |
| 1.6 | `/user-manual/ngoai-pham-vi` | Không còn liệt kê các việc req-3 đã làm (chấm theo lớp, chuyên cần, thông báo, phụ huynh) | ✔ | ☐ |
| 1.7 | Giáo viên mở `/user-manual` | 403 / không vào được | ✔ | ☐ |

## 2. Chủ sở hữu / Quản trị viên trung tâm

| # | Việc | Kết quả mong đợi | API | Bấm |
|---|---|---|---|---|
| 2.1 | Menu dashboard | Có nhóm **Đào tạo** (Khoá học, Giáo trình, Lớp học, Lịch) và **Cài đặt** | | ☐ |
| 2.2 | **Khoá học** → Tiếng Nhật N5 | 4 tab: Thông tin · Giáo trình tham khảo · Lớp · Lịch | ✔ | ☐ |
| 2.3 | Khoá học đã có lớp | Nút **Xoá khoá học** bị khoá, chỉ **Lưu trữ** | | ☐ |
| 2.4 | **Giáo trình** → Giáo trình N5 | 3 chương, 7 mục; kéo thả, đổi nhãn, nhân bản chạy được | ✔ | ☐ |
| 2.5 | **Lớp học** → N5-2026-01 | 7 tab: Thông tin · Thời khoá biểu · Giáo viên & Học viên · Giáo trình · Tiến độ & Chuyên cần · Bảng điểm · Nhật ký thay đổi | ✔ | ☐ |
| 2.6 | Tab **Giáo viên & Học viên** | 3 học viên, 1 giáo viên; thêm vượt sĩ số (3/3) bị chặn; hộp thêm cảnh báo **trùng lịch** | | ☐ |
| 2.7 | Tab **Thời khoá biểu** | 10 buổi T2+T4 từ 05/10/2026, kết thúc 09/11; buổi 5 **Đã huỷ**, có **buổi bù** T7 24/10, buổi 3 **Đã dời – kiểm tra lại** | ✔ | ☐ |
| 2.8 | Tab **Giáo trình** (lớp) | Mục có ngày mở/deadline/ngưỡng đậu; **Kiểm tra chương 1** + mục **Thi lại**; nút **Bài làm** mở hộp Cho làm lại | ✔ | ☐ |
| 2.9 | Tab **Tiến độ & Chuyên cần** | 4 loại ô (Đúng hạn · Chưa tới hạn · Chưa nộp · Không tính), cả 3 học viên 50% < ngưỡng 70% → cảnh báo; ô tham số k/ngưỡng sửa được | ✔ | ☐ |
| 2.10 | Tab **Bảng điểm** | Cột nhóm thi (điểm cao nhất, Đậu/Trượt), cột **TB chương**, ô nhận xét cuối khoá của `step7-student1` | ✔ | ☐ |
| 2.11 | Nút **Xuất Excel** | Tải `.xlsx` 2 sheet Chuyên cần + Bảng điểm | ✔ | ☐ |
| 2.12 | Tab **Nhật ký thay đổi** | Có dòng tạo lớp, sửa giáo trình, sửa lịch, huỷ buổi, buổi bù, nhận xét | ✔ | ☐ |
| 2.13 | **Lịch** → Lịch trung tâm | Tuần/Tháng/Danh sách; ngày nghỉ **Ngày nghỉ thử (Step 8)** tô xám; buổi huỷ gạch ngang; lớp TRUNG-LICH viền đỏ trùng lịch | ✔ | ☐ |
| 2.14 | **Cài đặt** | Tham số chuyên cần 0,5 / 70 và ngày nghỉ; sửa ngày nghỉ hiện hộp **lớp bị ảnh hưởng** trước khi lưu | ✔ | ☐ |
| 2.15 | Chuyển trạng thái lớp | Nút theo `CLASSROOM_STATUS_TRANSITIONS`; sang **Đã kết thúc** hỏi xác nhận kèm số lượt bị chốt | | ☐ |

## 3. Giáo viên

| # | Việc | Kết quả mong đợi | API | Bấm |
|---|---|---|---|---|
| 3.1 | `step4-teacher` mở **Lớp học** | Chỉ thấy lớp mình phụ trách; `step4-teacher2` mở trang lớp N5-2026-01 → **403** | ✔ | ☐ |
| 3.2 | Khoá học | Chỉ xem: không có nút Tạo/Sửa/Gắn giáo trình | ✔ | ☐ |
| 3.3 | Giáo trình lớp | Sửa và lưu được; **Nhập từ giáo trình** gộp ở client rồi Lưu | | ☐ |
| 3.4 | Buổi học | Huỷ/khôi phục, thêm buổi bù, xếp dạy thế, chọn nội dung buổi được; **không** sửa được lịch lặp | | ☐ |
| 3.5 | **Lịch** | Chỉ có **Lịch dạy của tôi** (kể cả buổi dạy thế ở lớp khác), không có Lịch trung tâm | ✔ | ☐ |
| 3.6 | **Cài đặt** trung tâm | Không có menu; gọi thẳng URL → 403 | ✔ | ☐ |
| 3.7 | **Chấm bài** (kind = Bài học) | `step4-teacher` thấy 2 câu chờ chấm của `step7-student1`; `step4-teacher2` **không thấy gì** | ✔ | ☐ |
| 3.8 | Chấm bài: ô lọc **Lớp** / **Mục** | Chọn được lớp N5-2026-01 hoặc **Bài tự do**; cột **Lớp · Mục** đúng | | ☐ |
| 3.9 | **Chuyển giao chấm** | Giao cho `step4-teacher2` → người đó thấy bài ngay; **Gỡ** thì mất | | ☐ |
| 3.10 | Tab Giáo viên & Học viên → tên học viên | Mở `/classes/{id}/students/{membershipId}`: danh sách lượt, bấm vào xem đáp án và đúng/sai từng câu | ✔ | ☐ |
| 3.11 | Mục đề thi → **Bài làm** → **Cho làm lại** | Lượt cũ đánh dấu không tính, học viên làm lượt mới; nhật ký ghi `attempt_voided` | | ☐ |
| 3.12 | Tab Tiến độ & Chuyên cần | Xem được, ô tham số k/ngưỡng **chỉ đọc** | | ☐ |

## 4. Học viên (`step7-student1`)

| # | Việc | Kết quả mong đợi | API | Bấm |
|---|---|---|---|---|
| 4.1 | `/t/step4-test` | Có **Lớp của tôi**, **Bài học**, danh sách đề; không vào được dashboard | ✔ | ☐ |
| 4.2 | Trang lớp | Giáo viên, sĩ số, **Buổi sắp tới**, **Kết quả bài kiểm tra/bài thi**, giáo trình theo chương | ✔ | ☐ |
| 4.3 | Mục **Minna bài 1** | **Vào học** mở màn hình học bài; nộp phần thấy đáp án + giải thích; **Làm lại** được | | ☐ |
| 4.4 | Mục **Kiểm tra chương 2** | Nhãn **Chưa tới ngày mở** (01/12/2026), không vào được | ✔ | ☐ |
| 4.5 | Mục **Thi lại** | Đã đậu lần trước → **Không bắt buộc**; chưa đậu → bắt buộc | ✔ | ☐ |
| 4.6 | Lớp đang học | **Không** thấy tỉ lệ chuyên cần, không thấy nhãn "muộn", không có Tổng kết cuối khoá | ✔ | ☐ |
| 4.7 | **Lịch học của tôi** | Tuần/Tháng/Danh sách các buổi; không mở được trang chi tiết buổi | ✔ | ☐ |
| 4.8 | Chuông **Thông báo** | Có thông báo (quá hạn chưa nộp, bài đã chấm xong…); bấm vào đi đúng trang | ✔ | ☐ |
| 4.9 | `/me/notifications` | Lọc Tất cả / Chưa đọc, phân trang, **Đánh dấu đã đọc tất cả** | | ☐ |
| 4.10 | Gọi thẳng `/t/step4-test/dashboard` | “Bạn không có quyền vào dashboard” | ✔ | ☐ |
| 4.11 | Lớp chuyển **Đã kết thúc** | Trang lớp có **Tổng kết cuối khoá** (chuyên cần, TB chương, nhận xét của giáo viên) | | ☐ |

## 5. Phụ huynh (`step13-parent`)

| # | Việc | Kết quả mong đợi | API | Bấm |
|---|---|---|---|---|
| 5.1 | `/t/step4-test` | Có khối **Con của tôi** với 2 con (quan hệ “Mẹ”) | ✔ | ☐ |
| 5.2 | Trang của một con | **Lớp của con**, **Bài làm ngoài lớp**, **Lịch học của con** (mỗi con một lịch) | ✔ | ☐ |
| 5.3 | Trang lớp của con | Chỉ đọc: không có nút Vào học/Vào làm bài, không mở được bài làm | ✔ | ☐ |
| 5.4 | Mục **Minna bài 1** của con | Khối **Nhận xét của giáo viên**: tên phần · số câu · điểm · nhận xét | ✔ | ☐ |
| 5.5 | Lớp đang học | `summary` rỗng – chưa có chuyên cần/tổng kết | ✔ | ☐ |
| 5.6 | Mở học viên không liên kết | “Không tìm thấy” (404) | ✔ | ☐ |
| 5.7 | Chuông thông báo | 2 thông báo “con quá hạn chưa nộp”, mỗi dòng mở đúng trang của từng con | ✔ | ☐ |
| 5.8 | Chủ sở hữu/Giáo viên mở `/t/{slug}/children` | 403 (khu vực chỉ dành cho Phụ huynh) | ✔ | ☐ |
| 5.9 | Phụ huynh học bài/làm đề công khai | Làm được như thành viên thường (tài khoản của chính mình) | | ☐ |

---

## Sau khi deploy giai đoạn 3 (VPS `:3001`)

1. `docker compose ps` healthy; `/api/health` trả `database: up`.
2. Migration `ClassProgress`, `CreateNotifications`, `GuardianNotifications` đã chạy (log container), **không có env mới**.
3. Chạy lại mục 1.3, 2.5, 2.9, 2.11, 4.1, 5.1 trên dữ liệu của VPS.
4. Xoá dữ liệu thử đã tạo trên VPS sau khi kiểm.
