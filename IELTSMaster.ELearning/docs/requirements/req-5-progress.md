# Requirement 5 – Tiến độ

> **Phiên chat mới:** đọc [CLAUDE.md](../../CLAUDE.md) → file này → phần liên quan của [req-5-plan.md](req-5-plan.md).
> Sau mỗi step: cập nhật bảng trạng thái + thêm mục nhật ký bên dưới + **prompt cho step kế tiếp** (cuối mục nhật ký của step vừa xong).
>
> Trạng thái: ✅ Xong · 🟡 Đang làm · ⬜ Chưa làm · ⛔ Bị chặn

## Bảng trạng thái

| Step | Nội dung | Trạng thái | Ngày xong | Ghi chú |
|---|---|---|---|---|
| 0 | Câu hỏi (2 round) + plan | ✅ | 2026-10-01 | Hạn mức chốt qua câu hỏi trực tiếp: 100 / 1000 / Không giới hạn mỗi tháng theo tenant |
| 1 | Logic thuần `@lang/exam-core` `ai-format/` + `Issue.category` | ✅ | 2026-10-01 | Chưa gọi AI; thao tác viết tay cho đề IELTS mẫu ra section 7 câu, 0 lỗi |
| 2 | Bật AI theo tenant: migration, `PATCH admin/tenants/:id/ai`, khối "Trợ lý AI" ở admin | ✅ | 2026-10-01 | UI chưa bấm thử trên trình duyệt (không có công cụ) – đã render bằng esbuild |
| 3 | Kết nối Gemini + API định dạng chạy nền | ✅ | 2026-10-01 | Gọi Gemini thật (Vertex): đề IELTS mẫu 22 block → 7 câu, 0 lỗi ở lần 1, ~5 giây |
| 4 | Nút "Định dạng bằng AI" trong trình soạn đề | ✅ | 2026-10-01 | Chạy thật bằng Chrome headless: đề IELTS gõ tay 30 block → 37 block, 4 câu, 0 lỗi ở lần 1; Ctrl+Z về bản gõ |
| 5 | Tinh chỉnh prompt với đề IELTS thật, tài liệu, nghiệm thu | ✅ | 2026-10-01 | 1 đề thật (Reading/Listening/Writing) + 3 biến thể: 10/10 lượt qua API `succeeded`, 8/10 ở lần 1; thêm thao tác `split`. **req-5 xong** |

## Nhật ký

### Step 0 – Câu hỏi & plan (2026-10-01)

- Round 1 ([req-5-question.md](req-5-question.md)): 16 câu; chặn: A1 (xác thực), A2 (2048 token quá nhỏ → AI trả thao tác thay vì viết lại đề), B1, B4, C1, D2.
- Round 2 ([req-5-question-r2.md](req-5-question-r2.md)): mâu thuẫn quota (C3 nói "quota người dùng", D2 chỉ bật/tắt) → chốt hạn mức theo tenant 100 / 1000 / Không giới hạn; "3 lần thử" = **tổng 3 lần gọi AI**.
- Hiện trạng `.env`: mới có 4 biến `GEMINI_*`; chế độ `vertex` giống LC cần thêm `GCP_PROJECT_ID` + service account (plan mục 3).

### Step 1 – Logic thuần ở `@lang/exam-core` (2026-10-01)

**Đã làm**

- `validate.ts`: `Issue.category: 'structure' | 'answer'` (bắt buộc). Nhóm `answer` = "Chưa tick đáp án nào.", "N cặp chưa có đáp án.", "N dòng chưa nhập số."; còn lại `structure`. Thêm `structureErrors(issues)`. Không đổi hiển thị `IssuePanel`, không đổi luật publish. `section-content.ts` của lang-api chỉ chép các trường cũ sang `ExamContentIssue` nên không ảnh hưởng.
- `src/ai-format/` (export qua `index.ts`):
  - `ops.ts` – kiểu `AiFormatOp` (7 thao tác: `indicator`, `choices`, `pairs`, `numbered`, `blank`, `removeText`, `removeBlocks`), `parseAiOps` (nhận `{ ops }` hoặc mảng; bỏ trường `null`; thao tác sai dạng → `AiOpProblem` kèm vị trí), hằng số `AI_FORMAT_MAX_ATTEMPTS = 3`, `AI_FORMAT_MAX_BLOCKS = 2000`, `AI_FORMAT_MAX_CHARS = 150000`.
  - `blocks.ts` – `toAiBlocks` / `formatAiBlocks` (dòng `[i] tag (note): "chữ"`, chữ dạng chuỗi JSON để AI chép nguyên văn; bảng → các ô nối ` | `; ảnh/audio chỉ hiện loại), `aiInputProblem` (rỗng / quá lớn), `AI_LOCKED_TYPES` (media), `AI_NON_LINE_TYPES`.
  - `text-range.ts` – tìm đoạn khớp nguyên văn trong "container" (element có con là text: paragraph, paragraph trong ô bảng), thử lại với chuẩn hoá 1-1 ký tự (khoảng trắng không ngắt, nháy cong, gạch dài); đoạn chồng lên inline có sẵn (blank/link/furigana) bị từ chối; sửa giữ mark của chữ hai bên, blank luôn có text hai bên.
  - `apply.ts` – `applyAiOps(value, parsed, { createId })`: mọi chỉ số tính trên **nội dung gốc**; một block chỉ một thao tác đổi loại/xoá; sửa chữ rồi đổi loại cùng block được; media không đổi loại/xoá; thao tác sai bị bỏ **cả thao tác**. Trả `origins` (id indicator → thao tác/block gốc) để mô tả lỗi cho AI. Đáp án cặp ghép do AI tạo đưa về đúng chữ option (`TRUE`/`ng` → `True`/`Not Given`, matching không phân biệt hoa thường).
  - `attempt.ts` – `needsRetry`, `pickBestAttempt` (ít lỗi cấu trúc nhất → ít thao tác bị bỏ nhất → lần sau; bỏ lần không áp được gì), `describeAttemptForAi` (dòng phản hồi tiếng Việt gắn số thao tác/block).
- Test: `ops.spec.ts`, `blocks.spec.ts`, `apply.spec.ts`, `attempt.spec.ts` (+30 test, exam-core 91 test). Ca đầu-cuối: đề IELTS Reading tự viết (TFNG, fill-blank có dấu `……….`, MC, pick-n, answer key cuối đề) + thao tác viết tay → `validateSection` rỗng; chữ gốc giữ nguyên trừ đoạn thành blank và answer key; bỏ hết đáp án thì chỉ còn lỗi nhóm `answer`.
- `.gitignore`: `docs/requirements/req-5-samples/`. `code-conventions.md` mục 1 trỏ sang req-5; `module-notes.md` thêm mục `ai-format`.

**Nghiệm thu**

- 5 lệnh pass (build, lint, typecheck, test – shared 142, exam-core 91, lang-api 348 – format:check).
- Chạy đề mẫu qua **bản build** (`dist/index.cjs`): `isExamValue` đúng, 0 thao tác bị bỏ, `validateSection` 0 vấn đề, `buildPlan` ra 7 câu (1–7). File kết quả: `docs/requirements/req-5-samples/step1-ielts-formatted.json` (gitignored).
- **Chưa** nhập thử trong editor trên trình duyệt (máy chưa chạy dev server, phiên này không điều khiển trình duyệt). Anh/chị có thể kiểm: mở trình soạn đề → **Nhập JSON** → chọn file trên → thấy 1 Part, 4 Subpart, 4 câu hỏi (TFNG 3 cặp, blank "Lane", MC tick B, pick-n tick A + C), bảng kiểm tra không còn lỗi. Step 4 sẽ chạy thật đường này.

**Sai khác so với plan**

- Thêm `needsRetry`: ngoài lỗi cấu trúc, lần thử có **thao tác bị bỏ** cũng thử lại (thao tác bị bỏ thường là AI chép sai chữ → mất một câu hỏi mà validate không biết).
- `pickBest` → `pickBestAttempt` xét thêm số thao tác bị bỏ khi bằng số lỗi cấu trúc.
- Blank **rỗng** (fill-blank không có đáp án): `validateExam` hiện không báo lỗi gì → không ảnh hưởng vòng thử. Chưa thêm luật "blank chưa có đáp án" vì sẽ đổi luật publish của đề đã có – để hỏi nếu cần.

**Lưu ý cho step sau**

- Gemini `responseSchema` phải khớp `AiFormatOp`; `parseAiOps` đã chịu được trường `null` và `occurrence` thiếu. Nếu schema discriminated union (`anyOf`) không chạy với model, dùng object phẳng có trường tuỳ chọn – `parseAiOps` vẫn nhận được vì phân loại theo `op`.
- Prompt cần nói rõ: chỉ số theo `[i]`, `before = số block` để chèn ở cuối, chữ trong `match` phải chép nguyên văn từ chuỗi JSON, không gộp nhiều ô bảng.

**Prompt cho Step 2**

```text
Làm req-5 Step 2 – Bật AI theo tenant (DB + admin). Đọc docs/requirements/req-5-progress.md rồi req-5-plan.md mục 1.15–1.17, 4.1, 5, 6.1, 7 (Step 2).
Việc cần làm:
1. Migration: thêm `tenants.ai_enabled boolean NOT NULL DEFAULT false`, `tenants.ai_monthly_quota integer NULL` + CHECK (IN (100, 1000)); bảng `ai_format_runs` theo plan 4.1 (status varchar + @Check dùng sqlInList, index (tenant_id, started_at)). migration:generate → đọc lại → migrate → generate lần 2 báo "No changes".
2. @lang/shared: `AI_MONTHLY_QUOTA_OPTIONS = [100, 1000] as const`, kiểu `AiFormatRunStatus` (object as const), kiểu `TenantAiSettings { enabled, monthlyQuota, usedThisMonth }`.
3. lang-api: `PATCH admin/tenants/:id/ai` (SYSTEM_MANAGER_ROLES, DTO `{ enabled, monthlyQuota: 100 | 1000 | null }`), `AdminTenantDetail.ai` với `usedThisMonth` = số run `counted = true` hoặc `status = running` trong tháng hiện tại theo giờ VN (helper ngày của @lang/shared). Hàm đếm lượt đặt ở chỗ Step 3 dùng lại được. Thêm dòng ROUTES trong access-control.e2e.spec.ts; unit test service (in-memory repository).
4. lang-app: khối "Trợ lý AI" trong TenantDetailModal (công tắc + chọn 100 / 1000 / Không giới hạn + "Đã dùng X lượt tháng này"), chuỗi trong vi.ts, màu qua token.
5. Nghiệm thu chạy thật: System Admin bật/tắt + đổi hạn mức, F5 giữ nguyên; Tenant Owner gọi PATCH → 403; kiểm 3 theme. Chạy đủ 5 lệnh, cập nhật req-5-progress.md (nhật ký + prompt cho Step 3), module-notes.md. Không commit.
```

### Step 2 – Bật AI theo tenant (2026-10-01)

**Đã làm**

- Migration `1790838260071-AiFormat`: `tenants.ai_enabled` (`boolean NOT NULL DEFAULT false`), `tenants.ai_monthly_quota` (`integer NULL`, `CHK_tenants_ai_monthly_quota IN (100, 1000)`); bảng `ai_format_runs` đủ cột plan 4.1 (`CHK_ai_format_runs_status`, index `(tenant_id, started_at)`, thêm index `user_id`/`exam_id` cho FK). Đã đọc lại, `migrate` xong, `migration:generate` lần 2 báo "No changes".
- `@lang/shared`: `ai-format.ts` (`AI_MONTHLY_QUOTA_OPTIONS`, `AiMonthlyQuota`, `isAiMonthlyQuota`, `AiFormatRunStatus`, `TenantAiSettings`); `admin.ts` thêm `AdminTenantDetail extends AdminTenant { ai }`; `schedule.ts` thêm `trainingMonthStartOf` (00:00 ngày 1 theo giờ VN, + test).
- lang-api:
  - `ai-format/ai-format-run.entity.ts` (`AiFormatRun`) và `ai-format/ai-usage.ts` – `countAiUsage(repo, tenantId, now?)` = lượt `counted = true` **hoặc** `status = running` từ `trainingMonthStartOf(now)`. Step 3 gọi với `manager.getRepository(AiFormatRun)` sau khi khoá dòng tenant.
  - `PATCH admin/tenants/:id/ai` (`UpdateTenantAiDto`: `enabled` boolean, `monthlyQuota` 100 | 1000 | `null`, thiếu trường → 400) → `AdminTenantsService.updateAi` (tenant xoá mềm/không có → 404). Tắt AI **giữ** hạn mức đã chọn.
  - `GET admin/tenants/:id` và mọi thao tác trên một tenant trả `AdminTenantDetail` (có `ai`); **danh sách** vẫn `AdminTenant` (không đếm lượt cho từng dòng).
  - `ROUTES` thêm `PATCH /admin/tenants/:id/ai`. `InMemoryRepository.countBy` nhận mảng điều kiện (OR) như TypeORM. Unit test: `updateAi`, `countAiUsage` (ranh giới tháng giờ VN, bỏ lượt huỷ/lỗi, tenant khác).
- lang-app: `TenantAiSection` (khối **Trợ lý AI** trong `TenantDetailModal`): công tắc `role="switch"`, ô **Hạn mức mỗi tháng** (100 / 1.000 lượt / Không giới hạn, chỉ đổi được khi đang bật), dòng "Đã dùng X (/ Y) lượt tháng này"; đổi là lưu ngay. Modal tải `GET admin/tenants/:id` khi mở để lấy `ai`. Chuỗi `vi.admin.tenants.ai`, màu qua token (`--sidebar`, `--border`, `--accent-bg`, `--border-strong`, `--shadow-2`).
- Sửa luôn warning lint còn sót của Step 1 (`apply.spec.ts` import `question` không dùng).

**Nghiệm thu**

- 5 lệnh pass (shared 143, exam-core 91, lang-api 350 test).
- API chạy thật (dev :3101, script ký JWT): bật/không giới hạn → 100 → 1000 → tắt (giữ 1000), đọc lại vẫn đúng (tương đương F5); 400 khi quota 500 / thiếu `monthlyQuota` / `enabled` sai kiểu; 404 tenant không có; chèn thử 4 run → `usedThisMonth = 2` (succeeded+counted, running; bỏ cancelled và run 40 ngày trước); CHECK DB chặn `ai_monthly_quota = 500`; Teacher → 403; chưa đăng nhập → 401; **Tenant Owner thật** (đăng ký user + trung tâm mới qua API vì 2 trung tâm dev đều do System Owner sở hữu) → 403 cả trên trung tâm của mình. Đã xoá user/trung tâm thử, `step4-test` trả về tắt AI.
- UI: `/admin/tenants` biên dịch, trả 200; `TenantAiSection` render đúng 4 trạng thái (đang tải, tắt, bật 37/100, bật không giới hạn 1.234). Token dùng có ở cả 3 theme (`--accent-bg` chung). **Chưa bấm thử trên trình duyệt** – anh/chị kiểm: `/admin/tenants` → mở một trung tâm → khối **Trợ lý AI** → bật, đổi hạn mức, F5 rồi mở lại; đổi 3 theme.

**Sai khác so với plan**

- `ai_format_runs.user_id` **nullable, `ON DELETE SET NULL`** (plan ghi FK không nói null): xoá hẳn tài khoản không làm mất lượt đã tính vào hạn mức.
- `AdminTenantDetail` là kiểu riêng; danh sách tenant không có `ai`.
- `/user-manual` (`04-quan-tri-he-thong.json`) để Step 5 như plan – nút AI phía tenant chưa có nên chưa mô tả.

**Lưu ý cho Step 3**

- Kiểm hạn mức: transaction → khoá dòng `tenants` (`pessimistic_write`) → `aiEnabled` (403) → `countAiUsage(manager.getRepository(AiFormatRun), tenantId) >= aiMonthlyQuota` (429, `null` bỏ qua) → chèn run `running` (`counted = false`, khi xong đặt `counted` theo 1.16).
- `AdminModule` đang `TypeOrmModule.forFeature([.., AiFormatRun])`; `AiFormatModule` mới tự khai báo lại entity.
- `GET t/:slug/ai/status` dùng lại `countAiUsage` cho `used`, `limit = tenant.aiMonthlyQuota`.

**Prompt cho Step 3**

```text
Làm req-5 Step 3 – Kết nối Gemini & API định dạng. Đọc docs/requirements/req-5-progress.md (Step 1–2, "Lưu ý cho Step 3") rồi req-5-plan.md mục 1, 2, 3, 4.3, 5, 6.1, 7 (Step 3). Trước khi gọi thật, kiểm `apps/lang-api/.env` đã có credentials GCP (plan mục 3) – chưa có thì làm phần code + test với Gemini giả và báo tôi.
Việc cần làm:
1. `AiModule` (`ai/`): chép `GcpCredentialsService` + `GeminiService` từ LC (/Users/vunguyen/Projects/lightc-general), bỏ GcpUsageService/labs; thêm `responseSchema`, `abortSignal`, đọc `usageMetadata`; lỗi Google → message tiếng Việt. Thêm `@google/genai` (bị minimumReleaseAge chặn thì hạ version). Env tuỳ chọn (plan 4.3) vào `env.validation.ts` + `apps/lang-api/.env.example`, `deploy/.env.example`, `deploy/staging/.env.example`; thiếu cấu hình → route AI 501, API vẫn khởi động.
2. `AiFormatModule` (`ai-format/`, đã có `AiFormatRun` + `countAiUsage`): `ai-format-prompt.ts` (prompt hệ thống + prompt sửa lỗi từ `describeAttemptForAi`), `AiFormatService` (quyền `assertCanEditExam`, tenant active, kiểm hạn mức trong transaction khoá dòng tenant → 429, giới hạn đầu vào `aiInputProblem` → 400 không tính lượt, job nền trong Map xoá sau 15 phút, tối đa `AI_FORMAT_MAX_ATTEMPTS` lần: gọi AI → `parseAiOps` → `applyAiOps` → `validateSection` → `needsRetry`, chọn `pickBestAttempt`; timeout 120 s/lần, 6 phút/job; huỷ bằng AbortController; cập nhật run: status, attempts, counted theo 1.16, token, issue_count, error).
3. 4 route: `GET t/:slug/ai/status`, `POST t/:slug/exams/:id/ai-format`, `GET|DELETE t/:slug/exams/:id/ai-format/:jobId` (chỉ người tạo job, người khác 404) + dòng `ROUTES`; kiểu ở `@lang/shared`.
4. Unit test với Gemini giả: đủ 3 lần, dừng sớm khi hết lỗi cấu trúc, chỉ lỗi thiếu đáp án không thử lại, chọn kết quả tốt nhất, đếm lượt đúng 1.16 (lỗi hệ thống/huỷ trước lần gọi đầu xong không tính), 403/429/501/400, người khác xem job → 404.
5. Nghiệm thu: thiếu biến GCP → 501 và API khởi động; có credentials → curl 1 section mẫu nhỏ, poll ra `value` hợp lệ. Chạy đủ 5 lệnh, cập nhật req-5-progress.md (nhật ký + prompt Step 4), module-notes.md. Không commit.
```

### Step 3 – Kết nối Gemini & API định dạng (2026-10-01)

**Đã làm**

- `@google/genai` ^2.24.0 (không bị `minimumReleaseAge` chặn). `allowBuilds`: `@google/genai` (preinstall chỉ echo) và `protobufjs` (postinstall chỉ in cảnh báo) đặt `false`. SDK là **ESM**: lang-api build CJS (`module: Node16`) nên chỉ `import type … with { 'resolution-mode': 'import' }`, còn `GoogleGenAI` nạp bằng `await import('@google/genai')` lúc gọi lần đầu; enum `Type`/`ThinkingLevel` viết bằng chuỗi.
- Env (tất cả tuỳ chọn) trong `env.validation.ts` + test: `GEMINI_BACKEND` (`vertex`|`aistudio`, sai → dừng khởi động), `GEMINI_API_KEY`, `GEMINI_MODEL` (mặc định `gemini-3.6-flash`), `GEMINI_MAX_OUTPUT_TOKENS` (16384), `GEMINI_VERTEX_LOCATION` (`global`), `GCP_PROJECT_ID`, `GCP_SERVICE_ACCOUNT_JSON_BASE64`, `GOOGLE_APPLICATION_CREDENTIALS`; để trống = chưa đặt. Thêm vào `apps/lang-api/.env.example`, `deploy/.env.example`, `deploy/staging/.env.example`.
- `ai/` – `AiModule`: `GcpCredentialsService` (chép LC; base64 ưu tiên, rồi **đọc luôn file** ở `GOOGLE_APPLICATION_CREDENTIALS` lúc khởi động, `project_id` trong JSON thay được `GCP_PROJECT_ID`) + `GeminiService` (bỏ phần chi phí/labs; `responseSchema`, `abortSignal`, `temperature: 0`, thinking `LOW`, token ra = `candidates + thoughts`, `finishReason`). Thiếu cấu hình → `assertConfigured` ném **501** "Máy chủ chưa cấu hình AI (Gemini)". Lỗi Google → `GeminiError` message tiếng Việt **không kèm chi tiết** (chi tiết chỉ ghi log).
- `ai-format/`:
  - `ai-format-prompt.ts`: prompt hệ thống tiếng Anh (định dạng block, 4 loại indicator, 11 qtype kèm quy ước IELTS, quy tắc đáp án/không tự giải, quy tắc chép nguyên văn, danh sách thao tác), `buildAiFormatPrompt` (loại đề + module + ghi chú + block), `buildAiRetryPrompt` (dòng `describeAttemptForAi`, yêu cầu trả **toàn bộ** danh sách), `AI_FORMAT_RESPONSE_SCHEMA` (object phẳng, trường nullable).
  - `ai-format-attempt.ts`: `evaluateAiAttempt` (JSON hỏng/bị cắt → không áp được, có phản hồi riêng; `parseAiOps` → `applyAiOps` trên nội dung gốc → `validateSection`), `shouldRetryAiAttempt` = `needsRetry` **hoặc** không áp được thao tác nào.
  - `AiFormatService`: `start` trong transaction khoá dòng tenant, thứ tự lỗi: đề 404 → `assertCanEditExam` 403 → tenant không active / chưa bật AI 403 → 501 → nội dung sai / `aiInputProblem` 400 → hạn mức 429 → chèn run `running`. Job nền trong `Map` (xoá 15 phút sau khi xong), vòng thử hội thoại nhiều lượt (user → model → phản hồi lỗi), timeout 120 s/lần (`AbortSignal.timeout`) + 6 phút/job, huỷ bằng `AbortController`. Chốt: huỷ → `cancelled`; chưa lần gọi nào xong → `failed`; còn lại `pickBestAttempt` → `succeeded` (0 lỗi cấu trúc) / `partial`; không lần nào áp được → `partial`, `changed: false`, giữ nội dung gốc. Run: `attempts` = số lần gọi xong, `counted = attempts > 0` (1.16), token cộng dồn, `issue_count`, `error` (≤ 500 ký tự). `onApplicationBootstrap` chốt run còn `running` thành `failed` không tính lượt (giả định 1).
  - `AiFormatController` (`t/:slug`, `EXAM_AUTHOR_ROLES`): `GET ai/status`, `POST exams/:id/ai-format`, `GET|DELETE exams/:id/ai-format/:jobId` (job của người khác / đề khác / tenant khác → 404). 4 dòng `ROUTES`.
- `@lang/shared` `ai-format.ts`: `AiStatus`, `AiFormatInput`, `AiFormatStarted`, `AiFormatJob`, `AiFormatResult` (`value`, `changed`, `issues`, `skippedOps`), `AiFormatIssue`, `AI_FORMAT_NOTE_MAX_LENGTH` (2000).
- Test: `ai-format.service.spec.ts` (18 test, Gemini giả: 1 lần hết lỗi, chỉ thiếu đáp án không thử lại, dừng sớm ở lần 2 + nội dung phản hồi, đủ 3 lần chọn lần ít lỗi nhất, không áp được gì, thao tác bị bỏ thì thử lại, lỗi hệ thống lần 1/lần 2, huỷ ở lần 1/lần 2, khởi động lại, 403/404/501/400/429, người khác xem job 404, status), `gemini.service.spec.ts` (cấu hình + phân loại lỗi), `env.validation.spec.ts`.

**Nghiệm thu**

- 5 lệnh pass (shared 143, exam-core 91, lang-api 373 test).
- Chạy bản build ở cổng 3105 (dev server :3101 của anh/chị để nguyên), token ký bằng script, trung tâm `step4-test`:
  - **Không biến GCP/Gemini**: API khởi động (chỉ log cảnh báo), `GET ai/status` → `configured: false`; `POST ai-format` → 501; Teacher không phải người tạo đề → 403; Học viên → 403.
  - **Có credentials** (Vertex, `gemini-3.6-flash`): đề IELTS Reading mẫu 22 block (TFNG 3 câu, điền 1 từ, MC, Choose TWO, answer key cuối đề) → `succeeded` ở **lần 1** sau ~5 giây, 2.733 token vào / 253 token ra. `value`: `validateSectionShape` rỗng, `validateSection` 0 vấn đề, `buildPlan` 1–7; TFNG True/False/Not Given, blank "Lane", MC tick B, pick-n `maxPicks=2` tick A + C, answer key đã xoá.
  - Huỷ ngay sau khi bắt đầu → `cancelled`, run `attempts 0`, `counted false`; người soạn đề xem job của Owner → 404; job đã xong vẫn đọc được; `ai/status` `used: 1`.
- Sau khi thử: `step4-test` trả về **tắt AI**; 2 dòng `ai_format_runs` thử (1 succeeded, 1 cancelled) để lại làm nhật ký.

**Sai khác so với plan**

- `apps/lang-api/.env` (gitignored) **thêm** `GOOGLE_APPLICATION_CREDENTIALS=secrets/gcp-service-account.json` – file đã có sẵn nhưng chưa có biến trỏ tới. Credentials đọc từ file **trong code** (không để SDK tự đọc qua `process.env`), đường dẫn tương đối tính từ thư mục chạy API.
- Message lỗi Google không kèm chi tiết (LC có "Chi tiết: …") vì job trả lỗi cho giáo viên; chi tiết nằm ở log server.
- Thêm điều kiện thử lại khi AI trả **0 thao tác** / JSON hỏng (không chỉ lỗi cấu trúc). Hệ quả: chạy lại trên section đã định dạng xong mà AI trả rỗng sẽ tốn đủ 3 lần gọi – xem lại ở Step 5 nếu gặp.
- Kết quả có thêm `changed` và `skippedOps` (để Step 4 hiện cảnh báo 1.11).
- Lỗi khi gọi AI ở lần 2/3 (sau khi lần 1 đã xong): dùng kết quả tốt nhất đã có, tính lượt, `error` của run ghi lý do; `job.error` để trống.

**Lưu ý cho Step 4**

- Client: `POST` → `{ jobId }` → poll `GET` mỗi 2 giây tới khi `status !== 'running'`; `attempt`/`maxAttempts` cho dòng "Lần thử n/3". Poll gặp **404** = job mất (API khởi động lại / quá 15 phút) → "Phiên định dạng đã bị gián đoạn, vui lòng thử lại". `DELETE` trả trạng thái cuối (chờ job dừng hẳn).
- `succeeded` → áp `result.value`; `partial` + `changed` → áp + cảnh báo "nên chỉnh tay" + mở `IssuePanel`; `partial` + `!changed` → giữ nguyên, báo AI không định dạng được; `failed` → hiện `error`; `cancelled` → không làm gì.
- Body: `value` = nội dung Plate của section đang mở (chưa lưu cũng được), `sectionId` (nếu đã lưu), `moduleId` (module của tab), `note`. Body JSON giới hạn 2 MB (`main.ts`).
- Lỗi đồng bộ khi bấm: 403 (chưa bật / không sửa được đề), 501, 400 (section quá dài/rỗng – message từ `aiInputProblem`), 429 (hết lượt – message có hạn mức).
- **Deploy**: thêm các biến Gemini/GCP vào `.env` trên VPS (prod + staging) với `GCP_SERVICE_ACCOUNT_JSON_BASE64` (plan mục 3); `deploy.md`/`deploy-staging.md` + `/user-manual` cập nhật ở Step 5.

**Prompt cho Step 4**

```text
Làm req-5 Step 4 – Nút "Định dạng bằng AI" trong trình soạn đề. Đọc docs/requirements/req-5-progress.md (Step 3, "Lưu ý cho Step 4") rồi req-5-plan.md mục 1.8–1.13, 1.17, 1.19, 4.4, 7 (Step 4).
Việc cần làm:
1. `lib/ai-format-api.ts` (status/start/poll/cancel, kiểu `AiStatus`/`AiFormatJob` của @lang/shared), chuỗi `vi.aiFormat`.
2. `ExamToolbar` thêm nút "Định dạng bằng AI", chỉ khi `SectionEditor` nhận prop `aiFormat` (chỉ `ExamEditor` truyền, `LessonEditor` không). Theo 1.17: tenant chưa bật → ẩn; chưa cấu hình → disable + tooltip "Chưa cấu hình AI"; hết hạn mức vẫn bấm được.
3. `components/exam-editor/AiFormatDialog.tsx`: ô "Ghi chú cho AI", cảnh báo nội dung section sẽ bị thay, "Đã dùng X/Y lượt tháng này" (không giới hạn: "Đã dùng X lượt"), dòng nhỏ 1.12; khi chạy "Lần thử n/3…" + nút Huỷ (gọi DELETE); poll 2 giây; 404 khi poll → báo phiên bị gián đoạn. Xong: áp `result.value` vào editor bằng transform **có lịch sử** (Ctrl+Z quay lại bản trước; kiểm `editor.tf.setValue` có xoá history không), không tự Save; `partial` → cảnh báo 1.11 + mở IssuePanel; `changed=false` → giữ nguyên + báo.
4. Nghiệm thu chạy thật (bật AI cho `step4-test` qua /admin): paste đề → bấm → "Lần thử n/3" → nội dung định dạng, chưa Save, Ctrl+Z về bản paste; Huỷ giữa chừng không đổi nội dung và không tính lượt; tenant chưa bật không thấy nút; trình soạn bài học không có nút; 3 theme. Chạy đủ 5 lệnh, cập nhật req-5-progress.md (nhật ký + prompt Step 5), module-notes.md. Không commit.
```

### Step 4 – Nút "Định dạng bằng AI" trong trình soạn đề (2026-10-01)

**Đã làm**

- `lib/ai-format-api.ts`: `getAiStatus`, `startAiFormat`, `getAiFormatJob`, `cancelAiFormat` (kiểu `AiStatus`/`AiFormatInput`/`AiFormatJob` của `@lang/shared`). Chuỗi `vi.aiFormat`.
- `ExamEditor` tải `GET ai/status` một lần khi mở (đề sửa được); `enabled` thì truyền `aiFormat` (`examId`, tên + `moduleId` của tab, `configured`) cho từng `SectionEditor`. Lỗi tải trạng thái = coi như chưa bật (không có nút). `LessonEditor` không truyền → không có nút.
- `ExamToolbar`: prop `aiFormat?: { configured, onOpen }` → nút **Định dạng bằng AI** (icon + chữ, cuối thanh công cụ). Chưa cấu hình → disable, tooltip "Chưa cấu hình AI" đặt ở `<span>` bọc ngoài (nút disable không nhận sự kiện chuột). Hết hạn mức vẫn bấm được.
- `components/exam-editor/AiFormatDialog.tsx`: tải lại `ai/status` khi mở (dòng "Đã dùng X/Y lượt tháng này", đỏ khi đã hết; không giới hạn "Đã dùng X lượt tháng này"), cảnh báo nội dung section bị thay, ô **Ghi chú cho AI** (`AI_FORMAT_NOTE_MAX_LENGTH`), dòng nhỏ 1.12. Bấm **Định dạng** → `POST` → poll 2 giây → "Lần thử n/3…" + nút **Hủy** (`DELETE`; X/Esc lúc đang chạy cũng là huỷ). Lỗi lúc bắt đầu (403/501/400/429) và job `failed` hiện **trong hộp thoại**, bấm lại được; poll **404** → "Phiên định dạng đã bị gián đoạn, vui lòng thử lại"; mất mạng (`status 0`) thì poll tiếp.
- `SectionEditor.finishAiFormat`: `succeeded`/`partial` + `changed` → `editor.tf.withNewBatch(() => editor.tf.setValue(value))` rồi thông báo; `partial` thêm cảnh báo 1.11 (số lỗi cấu trúc) và làm nổi `IssuePanel` (prop `highlight`, viền `--warn-border`; màn hình < lg thì hiện cột bên phải); `changed = false` → giữ nguyên + báo; huỷ → báo "nội dung không đổi". Thông báo nằm dưới thanh công cụ, có nút ẩn. Không tự Save; bản nháp localStorage ghi như sửa tay.
- **`editor.tf.setValue` không xoá lịch sử** (Plate 53: `replaceNodes(…, { at: [], children: true })` = thao tác remove/insert đi qua `withHistory`). Đã kiểm bằng script headless: `withNewBatch` + `setValue` = **1 bước** hoàn tác, undo về bản trước, redo về kết quả AI.

**Nghiệm thu** (bản build: API `node dist/main.js` :3101, `next start` :3110, Chrome headless qua `puppeteer-core` cài ở thư mục tạm, đăng nhập bằng refresh token tạo trong DB rồi thu hồi sau khi thử)

- 5 lệnh pass (shared 143, exam-core 91, lang-api 373 test; lint không cảnh báo).
- Tenant `step4-test` chưa bật → trình soạn đề không có nút. Bật qua `/admin/tenants` → **Chi tiết** → công tắc **Trợ lý AI** (DB `ai_enabled = true`).
- Đề mới "req-5 Step 4 – thử AI" (IELTS, để lại trong DB), tab Reading, gõ đề IELTS Reading 30 dòng (TFNG 3 câu, điền 2 chỗ, MC, Choose TWO, answer key cuối đề) + ghi chú → "Lần thử 1/3…" → `succeeded` ở lần 1 (~5 giây, 3.011 token vào / 754 ra): 37 block, 1 Part / 4 Subpart / 4 câu (TFNG False/True/Not Given, blank "coal"/"1998", MC, pick-n chọn 2), bảng kiểm tra 0 lỗi; tiêu đề hiện "Có thay đổi chưa lưu", DB chưa có nội dung; **Cmd+Z** → đúng chữ đã gõ, **Cmd+Shift+Z** → lại kết quả AI.
- Huỷ ngay sau khi bắt đầu: nội dung không đổi, thông báo "Đã huỷ…", run `cancelled`, `attempts 0`, `counted false`.
- Hết hạn mức (tạm đặt 100 + chèn 100 run giả, đã xoá sau khi thử): nút vẫn bấm được, hộp thoại báo "Trung tâm đã dùng hết 100 lượt AI của tháng này", "Đã dùng 102/100" màu đỏ.
- Chặn response bằng puppeteer (không gọi Gemini): `configured: false` → nút disable + tooltip "Chưa cấu hình AI"; `partial` → áp kết quả + cảnh báo "còn 1 lỗi cấu trúc…" + bảng kiểm tra viền vàng, Ctrl+Z về bản gõ; `changed: false` → giữ nguyên + báo; poll 404 → hộp thoại vẫn mở, báo phiên bị gián đoạn. POST 400 (section rỗng) → message server trong hộp thoại.
- Trình soạn bài học (tenant đang bật AI) không có nút.
- 3 theme `light` / `solarized-light` / `dark`: hộp thoại, trạng thái đang chạy, thông báo và viền bảng kiểm tra đúng token.
- Sau khi thử: `step4-test` trả về **tắt AI**, hạn mức Không giới hạn; 2 run thử để lại làm nhật ký.

**Sai khác so với plan**

- Không gửi `sectionId`: `EditorSection` ở client không giữ id section của server (tab mới/đổi thứ tự) – trường chỉ để ghi nhật ký, API cho phép bỏ.
- Huỷ = không áp kết quả kể cả khi job vừa kịp xong trên server (lượt khi đó đã tính).
- Poll đi qua `api.get` nên thanh loading toàn cục nháy mỗi 2 giây trong lúc chạy (giống chuông thông báo) – chấp nhận vì hộp thoại đang che màn hình.

**Lưu ý cho Step 5**

- **Dev server của anh/chị**: trong phiên này `pnpm build` ghi đè `.next` và xoá `dist`, nên `pnpm dev` (:3100 + :3101) trả 404 chunk rồi thoát hẳn – cần chạy lại `pnpm dev`.
- Harness thử bằng trình duyệt (puppeteer-core + Chrome đã cài, đăng nhập bằng refresh token tạo trong DB) chạy tốt, dùng lại được cho Step 5 / nghiệm thu (không cài vào repo). Gõ đề bằng `keyboard.sendCharacter` từng dòng + Enter (sự kiện paste giả không vào editor).
- `/user-manual` `06-de-thi.json`: nút ở cuối thanh công cụ trình soạn đề; Ctrl+Z hoàn tác; không tự lưu; hết lượt / chưa cấu hình / gián đoạn như trên.

**Prompt cho Step 5**

```text
Làm req-5 Step 5 – Tinh chỉnh prompt với đề IELTS thật, tài liệu & khép lại. Đọc docs/requirements/req-5-progress.md (Step 3–4, "Lưu ý cho Step 5") rồi req-5-plan.md mục 1, 2, 7 (Step 5). Trước khi chạy, kiểm docs/requirements/req-5-samples/ đã có 3–5 đề IELTS .txt (Listening, Reading, Writing, Speaking; có và không có answer key) – chưa có thì làm phần tài liệu và báo tôi.
Việc cần làm:
1. Chạy từng đề mẫu qua API (bản build, tenant step4-test tạm bật AI): ghi số lần thử, lỗi còn lại, token vào/ra, thời gian; chỉnh `ai-format-prompt.ts` (quy ước IELTS, Writing/Speaking theo giả định 5) đến khi đa số qua trong ≤ 3 lần. Xem lại việc thử lại khi AI trả 0 thao tác (Step 3, sai khác) với section đã định dạng sẵn. Ghi bảng kết quả vào progress.
2. `/user-manual`: `06-de-thi.json` (nút "Định dạng bằng AI", ghi chú cho AI, Ctrl+Z, không tự lưu, hạn mức, giới hạn section, nội dung gửi lên Google – 1.18), `04-quan-tri-he-thong.json` (khối "Trợ lý AI" của trung tâm), `09-van-hanh.json` (biến env Gemini/GCP, không ghi giá trị) + `updatedAt`; tên nút/menu đúng `vi.ts`.
3. `docs/setup/deploy.md` + `deploy-staging.md`: thêm biến Gemini/GCP (`GCP_SERVICE_ACCOUNT_JSON_BASE64` trên VPS); nhắc tôi cập nhật `.env` VPS.
4. `req-5-acceptance.md` cho System Admin, Owner, Teacher (bật AI, hạn mức, nút ẩn/disable, định dạng, huỷ, Ctrl+Z, hết lượt, bài học không có nút, 3 theme) rồi nghiệm thu theo đó bằng trình duyệt.
5. Chạy đủ 5 lệnh, cập nhật req-5-progress.md (đóng req-5), module-notes.md, code-conventions.md mục 1 nếu đổi requirement đang làm. Không commit.
```

### Step 5 – Tinh chỉnh với đề IELTS thật, tài liệu & khép lại (2026-10-01)

**Đề mẫu**

Chỉ có **1 đề thật** `req-5-samples/ielts-test-1.txt` (Placement Test copy từ PDF, không có answer key): Reading 3 passage (40 câu), Listening 4 section (40 câu), Writing 2 task, phía sau là phiếu trả lời (answer sheet) và rubric chấm Speaking – **không có đề Speaking**. Tách thành các section như giáo viên dán vào từng tab (mỗi dòng = 1 paragraph) + 3 biến thể tự dựng để phủ các trường hợp plan yêu cầu:

- `reading1-key`: Passage 1 + **answer key tự viết** thêm ở cuối (đề có đáp án);
- `writing-junk`: Writing + toàn bộ phần đuôi (543 dòng phiếu trả lời / rubric);
- chạy lại trên kết quả đã định dạng (section đã định dạng sẵn, có và không có đáp án).

**Vấn đề gặp với prompt Step 3 (v0) và cách sửa**

| Vấn đề trên đề thật | Hậu quả | Sửa |
|---|---|---|
| PDF làm **dính dòng**: "15 … 16 … 17 … 18 …", "A … B …", câu hướng dẫn dính lựa chọn A | Reading chỉ ra 33/40 câu (TFNG/matching gộp câu), pick-n và MC có lựa chọn ghép đôi, sai số câu mà **không báo lỗi** | Thao tác mới **`split`** (exam-core `apply.ts`/`text-range.ts`): cắt block tại chữ khớp nguyên văn, không thêm/bớt chữ; các phần gọi là `i.1`, `i.2`… trong mọi thao tác khác (schema: chỉ số block đổi `INTEGER` → `NUMBER`). Prompt có mục "Splitting merged lines" + ví dụ |
| Đề không có đáp án: AI bỏ trường `answer`, trả `answers: []`, `correct: null` | Listening lần 1 bị bỏ 33 thao tác, Reading bỏ 2 → tốn thêm lần gọi | Parser coi thiếu/rỗng là "chưa có đáp án" (giả định 4) |
| AI đếm thiếu ký tự "………" | Sót "." / "…" cạnh ô trống ("have . facades") | Blank khớp ô in sẵn tự nới ra hết chuỗi chấm/gạch dưới liền kề (`widenGap`) |
| Số câu dính liền dấu chấm ("27………") | Chữ "27" còn lại cạnh badge số câu | Prompt: khớp cả số dính liền ô trống (ô blank tự hiện số câu) |
| "Label the diagram" (ô trống chỉ có trong hình) | AI biến **khoảng trắng** thành blank | Parser từ chối `match` toàn khoảng trắng; prompt: không tạo câu hỏi cho phần đó → Reading ra **37** câu (21–23 giáo viên tự thêm sau khi chèn ảnh) |
| Chạy lại trên section đã định dạng | AI chuyển lại cặp ghép với đáp án rỗng (mất đáp án), biến chữ thật ("these", "12") thành blank, hoặc trả 0 thao tác → tốn đủ 3 lần (lưu ý ở Step 3) | Đổi lại `pairs`/`choices` mà AI để trống đáp án thì **giữ đáp án cũ**; block đã có blank chỉ nhận blank ở ô in sẵn; AI trả `[]` cho section đã có câu hỏi và không lỗi cấu trúc → **dừng ngay**, `succeeded` + `changed: false`, thông báo mới `vi.aiFormat.alreadyFormatted` |
| AI tự xoá 543 dòng phiếu trả lời | Trái quy tắc cũ (chỉ xoá answer key) | **Cho phép** xoá phiếu trả lời trống / ô dành cho giám khảo (không có câu hỏi hay hướng dẫn); mọi chữ khác (kể cả rubric chấm) giữ nguyên. Ctrl+Z khôi phục được |
| `at` của `split` liệt kê cả chữ đầu block | Thao tác bị bỏ, tốn 1 lần thử | `at` trùng đầu block được bỏ qua |

**Kết quả cuối – chạy qua API thật** (bản build :3105, tenant `step4-test` tạm bật AI, Vertex `gemini-3.6-flash`, mỗi section 2 lượt)

| Section | Block / ký tự | Lượt 1 | Lượt 2 | Câu hỏi | Token vào / ra (lượt 1; lượt 2) | Thời gian |
|---|---|---|---|---|---|---|
| Reading 3 passage, không đáp án | 136 / 22,6k | ✅ lần 1 | ✅ lần 2 | 37 (13 + 10 + 14), 0 lỗi cấu trúc; 7 lỗi chỉ thiếu đáp án | 8.960 / 2.233; 19.072 / 1.938 | 12,2 s; 11,5 s |
| Listening 4 section, không đáp án | 82 / 2,6k | ✅ lần 1 | ✅ lần 1 | 40 (10 × 4) | 4.540 / 977; 4.540 / 1.188 | 6,6 s |
| Writing 2 task | 14 / 0,6k | ✅ lần 1 | ✅ lần 1 | 2 (1500 / 2500 ký tự) | 3.359 / 266; 3.359 / 192 | 3,7 s; 2,5 s |
| Reading P1 + answer key | 58 / 7,0k | ✅ lần 2 | ✅ lần 1 | 13, **đủ đáp án** (matching i–x, pick-n tick A C E G, blank "brick"…), answer key đã xoá | 10.716 / 724; 5.130 / 1.602 | 7,8 s; 8,4 s |
| Writing + phiếu trả lời / rubric | 557 / 4,5k | ✅ lần 1 | ✅ lần 1 | 2, xoá phiếu trả lời (còn 16 block) | 10.219 / 454; 10.219 / 69 | 4,6 s; 2,5 s |
| Chạy lại trên kết quả (Reading / Listening / P1 có đáp án) | – | ✅ ×3 | – | không đổi (`changed: false`), đáp án giữ nguyên | 9.546 / 1.052; 5.153 / 324; 10.733 / 106 | 7,5 s; 3,7 s; 3,0 s |

- **10/10 lượt định dạng mới `succeeded`** (0 lỗi cấu trúc), **8/10 xong ở lần 1**, 2/10 ở lần 2; trung bình ~**8.000 token vào / ~960 token ra / ~6,6 giây** mỗi lượt.
- Trong lúc tinh chỉnh (harness gọi Gemini cùng code với service, ~40 lượt): với code cuối Reading 4/6 lượt xong ở lần 1 (2 lượt còn lại ở lần 2), Listening 6/6 ở lần 1; chạy lại trên section đã định dạng 6/6 không đổi nội dung.
- Rubric Speaking chạy riêng: AI không dựng câu hỏi nào (đúng – không phải đề). **Chưa có đề Speaking thật** để thử; quy ước Speaking trong prompt giữ như Step 3.

**Đã làm**

- `@lang/exam-core` `ai-format/`: thao tác `split` + `AiBlockRef`/`blockRefParts`/`AI_SPLIT_MAX_PIECES`; `applyAiOps` áp `split` trước rồi đổi chỉ số mọi thao tác (`resolveOp`), thông báo lỗi và `AiIssueOrigin.block` theo `i.k`; `widenGap`/`isPrintedGap`/`rangeText`; giữ đáp án khi đổi lại cặp ghép/checkbox; parser dễ dãi với đáp án trống, từ chối `match` toàn khoảng trắng. Test mới: split (tách + trỏ phần + giữ mark, `at` trùng đầu, các lỗi, tách 2 lần), nới ô trống, blank trong block đã có blank, giữ đáp án cũ, parse đáp án trống / `split`.
- lang-api: `ai-format-prompt.ts` (mục tách dòng có ví dụ, quy tắc ô trống + số câu, "Label the diagram", section đã định dạng → `{"ops":[]}`, answer key nhiều đáp án, xoá phiếu trả lời, giữ mọi chữ khác; schema chỉ số `NUMBER` + `at`); `ai-format-attempt.ts` `alreadyFormatted`; service chốt `succeeded` khi đã định dạng sẵn. Test service mới: section đã định dạng → 1 lần gọi, `succeeded`, `changed: false`.
- lang-app: `SectionEditor` thông báo `vi.aiFormat.alreadyFormatted` (tông info) khi `succeeded` mà không đổi.
- `/user-manual` (`updatedAt` 2026-10-01): `06-de-thi.json` mục **Định dạng bằng AI** trong Trình soạn đề (các bước, bảng thông báo, AI làm/không làm gì, hạn mức, giới hạn, nội dung gửi lên Google – 1.18); `04-quan-tri-he-thong.json` mục **Trợ lý AI** ở Quản lý trung tâm; `09-van-hanh.json` nhóm biến **AI (Gemini)**, 2 dòng sự cố, giới hạn; `01-gioi-thieu.json` 2 dòng ma trận phân quyền.
- `docs/setup/deploy.md` (biến Gemini/GCP với `GCP_SERVICE_ACCOUNT_JSON_BASE64`, bước kiểm sau deploy, 2 dòng sự cố) + `deploy-staging.md`.
- [req-5-acceptance.md](req-5-acceptance.md): System Admin, Owner/Admin, Giáo viên, Học viên, 3 theme, tài liệu.
- Plan giả định 3 ghi bổ sung `split` + xoá phiếu trả lời; `module-notes.md`; `code-conventions.md` mục 1 (không còn requirement đang làm, thêm req-5-acceptance).

**Nghiệm thu** (bản build: API `node dist/main.js` :3101, `next start` :3110, Chrome headless qua `puppeteer-core` ở scratchpad, đăng nhập bằng refresh token tạo trong DB – đã xoá sau khi thử)

- 5 lệnh pass (shared 143, exam-core 102, lang-api 374 test; lần chạy test đầu một jest worker bị SIGSEGV ở `rich.spec.ts` – lỗi môi trường, chạy lại pass).
- Theo [req-5-acceptance.md](req-5-acceptance.md):
  - **1.1–1.3** `/admin/tenants` → Chi tiết `step4-test`: công tắc tắt + ô hạn mức mờ → bật (mặc định Không giới hạn) → 100 → 1.000 → Không giới hạn, DB đúng từng bước. **1.5** user không có vai trò hệ thống gọi `PATCH admin/tenants/:id/ai` → 403.
  - **2.1** chưa bật → không có nút. **2.3–2.6** gõ Reading của đề mẫu vào tab Reading → hộp thoại đủ nội dung → "Lần thử 1/3…" → xong 10,3 s, "Đã định dạng bằng AI…", "Có thay đổi chưa lưu", nháp: 3 Part 13/10/14 câu, 0 lỗi cấu trúc, bảng Kiểm tra 7 lỗi đều là thiếu đáp án; Cmd+Z về đúng chữ đã gõ, Cmd+Shift+Z lại kết quả AI. **2.7** Listening (theme Tối) 4 × 10 câu; Writing (theme Giấy) 2 câu. **2.8** bấm lại trên Listening → "Section đã được định dạng, AI không thay đổi gì…", nội dung giữ nguyên. **2.9** Hủy → nội dung không đổi, run `cancelled`, không tính lượt. **2.10** section rỗng → "Section chưa có chữ nào để định dạng." trong hộp thoại. **2.11** hạn mức 100 + 100 run giả (đã xoá) → "Trung tâm đã dùng hết 100 lượt AI của tháng này", "Đã dùng 125/100" màu đỏ. **2.12** trình soạn bài học không có nút. **2.2** (giả `ai/status` `configured: false`) nút disable + "Chưa cấu hình AI". **2.13** F5 → hộp Khôi phục bản chưa lưu; `content_revision` của đề vẫn 1.
  - **3.1** Giáo viên định dạng được đề mình tạo; **3.2** đề của Owner: trình soạn ở chế độ "Chỉ xem", không có nút, `POST ai-format` → 403; **3.3** giáo viên khác / Owner đọc job của giáo viên → 404, chính giáo viên → 200. **4.1** học viên `GET ai/status`, `POST ai-format` → 403.
  - **5.x** khối Trợ lý AI (Tối, Giấy), hộp thoại (Sáng, Giấy, Tối – cả lúc chạy và lúc báo hết lượt), thông báo info/success dưới thanh công cụ: chữ và viền rõ.
  - **6.x** `/user-manual/trinh-soan-de` có mục Định dạng bằng AI (kèm cảnh báo gửi lên Google), `admin-trung-tam` có Trợ lý AI, `deploy-moi-truong` có nhóm AI (Gemini), ma trận phân quyền có 2 dòng mới.
- Sau khi thử: `step4-test` trả về **tắt AI**, hạn mức Không giới hạn; nhật ký `ai_format_runs` của `step4-test` còn 26 `succeeded` + 10 `cancelled` (giữ làm nhật ký); đề "req-5 Step 4 – thử AI" không bị lưu.

**Sai khác so với plan**

- Thêm thao tác `split` và cho xoá phiếu trả lời trống / ô giám khảo (plan giả định 3 đã ghi bổ sung). Lý do: đề thật copy từ PDF hầu như luôn dính dòng; không tách được thì số câu sai **mà không có lỗi nào báo**.
- Plan yêu cầu 3–5 đề; chỉ có 1 đề thật (anh/chị cung cấp) nên thêm 3 biến thể tự dựng. Answer key của biến thể `reading1-key` do tôi tự viết để thử luồng "đề có đáp án" – không phải đáp án chính thức.
- Section đã định dạng sẵn mà AI không đổi gì: job `succeeded` + `changed: false` (plan không nói), UI báo riêng thay vì "AI không định dạng được".

**Lưu ý sau req-5**

- **Deploy:** cần thêm vào `/opt/lang-simulator/.env` trên VPS (prod **và** staging) các biến `GEMINI_BACKEND=vertex`, `GEMINI_MODEL`, `GEMINI_MAX_OUTPUT_TOKENS=16384`, `GEMINI_VERTEX_LOCATION`, `GCP_PROJECT_ID`, `GCP_SERVICE_ACCOUNT_JSON_BASE64` rồi `docker compose up -d --force-recreate` (`deploy.md` mục 1). Thiếu thì app vẫn chạy, nút AI bị disable. Có migration `AiFormat` (Step 2) chạy tự động khi container khởi động.
- Câu hỏi chỉ có ô trống trong hình ("Label the diagram") AI bỏ qua – giáo viên tự thêm.
- Có thêm đề (nhất là Speaking, đề có answer key thật, đề nhiều bảng) thì chạy lại theo bảng trên; harness ở scratchpad không lưu trong repo – dựng lại theo mô tả này (tách section theo dòng → gọi `POST t/:slug/exams/:id/ai-format` → poll → `buildPlan`/`validateSection` trên `result.value`).
- Badge số trên ô blank trong **trình soạn** đếm blank liên tục cả section (không theo số câu khi có câu loại khác xen giữa) – hành vi có từ trước req-5, simulator/khi thi đánh số đúng.
