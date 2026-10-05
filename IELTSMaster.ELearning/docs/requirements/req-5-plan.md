# Requirement 5 – Kế hoạch implement

> Nguồn: [req-5.md](req-5.md) + câu trả lời trong [req-5-question.md](req-5-question.md) và [req-5-question-r2.md](req-5-question-r2.md).
> Tiến độ ghi ở `req-5-progress.md` (tạo khi bắt đầu Step 1).

---

## 1. Quyết định đã chốt

| # | Quyết định | Nguồn |
|---|---|---|
| 1.1 | Kết nối Gemini **giống LC**: `GEMINI_BACKEND=vertex` (service account GCP) hoặc `aistudio` (API key). Biến **không bắt buộc** lúc khởi động; thiếu thì route AI trả **501** | A1, A3, r2-3.1 |
| 1.2 | AI **không viết lại nội dung**: server gửi danh sách block có đánh số, AI trả **danh sách thao tác** JSON theo schema, server áp vào Plate. `GEMINI_MAX_OUTPUT_TOKENS` mặc định **16384**, thinking mức thấp | A2 |
| 1.3 | AI dựng indicator + cấu trúc câu hỏi + **đáp án/giải thích nếu văn bản có**. **Không tự giải đề**: không có đáp án thì để trống | B1 |
| 1.4 | Chỉ lỗi **cấu trúc** (`error`) mới kích hoạt thử lại; lỗi chỉ do **thiếu đáp án** và mọi `warning` thì không | B2 |
| 1.5 | AI chỉ đọc **chữ**; ảnh/audio/bảng/định dạng giữ nguyên chỗ, không gửi lên AI | B3 |
| 1.6 | Instruction = prompt cố định trong code + ô **"Ghi chú cho AI"** + tên **loại đề / module** của section. Không có prompt sửa trên UI | B4 |
| 1.7 | Loại đề ưu tiên: **IELTS**. Đề mẫu để ở `docs/requirements/req-5-samples/` (gitignored), **người dùng gửi sau** | B5, r2-3.2 |
| 1.8 | Một lần bấm = **section đang mở** | C1 |
| 1.9 | Kết quả **thay nội dung editor ngay** (Ctrl+Z hoàn tác được, bản nháp local như cũ), **không tự Save**, không có màn so sánh | C2 |
| 1.10 | **Tổng 3 lần gọi AI** mỗi lần bấm (1 lần định dạng + tối đa 2 lần sửa). Hằng số `AI_FORMAT_MAX_ATTEMPTS = 3` trong code | C3, r2-2.1 |
| 1.11 | Sau 3 lần vẫn lỗi: đưa **kết quả ít lỗi cấu trúc nhất** vào editor + cảnh báo "nên chỉnh tay" + danh sách lỗi. Không áp được thao tác nào thì giữ nguyên nội dung gốc. Nút AI **không** bị disable, bấm tiếp được | C3, r2-2.2 |
| 1.12 | Hộp thoại luôn có dòng nhỏ: mọi thao tác với AI đều tính vào quota | C3 |
| 1.13 | Chạy **nền**: `POST` trả `jobId`, client hỏi trạng thái mỗi 2 giây, có nút Huỷ | C4 |
| 1.14 | Ai **sửa được đề** thì dùng được (`assertCanEditExam`), tenant phải đang hoạt động | D1 |
| 1.15 | System Owner/Admin **bật/tắt AI theo tenant** (mặc định tắt) + chọn hạn mức **100 / 1000 lượt/tháng / Không giới hạn** (mặc định khi bật: Không giới hạn) | D2, r2-1.1, r2-1.3 |
| 1.16 | **1 lần bấm = 1 lượt**, dù gọi AI 1–3 lần. Lần chạy lỗi do hệ thống / huỷ trước khi có lần gọi nào xong thì **không** tính | r2-1.2 |
| 1.17 | Tenant chưa bật AI: **ẩn hẳn** nút. Đã bật nhưng server thiếu cấu hình: nút disable + tooltip "Chưa cấu hình AI". Hết hạn mức: nút vẫn bấm được, hộp thoại báo hết lượt (API 429) | r2-1.3 |
| 1.18 | Chấp nhận gửi nội dung đề lên Google; ghi chú trong `/user-manual`, không hiện trong hộp thoại | D3 |
| 1.19 | Chỉ trình soạn **đề thi**. Logic dùng chung được cho bài học sau này, nhưng req-5 không có nút trong trình soạn bài học | E1 |

---

## 2. Giả định kỹ thuật (bạn xem lại, không đồng ý thì ghi chú)

1. **Chỉ chạy 1 process API** (1 container trên VPS) → job nền giữ trong bộ nhớ (`Map`), xoá sau 15 phút. API restart giữa chừng thì job mất, client báo "Phiên định dạng đã bị gián đoạn, vui lòng thử lại" và lần đó không tính lượt.
2. **Mỗi lần thử trả lại toàn bộ danh sách thao tác trên văn bản gốc** (không vá dần lên kết quả lần trước) → áp lại từ đầu, kết quả xác định, lần sau không cộng dồn lỗi của lần trước.
3. **Quy tắc giữ nguyên chữ:** thao tác chỉ được *chèn indicator*, *đổi loại block* (thành lựa chọn/cặp ghép/dòng đánh số), *xoá một đoạn chữ khớp nguyên văn* (vd. "Answer: B", đáp án in sau câu), *xoá nguyên block* (bảng Answer key cuối đề sau khi đã dùng) và *biến một đoạn khớp nguyên văn thành blank*. Không có thao tác nào thêm chữ mới vào đề, trừ giá trị đáp án/tham số. Thao tác không khớp chữ gốc thì bị bỏ và tính là lỗi để AI sửa ở lần sau.
   *Bổ sung ở Step 5 (đề thật copy từ PDF):* thêm thao tác **tách dòng** `split` (cắt một block tại chữ khớp nguyên văn, nối các phần lại vẫn đúng chữ gốc; các thao tác khác trỏ vào phần bằng chỉ số `i.1`, `i.2`…) và cho `removeBlocks` xoá **phiếu trả lời trống / ô dành cho giám khảo** (không chứa câu hỏi hay hướng dẫn). Xem req-5-progress Step 5.
4. **Fill-blank không có đáp án:** vẫn tạo blank nhưng để rỗng → lỗi thuộc nhóm "thiếu đáp án" (1.4).
5. **Tham số AI tự đặt khi đề không ghi rõ** (người dùng sửa lại được qua badge): Writing Task 1 `maxChars` 1500, Task 2 2500; Speaking Part 1/3 `seconds` 60, Part 2 120. Bạn muốn số khác thì ghi chú.
6. **Phân loại lỗi:** `Issue` của `@lang/exam-core` chưa có mã lỗi → thêm trường `category: 'structure' | 'answer'` (vd. "Chưa tick đáp án nào", "N cặp chưa có đáp án", "N dòng chưa nhập số" là `answer`). Panel lỗi trong editor không đổi hiển thị.
7. **Giới hạn đầu vào** để tránh request quá lớn: tối đa **2.000 block / 150.000 ký tự** mỗi section; vượt thì 400 "Section quá dài, hãy chia nhỏ" (không tính lượt).
8. **Timeout** mỗi lần gọi AI 120 giây; cả job tối đa 6 phút.
9. **Tháng tính quota** theo giờ Việt Nam (`+07:00`), qua helper ngày của `@lang/shared`. Đếm từ bảng `ai_format_runs` (không có cột đếm riêng).
10. Không làm dashboard chi phí như LC. Token vào/ra ghi trong `ai_format_runs` để tra bằng SQL khi cần.
11. SDK `@google/genai` (như LC). Nếu bản mới nhất bị `minimumReleaseAge` chặn thì hạ version range, không thêm ngoại lệ.

---

## 3. Việc bạn cần chuẩn bị

- **Trước Step 3:** điền vào `apps/lang-api/.env`: `GCP_PROJECT_ID` + `GOOGLE_APPLICATION_CREDENTIALS` (file JSON đặt trong `apps/lang-api/secrets/`, đã gitignored) hoặc `GCP_SERVICE_ACCOUNT_JSON_BASE64`; tuỳ chọn `GEMINI_VERTEX_LOCATION` (mặc định `global`). Service account cần role **Vertex AI User**, project bật API `aiplatform.googleapis.com`. Sửa `GEMINI_MAX_OUTPUT_TOKENS=16384`.
- **Trước Step 5:** 3–5 đề **IELTS** dạng `.txt` vào `docs/requirements/req-5-samples/` (Listening, Reading, Writing, Speaking; có và không có answer key).
- **Khi deploy:** thêm các biến trên vào `.env` trên VPS (prod + staging), với `GCP_SERVICE_ACCOUNT_JSON_BASE64` thay cho đường dẫn file.

---

## 4. Thiết kế

### 4.1 Dữ liệu

**`tenants`** (thêm cột):

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `ai_enabled` | `boolean NOT NULL DEFAULT false` | Bật/tắt AI cho tenant |
| `ai_monthly_quota` | `integer NULL` + `CHECK (ai_monthly_quota IN (100, 1000))` | `NULL` = không giới hạn |

`@lang/shared`: `AI_MONTHLY_QUOTA_OPTIONS = [100, 1000] as const` (+ "Không giới hạn" = `null`).

**`ai_format_runs`** (bảng mới, nhật ký + đếm lượt):

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid PK | cũng là `jobId` |
| `tenant_id` | uuid FK `tenants` CASCADE | |
| `user_id` | uuid FK `users` | người bấm |
| `exam_id` | uuid FK `exams` SET NULL | |
| `section_id` | uuid NULL, **không FK** | tab mới chưa lưu thì chưa có dòng `exam_sections` |
| `status` | varchar + `@Check` | `running` · `succeeded` (hết lỗi cấu trúc) · `partial` (còn lỗi sau 3 lần) · `failed` · `cancelled` |
| `attempts` | smallint | số lần gọi AI đã xong |
| `counted` | boolean | tính vào quota hay không (1.16) |
| `prompt_tokens`, `output_tokens` | integer | cộng dồn các lần gọi |
| `issue_count` | integer NULL | số lỗi cấu trúc còn lại |
| `error` | varchar(500) NULL | lỗi hệ thống, không chứa nội dung đề |
| `started_at`, `finished_at` | timestamptz | |

Index `(tenant_id, started_at)`. Lượt đã dùng trong tháng = số dòng `counted = true` **hoặc** `status = running` (chặn bấm song song vượt hạn mức). Kiểm hạn mức và chèn dòng `running` trong transaction **khoá dòng `tenants`**.

### 4.2 Logic thuần ở `@lang/exam-core` (`src/ai-format/`)

- `toAiBlocks(value)` → danh sách `{ index, kind, text }` (paragraph, heading, dòng danh sách, bảng → chữ từng ô; ảnh/audio/video/hr → `[ảnh]`/`[audio]` chỉ để AI biết vị trí). Indicator/blank/pair sẵn có cũng được mô tả để chạy lại trên section đã định dạng một phần.
- Kiểu `AiFormatOp` (union) và `applyAiOps(value, ops)` → `{ value, rejected: OpProblem[] }`:
  - `indicator` – chèn trước block `i`: `kind`, `qtype`, `seconds`/`maxChars`/`maxPicks`/`options`.
  - `choices` – block `i..j` thành danh sách checkbox, `correct: number[]`.
  - `pairs` – block thành `pair`, `answers[]` (TFNG/YNNG chuẩn hoá `TRUE`/`NG`… về `TFNG_OPTIONS`/`YNNG_OPTIONS`).
  - `blank` – trong block `i`, đoạn khớp nguyên văn `match` (lần xuất hiện thứ `n`) thành blank chứa `answer`.
  - `numbered` – block thành dòng đánh số tay (ordering) / trọng số (polytomous).
  - `removeText` – xoá đoạn khớp nguyên văn trong block; `removeBlocks` – xoá block `i..j`.
- `structureErrors(issues)` lọc `severity = error && category = structure`; `pickBest(results)` chọn kết quả ít lỗi cấu trúc nhất.
- Unit test bằng fixture nhỏ tự viết (không dùng đề thật).

### 4.3 lang-api

- `ai/` – `AiModule`: `GcpCredentialsService` + `GeminiService` (chép LC, **bỏ** phần `GcpUsageService`/`labs`), thêm `responseSchema`, `abortSignal`, đọc `usageMetadata`. Lỗi Google đổi thành message tiếng Việt (giữ `toApiError` của LC).
- `ai-format/` – `AiFormatModule`:
  - `ai-format-prompt.ts`: prompt hệ thống (indicator, dạng câu hỏi, quy tắc giữ chữ, quy ước IELTS: TFNG/YNNG, Matching headings, sentence/summary/form completion → fill-blank, "Choose TWO letters" → pick-n `maxPicks: 2`…), prompt sửa lỗi (danh sách lỗi + thao tác bị từ chối kèm số block).
  - `AiFormatService`: kiểm quyền + hạn mức + tạo run → chạy job nền (tối đa 3 lần: gọi AI → `applyAiOps` → `validateSection` → còn lỗi cấu trúc thì gọi tiếp), lưu kết quả vào job, cập nhật run. Huỷ = `AbortController`.
  - `ai-format-run.entity.ts`, DTO, mapper.
- `admin/tenants`: `PATCH :id/ai` (`{ enabled, monthlyQuota }`); `AdminTenantDetail` thêm `ai: { enabled, monthlyQuota, usedThisMonth }`.
- Env (`env.validation.ts`, tất cả tuỳ chọn): `GEMINI_BACKEND` (`vertex`|`aistudio`), `GEMINI_API_KEY`, `GEMINI_MODEL` (mặc định `gemini-3.6-flash`), `GEMINI_MAX_OUTPUT_TOKENS` (mặc định 16384), `GEMINI_VERTEX_LOCATION`, `GCP_PROJECT_ID`, `GCP_SERVICE_ACCOUNT_JSON_BASE64`, `GOOGLE_APPLICATION_CREDENTIALS` → thêm vào `apps/lang-api/.env.example`, `deploy/.env.example`, `deploy/staging/.env.example` (giá trị giả).

### 4.4 lang-app

- `ExamToolbar` thêm nút **"Định dạng bằng AI"**, chỉ hiện khi `SectionEditor` nhận prop `aiFormat` (chỉ `ExamEditor` truyền; `LessonEditor` không truyền → không có nút).
- `components/exam-editor/AiFormatDialog.tsx`: ô ghi chú, cảnh báo nội dung section sẽ bị thay, "Đã dùng X/Y lượt tháng này" (không giới hạn thì "Đã dùng X lượt"), dòng nhỏ về quota (1.12); khi chạy hiện "Lần thử n/3…" + nút Huỷ; xong thì đóng và áp kết quả, kèm thông báo thành công hoặc cảnh báo 1.11.
- Áp kết quả bằng transform thay toàn bộ node **có ghi lịch sử** để Ctrl+Z hoạt động (không dùng `editor.tf.setValue` nếu nó xoá lịch sử – kiểm ở Step 4).
- `lib/ai-format-api.ts` (start/poll/cancel/status); chuỗi `vi.aiFormat`; admin: khối **"Trợ lý AI"** trong `TenantDetailModal` (công tắc + chọn hạn mức + đã dùng tháng này), chuỗi `vi.admin…`.

---

## 5. Phân quyền

| Thao tác | Ai | Lỗi |
|---|---|---|
| Xem trạng thái AI của tenant (bật?, cấu hình?, đã dùng/hạn mức) | `EXAM_AUTHOR_ROLES` (Owner/Admin/Teacher) | – |
| Chạy định dạng AI cho một section | `EXAM_AUTHOR_ROLES` + `assertCanEditExam` (Teacher chỉ đề mình tạo) | tenant chưa bật 403 · thiếu cấu hình 501 · hết lượt 429 · không sửa được đề 403 · đề không thuộc tenant 404 |
| Xem / huỷ job | chỉ **người tạo job**, cùng tenant | người khác 404 |
| Bật/tắt AI, đặt hạn mức | System Owner/Admin (`SYSTEM_MANAGER_ROLES`) | – |

Tenant không ở trạng thái hoạt động → 403 (như các thao tác ghi khác).

---

## 6. Route

### 6.1 Backend (`/api`)

| Method | Route | Ghi chú |
|---|---|---|
| GET | `t/:slug/ai/status` | `{ enabled, configured, used, limit }` |
| POST | `t/:slug/exams/:id/ai-format` | body `{ sectionId?, moduleId?, value, note? }` → `{ jobId }` |
| GET | `t/:slug/exams/:id/ai-format/:jobId` | `{ status, attempt, maxAttempts, result?: { value, issues }, error? }` |
| DELETE | `t/:slug/exams/:id/ai-format/:jobId` | huỷ |
| PATCH | `admin/tenants/:id/ai` | `{ enabled, monthlyQuota: 100 \| 1000 \| null }` |

Mọi route thêm dòng vào `ROUTES` của `access-control.e2e.spec.ts`.

### 6.2 Frontend

Không có trang mới. Đụng: trình soạn đề `/t/{slug}/dashboard/exams/{id}/edit`, modal chi tiết tenant `/admin/tenants`.

---

## 7. Các step

### Step 1 – Logic thuần: block cho AI & áp thao tác (`@lang/exam-core`)
- Thêm `category` vào `Issue` (`validate.ts`) + test.
- `src/ai-format/`: `toAiBlocks`, `AiFormatOp`, `applyAiOps`, `structureErrors`, `pickBest` + unit test (mỗi loại thao tác, thao tác không khớp chữ gốc bị từ chối, chữ gốc không đổi ngoài các đoạn bị xoá/biến thành blank, kết quả qua `validateSectionShape`).
- `.gitignore` thêm `docs/requirements/req-5-samples/`; tạo `req-5-progress.md`; `code-conventions.md` mục 1 trỏ sang req-5.
- **Nghiệm thu:** test pass; dùng 1 đề IELTS mẫu tự viết + danh sách thao tác viết tay → `applyAiOps` ra section không còn lỗi cấu trúc, mở được trong editor (dán JSON qua "Nhập JSON").

### Step 2 – Bật AI theo tenant (DB + admin)
- Migration: 2 cột `tenants` + bảng `ai_format_runs`; entity; `migration:generate` lần 2 báo "No changes".
- `PATCH admin/tenants/:id/ai`, `AdminTenantDetail.ai` (đếm `usedThisMonth`), `@lang/shared` kiểu + `AI_MONTHLY_QUOTA_OPTIONS`; `ROUTES`.
- UI khối **"Trợ lý AI"** trong `TenantDetailModal`.
- **Nghiệm thu:** System Admin bật/tắt, đổi hạn mức 100 / 1000 / Không giới hạn; Tenant Owner gọi `PATCH` → 403; F5 giữ nguyên.

### Step 3 – Kết nối Gemini & API định dạng
- `AiModule` (credentials + `GeminiService`), env (mục 4.3) + 3 file `.env.example`, thêm `@google/genai`.
- `AiFormatModule`: prompt, job nền, vòng thử 3 lần, hạn mức (khoá dòng tenant), ghi `ai_format_runs`, huỷ, giới hạn đầu vào; 4 route tenant + `ROUTES`.
- Unit test service với **Gemini giả** (trả thao tác cố định / lỗi / JSON hỏng): đủ 3 lần, dừng sớm khi hết lỗi cấu trúc, chỉ lỗi thiếu đáp án thì không thử lại, chọn kết quả tốt nhất, đếm lượt đúng 1.16, 403/429/501, người khác xem job → 404.
- **Nghiệm thu:** gọi thật bằng curl với credentials thật trên 1 section mẫu nhỏ → nhận job, poll ra `value` hợp lệ; thiếu biến GCP → 501 và API vẫn khởi động.

### Step 4 – Nút AI trong trình soạn đề
- `ExamToolbar` + `AiFormatDialog` + `lib/ai-format-api.ts` + `vi.aiFormat`; ẩn/disable theo 1.17; áp kết quả có Ctrl+Z; hiện cảnh báo 1.11 và mở `IssuePanel`.
- **Nghiệm thu (chạy thật):** paste một đề → bấm → thấy "Lần thử n/3" → nội dung được định dạng, chưa Save, Ctrl+Z quay về bản paste; Huỷ giữa chừng không đổi nội dung và không tính lượt; tenant chưa bật không thấy nút; trình soạn bài học không có nút; kiểm cả 3 theme.

### Step 5 – Tinh chỉnh với đề IELTS thật, tài liệu & khép lại
- Chạy 3–5 đề trong `req-5-samples/`, chỉnh prompt đến khi đa số qua được trong ≤ 3 lần; ghi tỉ lệ thành công + token trung bình vào progress.
- `/user-manual`: `06-de-thi.json` (dùng nút AI, quota, giới hạn, nội dung gửi lên Google), `04-quan-tri-he-thong.json` (bật AI cho tenant), `09-van-hanh.json` (biến env GCP/Gemini, không ghi giá trị) + `updatedAt`.
- `docs/setup/deploy.md` + `deploy-staging.md`: thêm biến env; `module-notes.md`: `ai/`, `ai-format/`, `exam-core/ai-format`; `req-5-acceptance.md`.
- **Nghiệm thu:** theo `req-5-acceptance.md` cho System Admin, Owner, Teacher.

Mỗi step kết thúc: `pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm format:check` pass, chạy thử thật, rồi cập nhật `req-5-progress.md`.

---

## 8. Ngoài phạm vi req-5

- Nút AI trong trình soạn **bài học** / bài tập (logic đã dùng chung được, chỉ cần nối route + nút).
- AI tự tách cả đề thành nhiều section (C1 b); AI tự giải đề khi không có đáp án.
- Upload ảnh base64 trong phần paste lên R2; OCR từ ảnh/PDF.
- Hạn mức theo từng người dùng, hạn mức gắn với gói (plan); dashboard chi phí GCP như LC.
- Prompt sửa được trên giao diện.
