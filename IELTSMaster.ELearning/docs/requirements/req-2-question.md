# Requirement 2 – Câu hỏi

> Nguồn: [req-2.md](req-2.md). Hỏi và trả lời trực tiếp trong phiên chat ngày 2026-09-17, ghi lại ở đây để giữ lý do quyết định.

## Vòng 1

### Q1. Bảo vệ nội dung
"Chỉ System Owner/Admin được xem" mâu thuẫn với "static web, JSON load trực tiếp": file JSON tĩnh (vd. `/public/user-manual.json`) hoặc JSON bundle vào JS thì ai biết URL cũng tải được.

Đề xuất: nội dung vẫn là file JSON tĩnh trong repo, nhưng lang-api đọc và trả qua `GET /api/admin/user-manual` (guard `SYSTEM_MANAGER_ROLES`); trang chặn ở cả UI lẫn API.

**Trả lời:** Đồng ý đề xuất (JSON trong repo, API trả về).

### Q2. Đường dẫn và khung giao diện
Đề xuất: `/user-manual`, layout riêng kiểu trang docs (header gọn + sidebar trái + nội dung), không dùng `DashboardShell`; link từ menu `/admin`; mỗi mục có URL riêng `/user-manual/[mục]`.

**Trả lời:** Đồng ý đề xuất.

### Q3. Định dạng nội dung trong JSON
Đề xuất: khối có cấu trúc (heading, paragraph, list, steps, table, callout, role…) render bằng component có sẵn style Solarized, không thêm thư viện markdown.

**Trả lời:** Đồng ý đề xuất.

### Q4. Phạm vi nội dung
Các lựa chọn: hướng dẫn thao tác theo role; nghiệp vụ & khái niệm; bảng ma trận phân quyền; kỹ thuật vận hành.

**Trả lời:** Chọn cả 4.

## Vòng 2

### Q5. Ảnh chụp màn hình
Đề xuất: không, chỉ văn bản (tên menu/nút đúng như UI).

**Trả lời:** Đồng ý – chỉ văn bản.

### Q6. Tính năng thêm cho trang docs
Các lựa chọn: ô tìm kiếm; mục lục trong trang; nút Trước/Sau; lọc theo role.

**Trả lời:** Chọn cả 4.

### Q7. Duy trì tài liệu về sau
Đề xuất: ghi quy tắc vào CLAUDE.md (đổi tính năng/quyền phải cập nhật JSON tài liệu) kèm test kiểm cấu trúc JSON.

**Trả lời:** Đồng ý đề xuất.

### Q8. Quy trình
Đề xuất: ghi câu hỏi/trả lời, viết plan + progress ngắn gọn rồi implement ngay trong phiên (yêu cầu nhỏ).

**Trả lời:** Đồng ý – viết plan rồi làm luôn.
