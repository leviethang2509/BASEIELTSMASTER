# Requirement 5 – Checklist nghiệm thu "Định dạng bằng AI"

> Dùng sau mỗi lần deploy, cùng với [req-3-acceptance.md](req-3-acceptance.md) (chức năng) và [req-4-acceptance.md](req-4-acceptance.md) (3 theme).
> Cột **Bấm** = đã xem trên trình duyệt. Môi trường: máy dev `http://127.0.0.1:3100` (API :3101) hoặc VPS `http://…:3001`.
> Dữ liệu thử: trung tâm **step4-test**, loại đề **IELTS**, đề nháp **req-5 Step 4 – thử AI**. Tài khoản: bảng đầu [req-3-acceptance.md](req-3-acceptance.md).
> Đề mẫu: `docs/requirements/req-5-samples/ielts-test-1.txt` (gitignored – chỉ có trên máy dev). Mỗi lần bấm **Định dạng** tính 1 lượt của trung tâm.

---

## 1. System Owner / System Admin (`/admin/tenants`)

| # | Việc | Kết quả mong đợi | Bấm |
|---|---|---|---|
| 1.1 | **Chi tiết** một trung tâm chưa bật AI | Khối **Trợ lý AI**: công tắc tắt, ô **Hạn mức mỗi tháng** bị mờ | ☐ |
| 1.2 | Bật công tắc **Bật trợ lý AI** | Lưu ngay; hạn mức mặc định **Không giới hạn**; dòng "Đã dùng N lượt tháng này" | ☐ |
| 1.3 | Đổi hạn mức 100 → 1.000 → Không giới hạn, F5 | Giữ đúng giá trị vừa chọn; dòng "Đã dùng N / 100 lượt tháng này" khi có hạn mức | ☐ |
| 1.4 | Tắt công tắc | Trình soạn đề của trung tâm (F5) không còn nút **Định dạng bằng AI** | ☐ |
| 1.5 | Chủ trung tâm (không phải System Owner/Admin) gọi `PATCH /api/admin/tenants/:id/ai` | 403 | ☐ |

## 2. Chủ sở hữu / Quản trị viên trung tâm (trình soạn đề)

| # | Việc | Kết quả mong đợi | Bấm |
|---|---|---|---|
| 2.1 | Trung tâm **chưa bật** AI → mở **Soạn đề** | Thanh công cụ không có nút **Định dạng bằng AI** | ☐ |
| 2.2 | Trung tâm đã bật, máy chủ **chưa cấu hình** Gemini | Nút mờ, rê chuột hiện "Chưa cấu hình AI" | ☐ |
| 2.3 | Đã bật + đã cấu hình → bấm nút | Hộp thoại: tên section, cảnh báo nội dung bị thay, ô **Ghi chú cho AI**, "Đã dùng X/Y lượt tháng này" (hoặc "Đã dùng X lượt…"), dòng nhỏ về lượt | ☐ |
| 2.4 | Dán phần **Reading** của đề mẫu vào một section (tab Reading) → **Định dạng** | "Lần thử 1/3…" → đóng hộp thoại, thông báo "Đã định dạng bằng AI…"; 3 Part, câu 1–37 (bỏ "Label the diagram"); dòng "A … B …" dính nhau đã tách thành từng lựa chọn; tiêu đề trang "Có thay đổi chưa lưu" | ☐ |
| 2.5 | Bảng **Kiểm tra** sau 2.4 | Chỉ còn lỗi thiếu đáp án ("Chưa tick đáp án nào", "n cặp chưa có đáp án") – đề mẫu không có answer key, AI không tự giải | ☐ |
| 2.6 | **Ctrl+Z** một lần, rồi **Ctrl+Shift+Z** | Về đúng bản vừa dán; làm lại ra kết quả AI | ☐ |
| 2.7 | Phần **Listening** (tab Listening) và **Writing** (tab Writing) | Listening: 4 Part, câu 1–40, ô trống thay cho "1…….", số câu không bị lặp; Writing: 2 câu Writing (1500 / 2500 ký tự) | ☐ |
| 2.8 | Bấm lại nút trên section vừa định dạng xong | "Section đã được định dạng, AI không thay đổi gì…" (hoặc kết quả y hệt), đáp án đã điền tay không mất | ☐ |
| 2.9 | Bấm **Định dạng** rồi **Hủy** ngay | Hộp thoại đóng, "Đã huỷ định dạng bằng AI, nội dung không đổi."; số lượt không tăng | ☐ |
| 2.10 | Section rỗng → **Định dạng** | Báo lỗi trong hộp thoại "Section chưa có chữ nào để định dạng." | ☐ |
| 2.11 | Đặt hạn mức 100 khi đã dùng ≥ 100 lượt → bấm | Nút vẫn bấm được; hộp thoại báo "Trung tâm đã dùng hết 100 lượt AI của tháng này", dòng đã dùng màu đỏ | ☐ |
| 2.12 | Trình soạn **bài học** (trung tâm đang bật AI) | Không có nút **Định dạng bằng AI** | ☐ |
| 2.13 | Không bấm **Lưu**, F5 | Hộp **Khôi phục bản chưa lưu** có kết quả AI (nháp trình duyệt như sửa tay); DB chưa đổi | ☐ |

## 3. Giáo viên

| # | Việc | Kết quả mong đợi | Bấm |
|---|---|---|---|
| 3.1 | Đề **mình tạo** | Có nút, định dạng được như mục 2 | ☐ |
| 3.2 | Đề người khác tạo (chỉ xem) | Không vào được trình soạn đề / API trả 403 | ☐ |
| 3.3 | Mở job định dạng của người khác (`GET …/ai-format/:jobId` bằng token khác) | 404 | ☐ |

## 4. Học viên / Phụ huynh

| # | Việc | Kết quả mong đợi | Bấm |
|---|---|---|---|
| 4.1 | Gọi `GET /api/t/{slug}/ai/status` hoặc `POST …/ai-format` | 403 | ☐ |

## 5. Giao diện (3 theme: Sáng · Giấy · Tối)

| # | Việc | Kết quả mong đợi | Bấm |
|---|---|---|---|
| 5.1 | Khối **Trợ lý AI** ở `/admin/tenants` → **Chi tiết** | Công tắc bật/tắt, ô chọn hạn mức đọc được ở cả 3 theme | ☐ |
| 5.2 | Nút **Định dạng bằng AI** (thường / mờ) và hộp thoại (lúc chờ, lúc chạy "Lần thử n/3…", lúc báo lỗi) | Chữ, viền, nút **Hủy** rõ ở cả 3 theme | ☐ |
| 5.3 | Thông báo dưới thanh công cụ (thành công / cảnh báo còn lỗi) và viền vàng của bảng **Kiểm tra** | Phân biệt được tông thông tin / cảnh báo ở cả 3 theme | ☐ |

## 6. Tài liệu

| # | Việc | Kết quả mong đợi | Bấm |
|---|---|---|---|
| 6.1 | `/user-manual` → **Trình soạn đề → Định dạng bằng AI** | Có các bước, bảng thông báo, hạn mức, giới hạn và cảnh báo nội dung gửi lên Google | ☐ |
| 6.2 | `/user-manual` → **Quản lý trung tâm → Trợ lý AI**; **Deploy & môi trường → Biến môi trường** | Có công tắc/hạn mức; có nhóm biến **AI (Gemini)**, không có giá trị thật | ☐ |
