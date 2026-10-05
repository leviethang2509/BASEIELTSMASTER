# Requirement 5 – Câu hỏi làm rõ (round 2)

> Nguồn: [req-5.md](req-5.md), câu trả lời round 1: [req-5-question.md](req-5-question.md).
> Cách trả lời: ghi ngay dưới dòng **Trả lời:** của từng câu; đồng ý **Đề xuất** thì ghi `OK`.
> Câu đánh dấu 🔴 là câu **chặn**, cần trả lời trước khi lập plan.

---

## 0. Đã chốt ở round 1 (tóm tắt)

- Kết nối Gemini **giống LC** (`vertex` qua service account + `aistudio` qua API key); các biến không bắt buộc lúc khởi động, thiếu thì 501.
- AI trả **danh sách thao tác** theo schema, server áp vào Plate (không viết lại chữ); `GEMINI_MAX_OUTPUT_TOKENS` nâng lên 16384.
- AI dựng indicator + cấu trúc câu hỏi + đáp án/giải thích **nếu văn bản có**, không tự giải đề. Thiếu đáp án và `warning` không kích hoạt thử lại.
- Chỉ xử lý chữ; prompt cố định + ô ghi chú + loại đề/module; chỉ section đang mở; thay nội dung editor (Ctrl+Z được), không tự Save; chạy nền + polling.
- Ai sửa được đề thì dùng được; System Owner/Admin **bật AI theo từng tenant**.

---

## 1. Quota & bật/tắt AI

### 1.1 🔴 "Quota của người dùng" là gì?
C3 ghi *"mọi thao tác với AI đều tính vào quota của người dùng"*, còn D2 chỉ yêu cầu **bật/tắt AI theo tenant**, không nói giới hạn số. Các cách hiểu:

- **(a) Chỉ bật/tắt, không giới hạn số lần.** Thông báo nhỏ chỉ để nhắc "mỗi lần chạy đều được ghi nhận". Không có con số quota nào.
- **(b) Bật/tắt + hạn mức theo tenant mỗi tháng.** System Owner/Admin đặt số lần chạy/tháng cho từng tenant (để trống = không giới hạn). Hết hạn mức → 429 "Trung tâm đã dùng hết lượt AI tháng này".
- **(c) Bật/tắt + hạn mức theo từng người dùng** (mỗi giáo viên N lần/tháng). Cần thêm chỗ đặt số cho từng người, phức tạp hơn nhiều.

**Đề xuất:** (b). Hộp thoại AI hiện "Đã dùng X/Y lượt tháng này" (không giới hạn thì chỉ hiện X). Mọi lần chạy ghi vào bảng `ai_format_runs` (tenant, người chạy, đề, section, số lần gọi, token vào/ra, kết quả, thời điểm) để đếm hạn mức và tra chi phí.
**Trả lời:** Tạm thời không giới hạn (a) - nợ phần hạn mức sau vì trung tâm chính chủ đang cần thêm số lượng lớn.

### 1.2 Đơn vị tính quota
- **(a)** 1 lần bấm nút = 1 lượt, dù bên trong gọi AI 1 hay 3 lần.
- **(b)** Mỗi lần gọi AI = 1 lượt (1 lần bấm tốn 1–3 lượt).
- **(c)** Tính theo token.

**Đề xuất:** (a), vì người dùng dễ hiểu. Lần chạy lỗi do hệ thống (Google trả lỗi, timeout, người dùng huỷ trước khi có lần gọi nào xong) **không** bị tính.
**Trả lời:** Đồng ý (a)

### 1.3 Bật AI ở đâu và tenant chưa bật thì thấy gì?
**Đề xuất:**
- Trang chi tiết tenant ở `/admin` có khối **"Trợ lý AI"**: công tắc bật/tắt + ô hạn mức/tháng (nếu chọn 1.1 b). Chỉ System Owner/Admin sửa được. Mặc định **tắt** cho mọi tenant, kể cả tenant cũ.
- Tenant chưa bật: **ẩn hẳn** nút AI trong trình soạn đề (không hiện nút bị disable), API trả 403.
- Tenant đã bật nhưng server thiếu cấu hình Gemini: nút hiện nhưng disable kèm tooltip "Chưa cấu hình AI" (theo A3).
- Hết hạn mức: nút **vẫn bấm được** (theo C3), hộp thoại báo đã hết lượt.

**Trả lời:** Đồng ý nhưng quay lại câu 1.1, liệu có tuỳ chọn quota bấm nút cho từng tenant không, ví dụ 100 lần/tháng, 1000 lần/tháng và không giới hạn

> **Chốt (2026-10-01, hỏi lại trực tiếp):** làm luôn hạn mức trong req-5 – System Owner/Admin chọn **100 / 1000 lượt/tháng / Không giới hạn** cho từng tenant (mặc định khi bật: Không giới hạn). Thay cho câu trả lời 1.1 "tạm thời không giới hạn".

---

## 2. Số lần thử

### 2.1 "3 lần thử" = tổng 3 lần gọi AI?
Câu trả lời C3 là *"3 lần thử trong lần bấm"*. Tôi hiểu là **tổng cộng 3 lần gọi**: 1 lần định dạng + tối đa 2 lần sửa lỗi (khác với đề xuất cũ là 1 + 3).

**Đề xuất:** đúng như trên. Hằng số `AI_FORMAT_MAX_ATTEMPTS = 3` để trong code, không đưa ra env.
**Trả lời:** Đồng ý

### 2.2 Sau 3 lần vẫn lỗi thì đưa gì vào editor?
C3 chưa nói rõ phần này.

**Đề xuất:** vẫn đưa **kết quả có ít lỗi cấu trúc nhất** vào editor (Ctrl+Z hoàn tác được), kèm cảnh báo "AI chưa sửa hết N lỗi, vui lòng chỉnh tay" và danh sách lỗi. Nếu cả 3 lần đều không áp được thao tác nào (AI trả dữ liệu hỏng) thì giữ nguyên nội dung gốc.
**Trả lời:** Đồng ý

---

## 3. Cấu hình & dữ liệu mẫu

### 3.1 Các biến cần điền (theo A1 "làm giống LC")
Ở chế độ `vertex`, LC xác thực bằng service account, **không** dùng `GEMINI_API_KEY`. `apps/lang-api/.env` hiện còn thiếu:

| Biến | Máy dev | VPS (prod + staging) |
| --- | --- | --- |
| `GCP_PROJECT_ID` | cần | cần |
| `GOOGLE_APPLICATION_CREDENTIALS` (đường dẫn file JSON, đặt trong `apps/lang-api/secrets/`, gitignored) | một trong hai | – |
| `GCP_SERVICE_ACCOUNT_JSON_BASE64` (base64 của file JSON) | một trong hai | cần |
| `GEMINI_VERTEX_LOCATION` | tuỳ chọn, mặc định `global` | tuỳ chọn |

Service account cần role **Vertex AI User** và project phải bật API `aiplatform.googleapis.com`. `GEMINI_API_KEY` chỉ dùng khi `GEMINI_BACKEND=aistudio`.

**Đề xuất:** anh/chị điền các biến trên vào `apps/lang-api/.env` trước Step tích hợp Gemini. Tôi chỉ copy phần credentials + `GeminiService` của LC (không copy dashboard `gcp-usage`, `labs`).
**Trả lời:** Đồng ý

### 3.2 Đề mẫu để nghiệm thu (B5)
**Đề xuất:** anh/chị đặt 3–5 đề thật dạng `.txt` (ghi loại đề ở tên file, vd. `ielts-reading-1.txt`) vào thư mục `docs/requirements/req-5-samples/`. Thư mục này **gitignored** vì đề có thể có bản quyền. Unit test dùng đề nhỏ tự viết, không dùng đề thật. Cho biết loại đề nào ưu tiên nhất.
**Trả lời:** IELTS
