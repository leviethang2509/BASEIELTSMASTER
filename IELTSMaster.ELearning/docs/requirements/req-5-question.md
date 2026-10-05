# Requirement 5 – Câu hỏi làm rõ

> Nguồn: [req-5.md](req-5.md).
> Cách trả lời: ghi ngay dưới dòng **Trả lời:** của từng câu. Mỗi câu đã có **Đề xuất**, nếu đồng ý chỉ cần ghi `OK`.
> Câu đánh dấu 🔴 là câu **chặn** (ảnh hưởng tới kiến trúc/phạm vi), cần trả lời trước khi lập plan.

---

## 0. Hiện trạng (kết quả quét source, để hiểu bối cảnh)

- **lang-simulator chưa có code AI nào.** `apps/lang-api/.env` đã có 4 biến `GEMINI_*`, nhưng `env.validation.ts` và các file `.env.example` chưa khai báo.
- **LC có sẵn `GeminiService`** (`backend/src/labs/services/gemini.service.ts`, SDK `@google/genai`): hai cửa vào `vertex` (xác thực bằng **service account GCP**, cần `GCP_PROJECT_ID` + credentials + `GEMINI_VERTEX_LOCATION`) và `aistudio` (xác thực bằng **API key**). Phần lõi copy được; phần `labs`, `gcp-usage` (dashboard chi phí) thuộc nhóm "không copy" theo quy ước.
- **Một đề "chuẩn" không chỉ có indicator.** Mỗi section là 1 editor Plate; ngoài indicator (`part` / `subpart` / `question` + `qtype` + tham số `seconds`/`maxChars`/`maxPicks`/`options`, `explanation`) còn phải có cấu trúc đáp án theo từng dạng:
  - MC / pick-n: danh sách checkbox, ô đúng được tick.
  - Matching / TFNG / YNNG: block `pair` có prop `answer`.
  - Fill-blank: inline `blank`, chữ trong ô là đáp án (nhiều đáp án ngăn `|`).
  - Ordering / polytomous: danh sách đánh số / gắn trọng số.
  - Speaking / writing: không có đáp án.
- **Validation** (`validateSection`) có 2 mức: `error` (chặn publish, 422) và `warning` (vd. thiếu câu hỏi). Lưu nháp vẫn được khi có lỗi.

---

## A. Kết nối Gemini

### A1. 🔴 Xác thực Vertex bằng API key hay service account?
`.env` đang đặt `GEMINI_BACKEND=vertex` **cùng** `GEMINI_API_KEY`, nhưng không có service account GCP. Có 2 cách hiểu:

- **(a) Vertex AI express mode:** API key tạo trong Vertex AI (Google Cloud Console), SDK gọi `new GoogleGenAI({ vertexai: true, apiKey })`. Tính tiền vào Cloud Billing, không cần service account / project id / location.
- **(b) Vertex bằng service account như LC:** phải thêm `GCP_PROJECT_ID`, `GCP_SERVICE_ACCOUNT_JSON_BASE64` (hoặc `GOOGLE_APPLICATION_CREDENTIALS` ở máy dev), `GEMINI_VERTEX_LOCATION`.
- **(c) API key của AI Studio:** khi đó `GEMINI_BACKEND` phải là `aistudio`.

**Đề xuất:** (a) nếu key hiện có là key Vertex express; vẫn viết code hỗ trợ cả `vertex` + `aistudio` như LC (ít code, đổi được bằng env). Nhờ anh/chị xác nhận key đang điền được tạo ở đâu (Vertex AI hay AI Studio).
**Trả lời:**

Hãy làm giống LC, thiếu key nào thì báo tôi điền vào tiếp

### A2. 🔴 `GEMINI_MAX_OUTPUT_TOKENS=2048` quá nhỏ cho "cả một đề dài"
Một đề Reading/Listening dài thường 3.000–10.000 từ. Nếu bắt AI trả lại **toàn bộ nội dung** (dạng JSON Plate) thì đầu ra gấp 3–5 lần đầu vào, 2048 token sẽ bị cắt giữa chừng. Ngoài ra dòng `gemini-3.x-flash` có "thinking", token suy nghĩ cũng tính vào giới hạn đầu ra.

Cách xử lý đề xuất (về kiến trúc):
- AI **không** viết lại nội dung. Server gửi đề dưới dạng danh sách đoạn có đánh số (`[12] Question 5. Which of the following…`), AI chỉ trả về **danh sách thao tác ngắn** dạng JSON có schema (`responseSchema`): "chèn indicator `question/mc-single` trước đoạn 12", "đoạn 13–16 là lựa chọn, đúng là đoạn 15", "biến cụm `in 1998` ở đoạn 20 thành blank"… Server áp thao tác vào Plate → chữ gốc **không bao giờ bị AI sửa/bịa**, đầu ra nhỏ.
- Nâng `GEMINI_MAX_OUTPUT_TOKENS` lên **16384** và đặt mức thinking thấp; section quá dài (vượt ngưỡng đoạn) thì báo người dùng chia nhỏ thay vì cắt ngầm.

**Đề xuất:** đồng ý cả hai ý trên.
**Trả lời:** Đồng ý cả hai ý trên.

### A3. Thiếu cấu hình thì sao?
**Đề xuất:** giống R2 – các biến `GEMINI_*` **không bắt buộc** lúc khởi động; thiếu thì route AI trả **501**, nút AI trong editor vẫn hiện nhưng disable kèm tooltip "Chưa cấu hình AI". Thêm vào `env.validation.ts`, `apps/lang-api/.env.example`, `deploy/.env.example`, `deploy/staging/.env.example`; anh/chị tự cập nhật `.env` trên VPS (prod + staging).
**Trả lời:** Đồng ý

---

## B. AI làm những gì

### B1. 🔴 Chỉ chèn indicator, hay dựng luôn cấu trúc đáp án?
req-5 ghi "điền indicator vào", nhưng chỉ có indicator thì validation vẫn báo lỗi (MC chưa thành checkbox, TFNG chưa thành `pair`, chưa có blank…). Các mức:

- **(a) Chỉ indicator** (`part`/`subpart`/`question` + `qtype` + tham số). Phần đáp án người dùng tự làm → hầu như luôn "fail validation" sau 3 lần.
- **(b) Indicator + cấu trúc câu hỏi** (checkbox list, `pair`, `blank`, danh sách ordering) nhưng **để trống đáp án** nếu văn bản không có đáp án.
- **(c) Như (b) + điền đáp án** khi văn bản paste có đáp án (bảng "Answer key" cuối đề, hay đáp án ghi sau mỗi câu), + chèn `explanation` nếu đề có lời giải.

**Đề xuất:** (c). Không có đáp án trong văn bản thì để trống, **không cho AI tự giải đề** (tránh đáp án sai mà người dùng tưởng đúng).
**Trả lời:** Đồng ý với đề xuất (c)

### B2. Đáp án bị thiếu có tính là "validation failed" không?
Nếu đề paste vào không có đáp án, lỗi "thiếu đáp án" là do dữ liệu chứ không phải do AI định dạng sai – gọi lại AI 3 lần cũng vô ích và tốn tiền.

**Đề xuất:** vòng sửa tự động chỉ tính các lỗi **cấu trúc** (indicator sai chỗ, thiếu dạng câu hỏi, số option không khớp, ordering trùng số…); lỗi chỉ do **thiếu đáp án** và mọi `warning` thì không kích hoạt lần thử lại – hiện cho người dùng tự điền.
**Trả lời:** Đồng ý

### B3. Nội dung không phải chữ (ảnh, audio, bảng) trong phần paste
Paste từ Word/Google Docs có thể kèm bảng, ảnh, định dạng đậm/nghiêng; ảnh paste thẳng thường là base64 chưa lên R2.

**Đề xuất:** AI chỉ "thấy" chữ (bảng gửi dạng text từng ô); ảnh/audio/bảng/định dạng **giữ nguyên chỗ**, không gửi lên AI. Việc upload ảnh base64 lên R2 **không** thuộc req-5.
**Trả lời:** đồng ý chỉ paste text

### B4. 🔴 "Dựa vào instruction" – instruction là gì?
- **(a)** Prompt hệ thống cố định trong code (mô tả các indicator, dạng câu hỏi, ví dụ mẫu).
- **(b)** (a) + ô "Ghi chú cho AI" tuỳ chọn khi bấm nút (vd. "Câu 1–5 là TFNG, câu 6–10 điền tối đa 2 từ").
- **(c)** (a) + gửi kèm **loại đề / module** của section (từ blueprint, vd. "IELTS Reading – Passage 1") để AI đoán dạng câu tốt hơn.
- **(d)** Prompt sửa được trên giao diện (System Admin hoặc tenant).

**Đề xuất:** (a) + (b) + (c); không làm (d) ở req-5 (prompt sửa trên UI khó kiểm soát chất lượng, sửa trong code có review).
**Trả lời:** Đồng ý

### B5. Loại đề / ngôn ngữ ưu tiên + đề mẫu để nghiệm thu
Prompt và chất lượng phụ thuộc mạnh vào loại đề (IELTS, TOEIC, JLPT có furigana…).

**Đề xuất:** anh/chị gửi **3–5 đề thật dạng text** (mỗi loại đề chính 1 bài, có/không có answer key) để làm bộ mẫu nghiệm thu; cho biết loại đề nào ưu tiên. Nếu có tiếng Nhật thì AI **không** tự thêm furigana (ruby).
**Trả lời:** đồng ý

---

## C. Luồng trên giao diện

### C1. 🔴 Phạm vi của một lần bấm: section hiện tại hay cả đề?
Trình soạn đề là **1 editor/section** (tab section). Người dùng có thể paste cả đề (gồm Listening + Reading) vào một tab.

- **(a) Chỉ section đang mở:** AI định dạng nội dung tab hiện tại. Đề nhiều section thì người dùng paste từng phần vào từng tab.
- **(b) AI tự tách thành nhiều section** và tạo tab mới.

**Đề xuất:** (a) – section gắn với module/thời lượng của blueprint, để AI tự tách dễ sai và khó hoàn tác.
**Trả lời:** Đồng ý (a)

### C2. Áp kết quả thế nào?
**Đề xuất:** nút **"Định dạng bằng AI"** trên toolbar editor (cạnh các nút chèn indicator). Bấm → hộp thoại (ô ghi chú B4, cảnh báo nội dung section sẽ bị thay) → chờ (hiện "Lần thử 2/4…", có nút Huỷ) → **thay nội dung editor ngay** (Ctrl+Z hoàn tác được, bản nháp local như hiện tại), **không tự Save** – người dùng xem lại rồi Lưu. Không làm màn hình so sánh trước/sau.
**Trả lời:** Đồng ý

### C3. "Tối đa 3 lần" tính thế nào, và sau khi thất bại thì sao?
- "3 lần" = **1 lần định dạng + 3 lần sửa** (tối đa 4 lần gọi AI), hay **tổng cộng 3 lần gọi**?
- Sau khi vẫn lỗi: đưa vào editor **kết quả có ít lỗi nhất** kèm danh sách lỗi (panel lỗi đang có), hay giữ nguyên nội dung gốc?

**Đề xuất:** 1 + 3 lần sửa; thất bại thì vẫn đưa **kết quả tốt nhất** vào editor (thường đã đúng phần lớn) + thông báo "AI chưa sửa hết N lỗi, vui lòng chỉnh tay" và danh sách lỗi hiện sẵn.
**Trả lời:** 3 lần thử trong lần bấm, sau 3 lần nếu vẫn failed thì hiện lên cảnh báo người dùng nên chỉnh tay, kèm thêm thông báo nhỏ mọi thao tác với AI đều tính vào quota của người dùng. Nút AI không disable vẫn cho người dùng bấm tiếp.

### C4. Đồng bộ hay chạy nền?
4 lần gọi một đề dài có thể mất 1–3 phút. Gọi đồng bộ (một request HTTP chờ kết quả) đơn giản nhất nhưng có thể bị reverse proxy trên VPS cắt (timeout mặc định thường 60 giây).

**Đề xuất:** chạy **nền** – `POST …/ai-format` trả `jobId` ngay, client hỏi trạng thái mỗi 2 giây; job lưu trong bộ nhớ process (không cần bảng DB, mất khi restart cũng chấp nhận được). Anh/chị cho biết nếu muốn đơn giản hoá thành đồng bộ và sẽ tự nâng timeout proxy.
**Trả lời:** Đồng ý chạy nền

---

## D. Quyền, giới hạn & chi phí

### D1. Ai được dùng?
**Đề xuất:** ai **sửa được đề** đó (`assertCanEditExam`: Owner/Admin mọi đề, Teacher đề mình tạo). Đề không còn nháp vẫn dùng được (giống Save). Chỉ tenant đang hoạt động.
**Trả lời:** Đồng ý

### D2. 🔴 Có giới hạn số lần dùng / chi phí không?
Mỗi lần bấm tốn tiền GCP (đề dài + tối đa 4 lần gọi). Lựa chọn:

- **(a) Không giới hạn** ở req-5.
- **(b) Giới hạn theo tenant mỗi ngày** qua env (vd. `AI_FORMAT_DAILY_LIMIT_PER_TENANT=50`), vượt → 429 tiếng Việt.
- **(c) Giới hạn theo gói (plan) của tenant** – cần thêm cột vào gói, trang admin sửa.

**Đề xuất:** (b) + ghi **nhật ký mỗi lần chạy** vào bảng `ai_format_runs` (tenant, người dùng, đề/section, số lần thử, token vào/ra, kết quả, thời gian) để đếm hạn mức và tra chi phí. Không làm dashboard chi phí như LC.
**Trả lời:** Hãy thêm tính năng System Owner/Admin cho phép bật AI cho từng tenant cụ thể, nếu không có thì tenant vẫn soạn thủ công.

### D3. Gửi nội dung đề lên Google
Nội dung đề (có thể là đề bản quyền của trung tâm) sẽ đi qua Vertex AI. Vertex không dùng dữ liệu khách hàng để huấn luyện, nhưng cần anh/chị xác nhận chấp nhận được; và có cần ghi chú điều này trong hộp thoại / `/user-manual` không.

**Đề xuất:** chấp nhận; ghi một dòng trong `/user-manual`, không hiện trong hộp thoại.
**Trả lời:** Đồng ý

---

## E. Phạm vi về sau

### E1. Thiết kế để dùng lại cho bài học
req-5 "tạm thời chưa làm cho bài học hay bài tập".

**Đề xuất:** logic áp thao tác + vòng kiểm/sửa đặt ở module dùng chung (nhận `validateOptions` như `SectionEditor`) để sau chỉ cần nối thêm route cho bài học; nhưng req-5 **không** hiện nút trong trình soạn bài học.
**Trả lời:** Đồng ý
