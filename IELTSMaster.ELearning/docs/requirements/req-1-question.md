# Requirement 1 – Câu hỏi làm rõ

> Cách trả lời: ghi ngay dưới dòng **Trả lời:** của từng câu. Mỗi câu đã có **Đề xuất**, nếu đồng ý chỉ cần ghi `OK`.
> Câu đánh dấu 🔴 là câu **chặn** (ảnh hưởng lớn tới thiết kế DB/kiến trúc), cần trả lời trước khi lập plan.

---

## 0. Kết quả khảo sát `lightc-general` (để hiểu bối cảnh các câu hỏi)

**Backend** (`lightc-general/backend`)
- NestJS 10 + TypeORM 0.3 + PostgreSQL, npm, Node 20. `synchronize: true`, **không có migration**, không có test, không có ESLint/Prettier thực sự.
- Toàn bộ bảng nằm ở schema `public`.
- Auth: login email/password (bcrypt), **chỉ có access token JWT** (1 ngày), gửi qua header `Bearer`, không refresh token, không logout thật. JwtStrategy không query DB nên khoá user/đổi role chỉ có hiệu lực khi token hết hạn.
- **Không có** đăng ký công khai, xác thực email, quên mật khẩu, dịch vụ gửi mail. Google/Facebook OAuth mới chỉ khai báo env, **chưa có code**.
- Role chỉ có `ADMIN` / `MEMBER`, **không có multi-tenant**.
- Upload: Cloudflare R2 qua S3 SDK, file đi **qua server** (multer), không presigned URL. Ảnh convert webp. Giới hạn: ảnh 5MB, audio 50MB, video 100MB. Key dạng `exam/{userId}/{uuid}.{ext}`.

**Đề thi trong `lightc-general`** – khác khá nhiều so với req-1
- Chỉ có **1 bảng `exam`** (`id, title, content jsonb, created_by, timestamps`). Không có category, blueprint, module, section, question, attempt hay version.
- Toàn bộ cấu trúc đề (part → subpart → question) **và cả đáp án** nằm trong JSON Plate `content`. Backend **không parse** nội dung ra bảng.
- Loại câu hỏi: `mc-single, mc-multi, pick-n, matching, tfng, ynng, fill-blank, ordering, polytomous, speaking, writing`.
- Giả lập thi (`ExamSimulator`) render từ JSON. Mỗi Part là một tab, có lưới câu hỏi, đánh dấu (flag) và nộp bài.
  - **Không có timer, không gửi bài làm lên server.** Chấm điểm chạy ở client (`grading.ts`) và không lưu lại.
  - Speaking/Writing được đánh là `manual`. Kết quả hiển thị dạng "x / y câu đúng".
- Editor có autosave: localStorage sau 800ms, lưu server sau 2s.
- Tính năng này đang là tính năng thử nghiệm, chỉ dành cho ADMIN (`/labs/exam-editor`).

**Frontend** (`lightc-general/frontend`)
- Next.js 14 App Router, React 18, Tailwind 3. **Không dùng shadcn/react-query/react-hook-form**. Component UI tự viết, dùng `fetch` wrapper riêng.
- Theme Solarized Light, không có dark mode. UI chỉ có tiếng Việt, không i18n.
- Token lưu ở `localStorage`, guard phía client, không có `middleware.ts`.
- Chỉ có trang `/login`, **không có trang chính/landing**. Có mockup `design/Home.html` và `design/Auth.html`.

**Deploy**
- Không phải monorepo thật.
- **1 Docker image chạy cả Next (3000) + Nest (3001) trong 1 container**. Next rewrite `/api/*` sang Nest nội bộ. Chỉ public port 3000.
- GitHub Actions: build image, push lên GHCR, SSH vào VPS rồi chạy `docker compose pull && up -d` tại `/opt/lightc`.
- Postgres chạy container riêng trên VPS; app nối vào qua external network `postgres_default`.
- Không có nginx/SSL/domain trong repo.

---

## A. Monorepo & tooling

### A1. Package manager
`lightc-general` dùng npm. Turborepo chạy được với npm workspaces, nhưng pnpm nhanh hơn và hỗ trợ `turbo prune` cho Docker tốt hơn.
**Đề xuất:** pnpm workspaces + Turborepo, Node 20.
**Trả lời:** OK

### A2. Cấu trúc thư mục
**Đề xuất:**
```
lang-simulator/
  apps/lang-app      # Next.js
  apps/lang-api      # NestJS
  packages/exam-core # types Plate exam, buildPlan, parse đáp án, grading – dùng chung FE & BE
  packages/shared    # enum role, DTO types dùng chung (tuỳ chọn)
  packages/tsconfig, packages/eslint-config
  docker/, deploy/, .github/workflows/
```
`packages/exam-core` là cần thiết nếu backend phải parse `raw_data` và chấm điểm phía server (xem mục H, I).
**Trả lời:** OK

### A3. Lint / format / test
`lightc-general` gần như không có tooling này.
**Đề xuất:** thêm ESLint + Prettier. Test (Jest cho api) chỉ viết cho logic quan trọng: parse đề, versioning, chấm điểm, phân quyền.
**Trả lời:** OK

### A4. Git & GitHub
`lang-simulator` hiện chưa là git repo.
**Đề xuất:** `git init`, tạo repo GitHub `vunguyenquangit/lang-simulator`, image `ghcr.io/vunguyenquangit/lang-simulator`.
**Trả lời:** OK
### A5. Port khi dev local
`lightc-general` dev đang dùng 3000 (FE) và 3001 (BE). Nếu chạy song song 2 dự án trên máy local sẽ đụng port.
**Đề xuất:** local dùng `lang-app: 3100`, `lang-api: 3101`. Port 3001 chỉ áp dụng cho VPS.
**Trả lời:** OK

---

## B. Database

### B1. 🔴 "Database giống `lightc-general` chỉ khác schema" nghĩa là gì?
- (a) Dùng **chung Postgres server và cùng database** (`DB_NAME`), nhưng tạo **Postgres schema riêng** (vd. `lang`).
- (b) Dùng chung Postgres server nhưng tạo **database riêng** (vd. `lang_simulator`).
- (c) Chỉ là cùng loại công nghệ (Postgres + TypeORM), cấu trúc bảng khác, còn DB server có thể tách riêng.

**Đề xuất:** (a) hoặc (b) trên cùng container Postgres của VPS, dùng DB user riêng cho lang-simulator. Nếu chọn (a) thì schema tên là gì?
**Trả lời:** schema tên là lang_simulator, tạm thời dùng schema riêng.

### B2. 🔴 Migration
`lightc-general` dùng `synchronize: true`. Dự án này có multi-tenant, versioning và dữ liệu bài thi thật, nên `synchronize` rất rủi ro (có thể mất cột hoặc dữ liệu khi đổi entity).
**Đề xuất:** dùng **TypeORM migrations**, `synchronize: false` ở mọi môi trường, và chạy migration tự động khi container khởi động.
**Trả lời:** OK

### B3. Quy ước chung
**Đề xuất:** giữ quy ước của `lightc-general`: PK uuid, tên bảng/cột snake_case, `created_at/updated_at`. Bổ sung:
- **soft delete** (`deleted_at`) cho `users`, `tenants`, `memberships`, `exams`;
- `created_by/updated_by` cho các bảng nội dung.

**Trả lời:** OK

---

## C. Upload file & hạ tầng dùng chung

### C1. Dùng chung R2
**Đề xuất:**
- Dùng **chung bucket và credential R2** với `lightc-general`, nhưng khác prefix: `lang/{tenantId}/exam/{uuid}.{ext}`.
- Giữ cơ chế upload qua server và giới hạn dung lượng như `lightc-general`.

Hay bạn muốn bucket riêng, hoặc chuyển sang presigned URL?
**Trả lời:** Bucket riêng, tôi sẽ tạo.

### C2. Quyền upload
**Đề xuất:** chỉ người có quyền soạn đề (Teacher, Tenant Owner/Admin) mới được upload; file gắn với tenant.
Có cần quota dung lượng theo tenant không (có thể để sau)?
**Trả lời:** OK, quota tạm để sau.

### C3. Các dịch vụ khác của `lightc-general`
Gồm GCP TTS/STT, Gemini, Document AI. Req-1 chỉ nói dùng chung phần upload.
**Đề xuất:** **không** mang các dịch vụ GCP sang trong req-1.
**Trả lời:** Không bao gồm các dịch vụ GCP.

---

## D. Tài khoản & xác thực

### D1. 🔴 Cơ chế token
`lightc-general`: JWT trong localStorage, 1 ngày, không refresh token, guard chỉ ở client, không kiểm tra DB khi xác thực.
Với multi-tenant, việc khoá user hoặc thu hồi membership cần có hiệu lực nhanh.
- (a) Giữ nguyên như `lightc-general` (đơn giản, nhất quán).
- (b) Access token ngắn (15 phút) + refresh token trong **httpOnly cookie** (lưu DB, thu hồi được); JwtStrategy kiểm tra `is_active`/`token_version`; thêm `middleware.ts` ở Next.

**Đề xuất:** (b).
**Trả lời:** OK đề xuất (b)

### D2. 🔴 Luồng đăng ký
- Đăng ký công khai bằng email + mật khẩu, tạo ra `Registered User`: đúng không?
- Có **bắt buộc xác thực email** không? Có cần **quên mật khẩu** trong req-1 không? Cả hai đều cần dịch vụ gửi mail (SMTP, Resend, AWS SES...) mà `lightc-general` chưa có. Nếu cần thì dùng dịch vụ nào?
- Đăng nhập Google/Facebook: trong req-1 hay để sau?

**Đề xuất:**
- req-1 làm đăng ký/đăng nhập email + đổi mật khẩu;
- xác thực email + quên mật khẩu làm ở step sau (chuẩn bị sẵn cột `email_verified_at`);
- OAuth để sau.

**Trả lời:** OK với đề xuất

### D3. Thông tin account (bạn yêu cầu suggest thêm)
**Đề xuất bảng `users`:**

| Cột | Bắt buộc | Ghi chú |
|---|---|---|
| `email` | ✔ | unique (không phân biệt hoa thường), dùng đăng nhập |
| `password_hash` | ✔ | bcrypt |
| `full_name` | ✔ | |
| `date_of_birth` | ? | cần để xác định học viên < 18 tuổi (liên quan Parent) |
| `gender` | | male/female/other |
| `phone` | | |
| `avatar_url` | | R2 |
| `address` | | |
| `locale` | | mặc định `vi` |
| `timezone` | | mặc định `Asia/Ho_Chi_Minh` |
| `system_role` | ✔ | `SYSTEM_OWNER` / `SYSTEM_ADMIN` / `REGISTERED_USER` |
| `status` | ✔ | `active` / `locked` (/ `pending` nếu xác thực email) |
| `email_verified_at` | | |
| `last_login_at` | | |
| `created_at, updated_at, deleted_at` | | |

Câu hỏi thêm:
- `date_of_birth` có bắt buộc khi đăng ký không?
- Cần thêm/bớt cột nào?

**Trả lời:** OK theo đề xuất, nên bắt buộc date_of_birth vì cần xác nhận đủ 18 tuổi.

### D4. Role hệ thống
- Có thể có **nhiều** System Owner không? System Owner đầu tiên được tạo bằng seed từ env (như `ADMIN_EMAIL` của `lightc-general`) có ổn không?
- Ai được nâng/hạ quyền System Admin: chỉ System Owner, hay System Admin cũng được tạo System Admin khác?
- System Admin được làm gì với user thường và tenant: tạo, sửa, khoá, xoá, reset mật khẩu?
- "Không được tác động tài khoản System Owner" có bao gồm **cả xem** hay chỉ sửa/khoá/xoá/đổi role?

**Đề xuất:**
- Cho phép nhiều Owner; Owner đầu tiên tạo bằng seed.
- Chỉ Owner quản lý Admin.
- Admin được tạo/sửa/khoá user thường và tenant, được xem Owner nhưng không sửa.

**Trả lời:** OK

### D5. System Owner/Admin có truy cập dữ liệu bên trong tenant không?
Ví dụ: xem đề thi, membership của tenant bất kỳ, hoặc "vào tenant với quyền quản trị" (impersonate).
**Đề xuất:** req-1 cho phép xem danh sách tenant và chi tiết cơ bản (owner, số thành viên), **không** vào nội dung tenant. Nếu System Owner/Admin cũng là member của tenant thì vào như member bình thường.
**Trả lời:** OK

---

## E. Tenant

### E1. 🔴 Luồng "đăng ký tenant"
- Registered User tạo tenant và dùng được **ngay**, hay cần **System Admin duyệt**?
- Mỗi user được tạo tối đa bao nhiêu tenant?
- Người tạo tự động thành `Tenant Owner`: đúng không?

**Đề xuất:** tạo xong ở trạng thái `pending`, System Admin duyệt thành `active`. Không giới hạn số tenant trong req-1.
**Trả lời:** OK

### E2. Thông tin tenant
**Đề xuất:**
- `name`, `slug` (unique), `logo_url`, `description`, `email`, `phone`, `address`;
- `status` (`pending/active/suspended`), `owner_user_id`;
- timestamps + `deleted_at`.

Cần thêm gói dịch vụ / giới hạn (plan, max students...) không?
**Trả lời:** Thêm gói dịch vụ giới hạn, tôi đề xuất 100, 500, 1000 thành viên.

### E3. 🔴 Cách xác định tenant hiện tại
VPS hiện truy cập bằng IP:port, chưa có domain/SSL, nên dùng subdomain sẽ khó.
- (a) Theo path: `/t/{slug}/dashboard/...`
- (b) Tenant switcher trong sidebar; tenant hiện tại lưu ở client và gửi header `X-Tenant-Id`.
- (c) Subdomain `{slug}.domain` (cần domain + wildcard SSL).

**Đề xuất:** (a). URL rõ ràng, bookmark/chia sẻ được, và backend kiểm tra membership theo slug.
**Trả lời:** OK đề xuất (a)

### E4. Cách ly dữ liệu
**Đề xuất:** dùng chung bảng, mỗi bảng thuộc tenant có cột `tenant_id`, lọc bắt buộc qua guard/service. Không tách schema theo từng tenant.
**Trả lời:** OK

### E5. Tenant Owner
- Mỗi tenant có **đúng 1** Tenant Owner, hay có thể nhiều?
- Có chức năng **chuyển quyền sở hữu** không?
- Tenant Admin có được bổ nhiệm Tenant Admin khác không?

**Đề xuất:** đúng 1 Owner, có chuyển quyền (req sau). Tenant Admin được thêm/sửa các role khác, kể cả Tenant Admin, trừ Owner.
**Trả lời:** OK

---

## F. Membership

### F1. 🔴 Cách người dùng trở thành thành viên tenant
"Đăng ký thành viên" nghĩa là:
- (a) User tự **gửi yêu cầu tham gia** tenant, Owner/Admin duyệt.
- (b) Owner/Admin **thêm theo email** một account đã tồn tại.
- (c) Owner/Admin **mời qua email** (link mời), người nhận chưa có account thì đăng ký.
- (d) Owner/Admin **tạo luôn account** cho học viên/phụ huynh (mật khẩu tạm).

**Đề xuất:** req-1 làm (b) + (d), vì chưa có dịch vụ email; (a)/(c) để sau.
**Trả lời:** OK đề xuất (b) + (d)

### F2. 🔴 Cấu trúc membership & phạm vi role
Req nói "giáo viên khoá học này có thể là học viên khoá học khác", tức là role có thể gắn theo **khoá học/lớp**. Nhưng req-1 chưa nhắc tới khoá học/lớp.
- Req-1 có cần entity **Khoá học / Lớp** không?
- Nếu chưa, role chỉ ở mức tenant: một user trong 1 tenant có **nhiều role** (vd. Teacher + Student).

**Đề xuất:**
- `memberships(id, tenant_id, user_id, status, joined_at)` + `membership_roles(membership_id, role)`. Mỗi (tenant, user) có 1 membership, gắn được nhiều role.
- Khoá học/lớp để req sau, khi đó thêm `course_members` với role trong khoá học.

**Trả lời:** OK, tạm thời chưa có khoá học và lớp.

### F3. Parent ↔ Student
- Parent có account riêng (đăng nhập riêng) đúng không?
- 1 Parent có thể gắn nhiều Student, 1 Student có thể có nhiều Parent?
- Việc gắn Parent là **bắt buộc** khi Student dưới 18 tuổi, hay chỉ là tuỳ chọn?
- Khi Student đủ 18 tuổi thì liên kết Parent xử lý thế nào?
- Chức năng này nằm trong req-1 hay để sau (req-1 chưa có trang xem kết quả)?

**Đề xuất:** bảng `student_guardians(tenant_id, student_membership_id, parent_membership_id, relationship)`, quan hệ nhiều-nhiều, tuỳ chọn. Req-1 chỉ tạo bảng + UI gắn liên kết trong trang membership, trang xem kết quả để sau.
**Trả lời:** Gắn parent là tuỳ chọn. OK với đề xuất.

### F4. Menu cho Teacher / Student / Parent trong req-1
Phần "Yêu cầu tối thiểu" chỉ liệt kê trang cho System Owner/Admin và Tenant Owner/Admin.
- Teacher có vào được trang quản lý Danh mục / Loại đề / Đề thi không?
- Student / Parent đăng nhập vào tenant sẽ thấy gì trong req-1 (tạm thời trang rỗng)?

**Đề xuất:**
- Tenant Owner/Admin/Teacher: vào được phần quản lý đề.
- Student: có trang "Đề thi" để làm các đề đã publish (nếu req-1 có lưu bài làm, xem I1).
- Parent: trang rỗng.

**Trả lời:** Có trang chủ, tạo 1 landing page giới thiệu sơ sơ trung tâm, khi đăng nhập thì thành viên sẽ thấy danh sách bài thi publish theo tenant của mình, giả lập thi cũng nên thi ở phần này, không thi trong trang admin.

### F5. Chuyển ngữ cảnh
Một account có thể vừa là System Admin, vừa là Owner của tenant A, vừa là Student của tenant B.
**Đề xuất:** sau khi đăng nhập, nếu có nhiều ngữ cảnh thì hiển thị **trang chọn không gian làm việc** ("Quản trị hệ thống" + danh sách tenant). Sidebar có switcher để đổi. Nếu chỉ có 1 ngữ cảnh thì vào thẳng.
**Trả lời:** OK

---

## G. Danh mục đề / Loại đề / Đề thi

### G1. 🔴 Phạm vi của `exam_categories` và `exam_blueprints`
- (a) **Toàn hệ thống**: System Owner/Admin quản lý, mọi tenant dùng chung (TOEIC, IELTS, JLPT là chuẩn chung).
- (b) **Theo tenant**: mỗi tenant tự tạo.
- (c) **Cả hai**: hệ thống cung cấp mẫu, tenant được tạo thêm loại riêng.

`exams` chắc chắn thuộc tenant, đúng không?
**Đề xuất:** (c): `tenant_id` nullable, `NULL` là dữ liệu hệ thống. Nếu muốn đơn giản cho req-1 thì chọn (a).
**Trả lời:** OK với phương án (c)

### G2. Trường dữ liệu `exam_categories`
**Đề xuất:** `name` (Tiếng Anh), `code` (`EN`), `description`, `icon/color`, `sort_order`, `is_active`. Không phân cấp cha-con.
**Trả lời:** OK

### G3. Trường dữ liệu `exam_blueprints` và `exam_modules`
**Đề xuất:**
- `exam_blueprints`: `category_id`, `name` (TOEIC), `code`, `description`, `is_active`.
- `exam_modules`: `blueprint_id`, `name` (Reading), `code` (READING), `sort_order`, `reference_duration_minutes`, `description`.

Câu hỏi thêm:
- Đơn vị duration là **phút** hay **giây**?
- Module có cần thêm số câu tham khảo, điểm tối đa, hoặc kỹ năng (listening/reading/writing/speaking) không?
- Blueprint có cần **thang điểm quy đổi** (TOEIC 990, IELTS band) không, hay để req sau?

**Trả lời:** OK với đề xuất. Duration là phút, cho chọn theo bội số 5, tối đa 180 phút. Không cần thêm phần tham khảo. Thang điểm quy đổi để làm sau.

### G4. Sửa blueprint khi đã có đề dùng nó
Nếu thêm/xoá/sửa module của blueprint đang được đề thi sử dụng thì sao?
**Đề xuất:**
- `exam_sections` **snapshot** tên/thứ tự module lúc tạo đề (vẫn giữ `module_id`); sửa blueprint không ảnh hưởng đề đã tạo.
- Không cho xoá blueprint/module/category đang được dùng (chỉ cho ẩn `is_active = false`).

**Trả lời:** OK, khi tạo exam và exam_section thì nó đã có dữ liệu riêng, không liên quan đến blueprint hay module nữa.

### G5. Section của đề thi
- Khi tạo đề, sections được sinh từ modules. Người soạn có được **thêm/xoá/sắp xếp lại** section, hoặc đổi tên không?
- Có được **đổi blueprint** sau khi đã tạo đề không?
- Trường `exams`: `tenant_id`, `blueprint_id`, `title`, `description`, `status`... cần thêm gì (ảnh bìa, cấp độ, tags, ngôn ngữ)?

**Đề xuất:** không thêm/xoá section, chỉ sửa duration. Không đổi blueprint sau khi tạo.
**Trả lời:** Cho phép thêm, xoá, đổi tên, sắp xếp lại section, module chỉ là tham khảo. Cho phép đổi blueprint sau khi tạo đề. Exams nhiêu đó field là OK rồi.

---

## H. Lưu nội dung đề, import từ `raw_data` & versioning (quan trọng nhất)

### H1. 🔴 "Xoá dữ liệu đề thi và import lại theo `raw_data`": dữ liệu đó là gì?
Trong `lightc-general`, backend **không parse** Plate JSON ra bảng nào cả; toàn bộ câu hỏi và đáp án nằm trong 1 cột JSON. Req-1 lại nói có dữ liệu được "xoá hoàn toàn và import lại", tức là cần **parse `raw_data` ra các bảng chuẩn hoá**. Đề xuất:
- `exam_sections.raw_data` (jsonb): nguyên văn Plate value, để mở lại editor.
- `exam_sections.content_public` (jsonb): Plate value **đã bỏ đáp án**, dùng khi học viên làm bài (tránh lộ đáp án qua API).
- `exam_parts`: part/subpart theo `indicator` (kind, title, thứ tự, `seconds`).
- `exam_questions`: `section_id`, `part_id`, `number` (số thứ tự toàn đề), `qtype`, `node_id`, `answer_key` (jsonb), `max_score`/`weight`, `options` (jsonb).

Câu hỏi:
- Bạn có đồng ý cách chuẩn hoá này không, hay muốn giữ đơn giản như `lightc-general` (chỉ `raw_data` + cột `answer_key` sinh ra khi lưu)?
- Có cần thống kê theo từng câu (tỉ lệ đúng) về sau không? Nếu có thì nên dùng bảng `exam_questions`.

**Trả lời:** OK với đề xuất, nếu có thống kê từng câu thì càng tốt.

### H2. 🔴 Mô hình version
Đề xuất:
```
exams (thông tin chung, tenant, blueprint, status)
  └─ exam_versions (version_no, status: draft | active | deactivated, published_at, created_by)
       └─ exam_sections (module snapshot, duration_minutes, raw_data, content_public)
            └─ exam_parts / exam_questions
exam_attempts.exam_version_id  → bài làm luôn trỏ tới version cụ thể
```
Câu hỏi:
- Có đồng ý tách `exam_versions` như trên không, hay muốn gắn cột `version` trực tiếp vào `exam_sections`?
- Có cần xem lịch sử / so sánh / khôi phục version cũ không?

**Trả lời:** Tôi nghĩ nên thêm cột version vào exam_sections, cho phép khôi phục version cũ, không cần so sánh.

### H3. 🔴 Điều kiện ghi đè hay tạo version mới
Req: *"Nếu đề thi chưa publish **hoặc** chưa có ai hoàn thành thì xoá và import lại; nếu đã publish **và** đã có người làm bài thì tạo version mới."*
- "Hoàn thành" = đã **nộp bài** (attempt `submitted`)?
- Nếu có người **đang làm dở** (đã bắt đầu, chưa nộp) mà người soạn lưu thay đổi thì sao?
  - (a) Ghi đè luôn, bài đang làm dở lỗi.
  - (b) Coi "đang làm dở" như đã làm, nên tạo version mới; người đang làm vẫn tiếp tục trên version cũ.
- Đề đã publish nhưng chưa ai nộp thì **ghi đè trực tiếp** (theo đúng câu chữ): đúng không?
- Chỉ sửa metadata (tiêu đề, mô tả, duration section) có tính là "chỉnh sửa" và tạo version mới không?

**Đề xuất:**
- Tạo version mới nếu tồn tại **bất kỳ attempt nào** (kể cả đang làm) trên version active.
- Sửa metadata của `exams` không tạo version.
- Sửa duration section **có** tạo version, vì ảnh hưởng kết quả thi.

**Trả lời:** OK theo đề xuất

### H4. 🔴 Thao tác Save & autosave
`lightc-general` autosave lên server mỗi 2s. Nếu giữ autosave thì mỗi lần lưu trên đề đã có người làm sẽ sinh ra 1 version mới, dẫn tới **bùng nổ version**.
- Nút Save lưu **tất cả các tab section cùng lúc** (1 version cho cả đề), hay lưu từng tab riêng?

**Đề xuất:**
- Autosave chỉ lưu nháp ở localStorage (như `lightc-general`).
- Nút **Save** lưu toàn bộ các tab trong **1 transaction**, áp dụng quy tắc H3 một lần.
- Với đề đã publish và có người làm: hiển thị cảnh báo "Sẽ tạo version mới" trước khi lưu.

**Trả lời:** OK

### H5. Vòng đời publish
**Đề xuất:**
- Trạng thái đề: `draft → published → archived`.
- Chỉ publish khi validate đề không có lỗi (dùng `validate.ts`/IssuePanel của `lightc-general`).
- Cho phép unpublish về `archived` (ẩn khỏi học viên, giữ lịch sử).
- Xoá đề đã có bài làm thì soft delete.

Ai được publish: Teacher hay chỉ Tenant Owner/Admin?
**Trả lời:** OK

### H6. Quyền sở hữu đề trong tenant
- Teacher A có sửa được đề do Teacher B tạo không?
- Tenant Owner/Admin có sửa được mọi đề không?

**Đề xuất:** Teacher chỉ sửa đề mình tạo; Owner/Admin sửa được tất cả.
**Trả lời:** OK

---

## I. Giả lập thi & chấm điểm

### I1. 🔴 Phạm vi giả lập thi trong req-1
`lightc-general` chỉ có **preview cho admin**: không timer, không lưu bài, chấm ở client, đáp án nằm sẵn ở client. Req-1 cần tới mức nào?
- (a) Giống `lightc-general`: Teacher/Admin **preview + tự chấm ở client**, không lưu bài làm.
- (b) Student **làm bài thật**: tạo `exam_attempts` + `exam_attempt_answers`, **chấm phía server** (dùng chung `grading` qua `packages/exam-core`), API không trả đáp án cho học viên, lưu kết quả.

Lưu ý: nếu chọn (a) thì điều kiện "đã có người làm bài" ở H3 chưa bao giờ xảy ra, nhưng vẫn cần thiết kế sẵn bảng attempt.
**Đề xuất:** req-1 làm (b) ở mức tối thiểu: bắt đầu làm bài, lưu đáp án, nộp bài, chấm tự động, xem "x / y câu đúng". Tiếp tục dùng (a) cho preview.
**Trả lời:** OK

### I2. Timer theo section
Section có duration, nhưng `lightc-general` chưa có timer.
- Tính giờ **theo từng section** (hết giờ tự chuyển section, không quay lại, giống TOEIC/IELTS thật) hay **tổng thời gian** cho cả đề?
- Hết giờ thì **tự động nộp** bài?
- Timer tính ở server (chống gian lận khi reload) hay chỉ ở client?
- Audio listening có giới hạn **nghe 1 lần** không?

**Đề xuất:** timer theo section, khoá section đã qua, tự nộp khi hết giờ, thời điểm bắt đầu/kết thúc lưu ở server. Giới hạn nghe 1 lần để req sau.
**Trả lời:** OK

### I3. Tab trong editor và simulator
Req: "exam có 4 sections thì có 4 tab ở phần soạn đề, mỗi tab là 1 Plate editor". Trong `lightc-general`, simulator đang chia tab theo **Part** (indicator `kind: part`).
- Simulator có 2 cấp: **Section** (cấp ngoài, có timer), rồi các **Part** bên trong?
- Số thứ tự câu hỏi **đánh liên tục qua các section** (TOEIC 1–200) hay **đánh lại từ 1** mỗi section?

**Đề xuất:** 2 cấp, đánh số liên tục toàn đề (có tuỳ chọn ở blueprint để đánh lại mỗi section, làm sau).
**Trả lời:** Thực tế thì platejs của `lightc-general` có part thì giữ nguyên, section là phần cao hơn. Ví dụ section Reading có nhiều part là passages. (nếu chưa rõ hãy hỏi lại tôi, không suy đoán)

### I4. Speaking / Writing & quy đổi điểm
- Chấm tay Writing/Speaking bởi Teacher: req-1 hay để sau?
- Speaking có ghi âm (upload R2) không?
- Quy đổi điểm (TOEIC scaled score, IELTS band): req-1 hay để sau?

**Đề xuất:** để sau. Req-1 chỉ hiển thị "x / y câu đúng" và số câu cần chấm tay.
**Trả lời:** Hãy cho phép giáo viên chấm bài, hiện tại chưa có xếp lớp hay khoá học thì giáo viên có thể chấm bất kỳ bài nào. Speaking upload lên R2. Còn quy đổi điểm thì để sau.

### I5. Quy tắc lượt làm bài
- Student được làm 1 đề **bao nhiêu lần**?
- Học viên có được **xem đáp án đúng** sau khi nộp không?
- Đề publish có hiển thị cho **mọi Student trong tenant**, hay phải **giao đề** (theo lớp, theo người)?

**Đề xuất:** req-1 cho làm không giới hạn số lần, xem được đáp án sau khi nộp, đề publish hiển thị cho mọi Student của tenant. Giao đề theo lớp làm cùng với req Khoá học/Lớp.
**Trả lời:** Tôi nghĩ không giới hạn nhưng không cho xem đáp án, chỉ hiển thị tổng số câu đúng thôi. Nếu cho xem đáp án thì làm lần 2 là điểm tuyệt đối hết rồi.

### I6. Xác nhận tên dự án
Dòng 65 ghi "sử dụng lại của `lang-general`": đây là nhầm tên, ý là `lightc-general`, đúng không?
**Trả lời:** Đúng, tôi nhầm tên.

---

## J. Giao diện

### J1. 🔴 Trang chính (layout public)
`lightc-general` không có trang chính, chỉ có `/login`; có mockup `design/Home.html`.
- Trang chính gồm những gì: landing giới thiệu dịch vụ, bảng giá, CTA đăng ký tenant...?
- Dựa theo `lightc-general/design/Home.html` được không?
- Sau khi đăng nhập, Registered User **chưa thuộc tenant nào** sẽ thấy gì? (Đề xuất: trang "Không gian của tôi" với nút "Tạo trung tâm" và danh sách tenant đã tham gia.)

**Trả lời:** Đã trả lời ở F4, nhưng tôi đồng ý với trang `không gian của tôi`

### J2. Mức độ copy UI
Frontend `lightc-general` dùng component tự viết + Tailwind, theme Solarized Light, không dùng shadcn.
**Đề xuất:**
- Copy nguyên theme (CSS variables), dashboard layout (sidebar 260px, header 68px), các component `ui/*`, `api.ts`, `ConfirmDialog`, `Pagination`, `Modal`, `GlobalLoadingBar`.
- Sidebar chuyển từ hardcode sang menu cấu hình theo ngữ cảnh/role.
- Không đổi sang shadcn.

**Trả lời:** OK

### J3. Tính năng không liên quan
Vocabulary, jp-tango, jp-reading, md-docs, gcp-usage, labs...
**Đề xuất:** **không** copy; chỉ copy layout, component chung, và toàn bộ exam editor / simulator / grading.
**Trả lời:** OK

### J4. Thương hiệu & ngôn ngữ
- Tên hiển thị của sản phẩm: "Lang Simulator" hay tên khác? Có logo chưa?
- UI chỉ tiếng Việt như `lightc-general`, hay cần i18n (vi/en/ja) ngay từ đầu?

**Đề xuất:** tên tạm "Lang Simulator", logo dùng icon lucide. Chỉ tiếng Việt, nhưng gom chuỗi vào file để dễ i18n sau.
**Trả lời:** OK để tạm

---

## K. Deploy

### K1. 🔴 Cách deploy lên VPS
**Đề xuất:** giống `lightc-general`:
- 1 image chứa cả `lang-app` và `lang-api`.
- Trong container, Next listen 3000 và Nest listen 3002 (nội bộ); compose map `3001:3000` ra host.
- Thư mục VPS là `/opt/lang-simulator`; nối vào network `postgres_default` dùng chung.
- GitHub Actions deploy khi push `main`.
- Build bằng `turbo prune` để image chỉ chứa 2 app cần thiết.

Câu hỏi:
- Có domain/SSL cho dự án này chưa, hay truy cập `http://<ip>:3001`?
- Có tách 2 container riêng (app / api) không?
- Đồng ý dùng chung bộ secrets `VPS_HOST/VPS_USER/VPS_SSH_KEY/GHCR_TOKEN` của `lightc-general` không?

**Trả lời:** Truy cập `http://<ip>:3001`, dùng chung container và secret VPS của `lightc-general`.

### K2. Môi trường
Chỉ có **dev (local)** và **production (VPS)** như `lightc-general`, hay cần thêm staging?
**Trả lời:** Giống `lightc-general`

---

## L. Lưu ý phát hiện thêm (không cần trả lời, sẽ xử lý trong plan)
- `lightc-general/backend/.env.example` và `README.md` đang chứa **mật khẩu thật** (DB, admin). Dự án mới sẽ không copy các giá trị này. Nên đổi mật khẩu bên `lightc-general`.
- `JWT_SECRET` của `lightc-general` rơi về `'dev_secret'` khi thiếu env. Dự án mới sẽ **bắt buộc** env này và dừng khởi động nếu thiếu.
- Rewrite `/api` trong Next standalone được "đóng băng" lúc build, nên `BACKEND_INTERNAL_URL` ở runtime không có tác dụng. Dự án mới sẽ cấu hình port backend nội bộ ngay lúc build.
- Editor `lightc-general` import `@platejs/indent` nhưng chưa khai báo trong `package.json`. Sẽ khai báo đầy đủ khi copy.

---
---

# Vòng 2 – Câu hỏi bổ sung (phát sinh từ câu trả lời vòng 1)

> Trả lời như vòng 1. Câu 🔴 ảnh hưởng trực tiếp tới thiết kế DB/luồng chính.

## M1. 🔴 Cấu trúc Section → Part trong giả lập thi (tiếp I3)
Đã rõ: **Section** (mỗi section 1 tab editor, có timer) > **Part** (indicator `part` như `lightc-general`, vd. mỗi passage 1 part) > Subpart > Question.
Ghi chú: trong `lightc-general`, `seconds` trên indicator **chỉ là thời gian nói của câu Speaking**, không phải timer của Part. Nên timer chỉ có ở cấp Section.

Các điểm chưa rõ:
1. **Đánh số câu:** liên tục **qua các section** (Listening 1–100, Reading 101–200) hay **đánh lại từ 1** ở mỗi section?
2. **Trong 1 section:** giữ nguyên giao diện `lightc-general`: mỗi Part là 1 tab, passage bên trái, câu hỏi bên phải, lưới câu hỏi ở footer. Lưới câu hỏi chỉ hiện câu của **section hiện tại**. Đúng không?
3. **Nội dung đứng trước Part đầu tiên** của section (`intro` trong `lightc-general`, vd. hướng dẫn làm bài): hiển thị thành **màn hình hướng dẫn trước khi bắt đầu tính giờ** section đó, hay hiển thị chung trong tab đầu tiên?
4. **Chuyển section:** hết giờ thì tự chuyển. Học viên có được **nộp sớm** section để sang section tiếp không? Giữa 2 section có **màn hình chờ** ("Bắt đầu section tiếp theo", timer chỉ chạy khi bấm) không?

**Đề xuất:**
1. Đánh số liên tục toàn đề.
2. Đúng như mô tả.
3. Màn hình hướng dẫn trước khi bắt đầu tính giờ.
4. Cho nộp sớm, có màn hình chờ, timer bắt đầu khi bấm.

**Trả lời:** 1. Tôi nghĩ trong đề thi thật thì đánh số lại từ đầu cho mỗi section, với tôi mỗi platejs editor khi soạn nội dung là độc lập. 2. Đồng ý. 3. Đồng ý. 4. Đồng ý

## M2. 🔴 Version bằng cột `version` trên `exam_sections` (tiếp H2)
Thiết kế theo câu trả lời của bạn:
- `exams.current_version` (int): version đang active.
- `exam_sections(exam_id, version, status active|deactivated, name, sort_order, duration_minutes, raw_data, content_public)`: các section cùng `version` hợp thành 1 phiên bản đề.
- `exam_parts` / `exam_questions` gắn vào từng dòng `exam_sections`.
- `exam_attempts(exam_id, version)`: bài làm trỏ tới version cụ thể.

Câu hỏi về **khôi phục version cũ**:
- (a) Khôi phục version k = **lưu nội dung của version k như một lần Save mới**, áp dụng quy tắc H3: current chưa có bài làm thì ghi đè current, có bài làm thì tạo version N+1. Lịch sử luôn đi tiếp, không quay ngược.
- (b) **Kích hoạt lại** version k (đổi thành active), deactivate version hiện tại.

**Đề xuất:** (a), vì không phá quy tắc H3 và bài làm cũ luôn giữ đúng nội dung đã thi. Trang lịch sử version hiện số version, ngày tạo, người tạo, số bài làm, và nút "Khôi phục".
**Trả lời:** OK

## M3. Đổi blueprint & thao tác section (tiếp G5)
1. **Đổi blueprint** sau khi tạo đề: chỉ đổi `blueprint_id` (đề chuyển sang loại đề mới), **giữ nguyên** các section hiện có? Hay hỏi người dùng có muốn **sinh lại** section theo module của blueprint mới (mất nội dung cũ)?
2. Thêm/xoá/đổi tên/sắp xếp section có tính là **thay đổi nội dung** và áp dụng quy tắc H3 không (có bài làm thì tạo version mới)?
3. Duration của **section** cũng theo **bội số 5, tối đa 180 phút** như module? Đề phải có **ít nhất 1 section**?

**Đề xuất:**
1. Giữ nguyên section, có thêm nút tuỳ chọn "Thêm section từ module của blueprint".
2. Có áp dụng quy tắc H3.
3. Có, và bắt buộc ≥ 1 section.

**Trả lời:** OK

## M4. 🔴 Gói dịch vụ tenant (tiếp E2)
1. Giới hạn 100 / 500 / 1000 tính trên **tất cả membership** (gồm Owner, Admin, Teacher, Parent) hay **chỉ Student**?
2. Gói là **bảng `service_plans`** do System Owner/Admin quản lý (thêm/sửa được: tên, số thành viên tối đa, giá...) hay **cố định 3 mức** trong code?
3. Ai gán gói: người đăng ký **chọn khi đăng ký tenant**, System Admin xác nhận khi duyệt? Có đổi gói sau đó được không?
4. Thanh toán, thời hạn gói, hết hạn: **ngoài phạm vi req-1**, đúng không?
5. Khi đạt giới hạn: chặn thêm thành viên mới. Đúng không?

**Đề xuất:**
1. Tính tất cả membership đang active.
2. Bảng `service_plans`, seed sẵn 3 gói.
3. Chọn khi đăng ký, System Admin duyệt và được đổi gói.
4. Đúng, ngoài phạm vi req-1.
5. Đúng.

**Trả lời:** 1. Tất cả membership đang active. 2. Đồng ý. 3. Đồng ý. 4. Đồng ý. 5. Đồng ý

## M5. 🔴 Trang chủ, khu vực học viên & URL (tiếp F4, J1)
1. **Landing page** "giới thiệu sơ sơ trung tâm" là:
   - (a) **1 landing chung** giới thiệu nền tảng Lang Simulator (dành cho trung tâm muốn đăng ký), hay
   - (b) **Mỗi tenant có 1 trang giới thiệu** riêng tại `/t/{slug}` (tên, logo, mô tả trung tâm), hay
   - (c) cả hai?
2. **Ai được thi** ở khu vực học viên: **chỉ role Student**, hay mọi thành viên (Teacher, Admin, Parent cũng thi được)? Nếu Teacher thi thử thì bài làm đó có tính là "đã có người làm bài" (H3) không?
3. Người **chưa là thành viên** vào `/t/{slug}` thì thấy gì?
4. Giao diện layout chính dựa theo mockup `lightc-general/design/Home.html` hay tự thiết kế theo cùng theme?

**Đề xuất URL:**
```
/                          landing chung
/login, /register
/me                        Không gian của tôi (danh sách tenant, nút Tạo trung tâm)
/t/{slug}                  giới thiệu trung tâm + danh sách đề đã publish (nếu là thành viên)
/t/{slug}/exams/{id}       thông tin đề, nút Bắt đầu / lịch sử lượt làm
/t/{slug}/attempts/{id}    làm bài / kết quả
/admin/...                 dashboard System Owner/Admin
/t/{slug}/dashboard/...    dashboard Tenant (Owner/Admin/Teacher)
```
**Đề xuất cho các câu:**
1. (c).
2. Chỉ Student thi; Teacher/Admin dùng Preview trong dashboard, không tạo bài làm.
3. Chỉ thấy phần giới thiệu.
4. Dựa theo `design/Home.html`.

**Trả lời:** 1. Đồng ý. 2. Ai trong tenant cũng được thi. 3. Đồng ý. 4. Đồng ý

## M6. Ai được publish đề (H5 chưa có câu trả lời)
**Đề xuất:** Teacher publish/unpublish đề **do mình tạo**; Tenant Owner/Admin publish được mọi đề.
**Trả lời:** OK

## M7. 🔴 Giáo viên chấm bài (tiếp I4)
1. **Cách chấm** Writing/Speaking:
   - (a) Giáo viên chấm **Đúng/Sai**, câu đó cộng vào "x / y câu đúng" như câu tự động.
   - (b) Giáo viên cho **điểm** (vd. 0–10 hoặc 0–`max_score`) + nhận xét, hiển thị riêng với số câu đúng tự động.
2. Giáo viên có được **sửa kết quả chấm tự động** không?
3. Ngoài Teacher, **Tenant Owner/Admin** có được chấm không?
4. Học viên có xem được **nhận xét** của giáo viên cho câu Writing/Speaking không (không lộ đáp án câu trắc nghiệm)?
5. Khi chưa chấm xong, kết quả hiển thị thế nào?
6. **Ghi âm Speaking:** ghi âm trên trình duyệt ngay trong lúc thi, `seconds` của câu Speaking là **thời gian ghi âm tối đa**. Có cho **ghi âm lại** không? Có cần **thời gian chuẩn bị** trước khi ghi âm không?

**Đề xuất:**
1. (b): điểm 0–10 + nhận xét.
2. Không.
3. Có.
4. Có.
5. Trạng thái "Chờ chấm", hiện kết quả phần tự động.
6. Cho ghi âm lại trong thời gian của section, chưa cần thời gian chuẩn bị.
- Thêm trang **"Chấm bài"** trong dashboard tenant: danh sách bài làm cần chấm, lọc theo đề / học viên / trạng thái.

**Trả lời:** OK

## M8. Mức hiển thị kết quả cho học viên (tiếp I5)
Đã rõ: không cho xem đáp án, chỉ hiển thị tổng số câu đúng.
- Có hiển thị **số câu đúng theo từng section** (vd. Listening 78/100, Reading 85/100) không?
- Học viên có xem được **lịch sử các lượt làm** (ngày, số câu đúng) không?
- Có đánh dấu **câu nào sai** (không hiện đáp án đúng) không? Theo câu trả lời thì là không.

**Đề xuất:** có theo từng section, có lịch sử lượt làm, không đánh dấu câu sai.
**Trả lời:** OK

## M9. 🔴 Người dùng dưới 18 tuổi (tiếp D3)
1. Người dưới 18 tuổi có được **tự đăng ký** account không? Có **độ tuổi tối thiểu** không?
2. Người dưới 18 tuổi có được **tạo tenant** không?
3. Học viên nhỏ tuổi thường **không có email**. Khi Tenant Admin tạo account cho các em (F1-d), có cho phép account **không có email** (đăng nhập bằng username do trung tâm cấp) không? Hay bắt buộc email (dùng email phụ huynh...)?

**Đề xuất:**
1. Được tự đăng ký, không đặt tuổi tối thiểu.
2. Chỉ người ≥ 18 tuổi mới được tạo tenant.
3. Bắt buộc email trong req-1 (đơn giản, unique). Đăng nhập bằng username để req sau.

**Trả lời:** OK

## M10. Tenant đang chờ duyệt (tiếp E1)
- Khi tenant ở trạng thái `pending`, Owner có **vào dashboard tenant để chuẩn bị trước** (tạo đề, thêm thành viên) không?
- System Admin **từ chối** thì sao: trạng thái `rejected` + lý do, người dùng sửa và gửi lại?

**Đề xuất:** `pending` thì chưa vào được dashboard, "Không gian của tôi" hiện trạng thái chờ duyệt. Có trạng thái `rejected` + lý do, cho sửa và gửi lại.
**Trả lời:** OK

## M11. Quyền quản lý Danh mục / Loại đề (tiếp G1-c)
- Danh mục/loại đề **hệ thống** (`tenant_id = NULL`) do System Owner/Admin quản lý trong dashboard `/admin`. Tenant chỉ xem và dùng. Đúng không?
- Danh mục/loại đề **riêng của tenant**: ai được tạo/sửa? Chỉ Tenant Owner/Admin, hay Teacher cũng được?

**Đề xuất:** đúng như trên; riêng của tenant thì chỉ Tenant Owner/Admin tạo/sửa, Teacher chỉ xem và dùng.
**Trả lời:** OK

## M12. File ghi âm & quyền riêng tư (tiếp C1)
Theo `lightc-general`, file trên R2 được truy cập qua **URL public**. Ảnh/audio của đề thi để public thì ổn, nhưng **ghi âm Speaking của học viên** là dữ liệu cá nhân.
**Đề xuất:**
- File đề thi: public URL như `lightc-general`.
- Ghi âm học viên: lưu **private**, chỉ phát qua **presigned URL có hạn** (vd. 10 phút) cho học viên đó và giáo viên chấm.

Bucket mới cần các env `R2_BUCKET`, `R2_PUBLIC_BASE_URL` (và dùng lại account/token R2 hiện có hay tạo token mới?).
**Trả lời:** Dùng lại account/token R2 hiện có.

## M13. Thống kê theo câu (tiếp H1)
**Đề xuất:** req-1 **lưu dữ liệu đủ cho thống kê** (`exam_attempt_answers` gắn `exam_question_id`, có `is_correct`). **Trang thống kê** (tỉ lệ đúng từng câu) để req sau.
**Trả lời:** OK

## M14. Xác nhận "dùng chung container" (tiếp K1)
Hiểu là: **1 container riêng cho lang-simulator** chứa cả `lang-app` + `lang-api` (giống mô hình của `lightc-general`), **không** chạy chung trong container `lightc-app`. Đúng không?
**Trả lời:** Đúng.
