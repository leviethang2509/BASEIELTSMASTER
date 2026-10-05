# Requirement 1 – Kế hoạch implement

> Nguồn: [req-1.md](req-1.md) và các câu trả lời trong [req-1-question.md](req-1-question.md) (vòng 1 + vòng 2).
> Dự án tham chiếu: `/Users/vunguyen/Projects/lightc-general` (viết tắt **LC**). Đường dẫn `LC-FE/...` = `lightc-general/frontend/src/...`, `LC-BE/...` = `lightc-general/backend/src/...`.

---

## 1. Tóm tắt quyết định đã chốt

### Kiến trúc & hạ tầng
| Mục | Quyết định |
|---|---|
| Monorepo | pnpm 11 workspaces + Turborepo, **Node 24** (đổi từ Node 20 lúc làm Step 1: Node 20 đã EOL 4/2026 và pnpm 11 cần Node ≥ 22.13). `apps/lang-app` (Next.js), `apps/lang-api` (NestJS), `packages/exam-core`, `packages/shared`, `packages/tsconfig`, `packages/eslint-config` |
| Stack | Giữ như LC: Next.js 14.2 App Router + React 18 + Tailwind 3 + Plate.js 53 (không shadcn); NestJS 10 + TypeORM 0.3 + PostgreSQL. TypeScript **5.9** (typescript-eslint chưa hỗ trợ TS 7), ESLint **10** (flat config; ESLint 9 đã hết hỗ trợ) |
| Tooling | ESLint + Prettier; Jest cho `lang-api` và `exam-core` (chỉ test logic quan trọng) |
| Git | `git init`, repo `vunguyenquangit/lang-simulator`, image `ghcr.io/vunguyenquangit/lang-simulator` |
| Port | Local: app `3100`, api `3101`. VPS: host `3001` → container (Next 3000, Nest 3002 nội bộ) |
| Database | **Database riêng `lang-simulator`**, schema **`public`**, trên Postgres của VPS (user `lang_simulator`). Máy dev và container trên VPS (:3001) **dùng chung** database này. Chưa có production; database production chốt sau (đổi ngày 2026-09-15, thay cho "chung database LC, schema `lang_simulator`" và "dev Postgres local `lang_simulator_dev`"). **Đổi 2026-09-19 (req-3, U7):** máy dev chuyển sang Postgres local `lang_simulator_dev`, database VPS chỉ còn container :3001 dùng |
| Migration | TypeORM migrations, `synchronize: false` mọi môi trường, chạy migration khi container khởi động |
| Quy ước DB | PK uuid, snake_case, `created_at/updated_at`; soft delete `deleted_at` cho users/tenants/memberships/exams; `created_by/updated_by` cho bảng nội dung |
| Upload | R2, **bucket riêng** (bạn tạo), dùng lại account/token R2 hiện có; upload qua server như LC; quota để sau |
| GCP | Không mang sang |
| Deploy | 1 image, 1 container riêng cho lang-simulator; GitHub Actions push `main`; truy cập `http://<ip>:3001`; hiện VPS chỉ là môi trường dev (chưa có production) |

### Tài khoản, tenant, membership
| Mục | Quyết định |
|---|---|
| Token | Access JWT 15 phút + refresh token httpOnly cookie (lưu DB, thu hồi được); guard kiểm tra DB (`status`, `token_version`); `middleware.ts` ở Next. Xoay refresh token: token cũ bị dùng lại trong **30 giây** (nhiều tab) vẫn được cấp token mới, quá 30 giây thì thu hồi cả family (chốt 2026-09-15) |
| Đăng ký | Công khai email + mật khẩu; đổi mật khẩu. Xác thực email, quên mật khẩu, OAuth để sau (chuẩn bị cột `email_verified_at`) |
| User | Theo bảng D3; `date_of_birth` **bắt buộc**; email bắt buộc & unique |
| Dưới 18 | Được tự đăng ký, không tuổi tối thiểu; **chỉ ≥ 18 tuổi mới được tạo tenant** |
| System role | Nhiều Owner được; Owner đầu tiên tạo bằng seed; chỉ Owner quản lý Admin; Admin tạo/sửa/khoá user thường & tenant, xem được Owner nhưng không sửa |
| System ↔ tenant | System Owner/Admin chỉ xem danh sách + chi tiết cơ bản tenant; không vào nội dung tenant (trừ khi là member) |
| Tenant | Đăng ký → `pending` → System Admin duyệt `active` / từ chối `rejected` + lý do (sửa & gửi lại). `pending` chưa vào dashboard. Không giới hạn số tenant/user |
| Gói dịch vụ | Bảng `service_plans` (seed 3 gói: 100/500/1000 thành viên), chọn khi đăng ký, System Admin duyệt & đổi được. Giới hạn tính **mọi membership active**; đạt giới hạn → chặn thêm. Thanh toán/thời hạn ngoài phạm vi. **Hạ gói** (chốt 2026-09-15): System Admin đổi, có hiệu lực ngay, không deactivate ai; tenant vượt giới hạn chỉ bị chặn thêm/mở lại thành viên, dashboard tenant cảnh báo và gợi ý Học viên/Phụ huynh lâu không vào tenant để Owner/Admin tự deactivate. Khi có thời hạn gói (req sau) thì chuyển sang hạ vào cuối kỳ |
| URL tenant | Theo path `/t/{slug}/...`; dữ liệu dùng chung bảng, cột `tenant_id` |
| Tenant Owner | Đúng 1; chuyển quyền để req sau; Tenant Admin quản lý mọi role (kể cả Tenant Admin) trừ Owner |
| Thêm thành viên | (b) thêm theo email account có sẵn + (d) tạo account mới |
| Membership | 1 membership / (tenant, user), nhiều role. Chưa có khoá học/lớp |
| Parent | `student_guardians` nhiều–nhiều, **tuỳ chọn**; req-1 có bảng + UI gắn liên kết, trang xem kết quả con để sau |
| Ngữ cảnh | Nhiều ngữ cảnh → trang "Không gian của tôi" (`/me`); 1 ngữ cảnh → vào thẳng; sidebar có switcher |

### Đề thi
| Mục | Quyết định |
|---|---|
| Category/Blueprint | Phạm vi (c): hệ thống (`tenant_id NULL`, System Owner/Admin quản lý) + riêng tenant (Tenant Owner/Admin quản lý, Teacher chỉ xem/dùng) |
| Module | `reference_duration_minutes`: bội số 5, tối đa 180. Không thêm trường tham khảo. Quy đổi điểm để sau |
| Exam ↔ blueprint | Section **snapshot** độc lập với blueprint/module. Cho **thêm/xoá/đổi tên/sắp xếp** section; cho **đổi blueprint** (giữ section, có nút "Thêm section từ module"). Duration section bội số 5, ≤ 180; ≥ 1 section |
| Parse nội dung | `exam_sections.raw_data` (Plate nguyên văn) + `content_public` (đã bỏ đáp án) + `exam_parts` + `exam_questions` (có `answer_key`) |
| Version | Cột `version` trên `exam_sections` + `exams.current_version`. Khôi phục version k = Save lại nội dung version k (theo quy tắc ghi đè/tạo mới). Không so sánh version |
| Quy tắc Save | Version hiện tại **có bất kỳ attempt nào** (kể cả đang làm) → tạo version mới, version cũ `deactivated`. Ngược lại → xoá & import lại. Sửa metadata `exams` không tạo version; sửa section (nội dung, duration, thêm/xoá/sắp xếp) có |
| Save/autosave | Autosave chỉ localStorage; nút Save lưu **toàn bộ tab trong 1 transaction**; cảnh báo "Sẽ tạo version mới" |
| Publish | `draft → published → archived`; chỉ publish khi validate không lỗi; xoá đề có bài làm = soft delete. Teacher publish đề của mình, Owner/Admin mọi đề |
| Quyền sửa | Teacher sửa đề mình tạo; Owner/Admin sửa tất cả |

### Thi & chấm
| Mục | Quyết định |
|---|---|
| Nơi thi | Khu vực chính (không phải dashboard): `/t/{slug}` → danh sách đề publish → thi. **Mọi thành viên tenant đều được thi** |
| Preview | Teacher/Admin preview trong dashboard, chấm ở client, không tạo attempt |
| Cấu trúc | Section (tab editor, timer) > Part (tab trong simulator, như LC) > Subpart > Question. **Đánh số lại từ 1 mỗi section** (mỗi editor độc lập) |
| Luồng thi | Màn hình hướng dẫn (intro của section) → bấm bắt đầu tính giờ → các tab Part → nộp sớm hoặc hết giờ tự nộp → màn hình chờ section kế → ... Timer lưu ở server. Lưới câu hỏi chỉ của section hiện tại |
| Chấm tự động | Phía server, dùng chung logic `exam-core`; API học viên không nhận đáp án |
| Chấm tay | Writing/Speaking: điểm 0–10 + nhận xét; Teacher/Owner/Admin chấm bất kỳ bài nào; không sửa kết quả tự động; chưa chấm xong → "Chờ chấm" + phần tự động; trang "Chấm bài" |
| Speaking | Ghi âm trên trình duyệt, `seconds` = thời gian ghi tối đa, cho ghi lại trong thời gian section, lưu R2 **private** (presigned URL) |
| Kết quả học viên | Không xem đáp án, không đánh dấu câu sai; có số câu đúng theo từng section, lịch sử lượt làm, điểm & nhận xét phần chấm tay. Không giới hạn số lượt |
| Thống kê | Lưu `exam_attempt_answers` gắn `exam_question_id` + `is_correct`; trang thống kê để sau |
| Giao diện | Copy theme/layout/components LC; không copy tính năng không liên quan; tên tạm "Lang Simulator", tiếng Việt, gom chuỗi để i18n sau; layout chính dựa `LC/design/Home.html` |

---

## 2. Giả định kỹ thuật (bạn xem lại, nếu không đồng ý hãy ghi chú)

1. **Cần 2 bucket R2.** R2 bật public access theo cả bucket, không theo prefix. Vì vậy dùng `lang-simulator-public` (ảnh/audio/video của đề, có public URL) và `lang-simulator-private` (ghi âm học viên, chỉ presigned URL).
2. **Cookie refresh không bật `Secure`** vì VPS đang chạy HTTP (`http://<ip>:3001`); điều khiển bằng env `COOKIE_SECURE=false`. Khi có domain + SSL thì đổi thành `true`.
3. Cookie refresh đặt `path=/`, `SameSite=Lax` để `middleware.ts` đọc được. FE gọi API cùng origin qua rewrite `/api` (cả local lẫn VPS), nên không cần CORS.
4. Account do Tenant Admin tạo (F1-d) có cờ **`must_change_password = true`**: lần đăng nhập đầu bắt buộc đổi mật khẩu. Mật khẩu tạm do admin nhập hoặc hệ thống sinh và hiển thị 1 lần.
5. Người chấm **không được chấm bài của chính mình**.
6. Attempt bỏ dở (đang ở màn hình chờ, chưa bắt đầu section kế) giữ trạng thái `in_progress`, học viên vào lại làm tiếp được. Theo quy tắc H3, attempt này vẫn khiến lần Save sau tạo version mới.
7. Autosave câu trả lời lên server: debounce 3 giây và khi chuyển tab Part. Sau `deadline` (+ 10 giây trễ mạng) server từ chối cập nhật.
8. Hết giờ được xử lý ở 2 nơi: client tự gọi nộp; server tự chốt khi có request tới attempt (lazy) **và** cron mỗi phút (`@nestjs/schedule`) chốt các section quá hạn.
9. Câu `ordering`/`polytomous` trong `content_public`: bỏ `num`, gán `key` = chỉ số gốc cho từng dòng, **xáo thứ tự ở server**. Câu trả lời gửi lên dùng `key`. (Chốt Step 9: xáo sẵn lúc Save và xáo lại theo `order_seed` của từng lượt làm; thứ tự hiển thị không bao giờ trùng đáp án.)
10. File ghi âm: `audio/webm` (opus), ≤ 10MB/file, ghi lại thì xoá file cũ.
11. Membership của Tenant Owner được tạo ngay khi đăng ký tenant và được tính vào giới hạn gói.
12. Seed dữ liệu mẫu hệ thống (sửa được):
    - Tiếng Anh:
      - TOEIC: Listening 45 phút, Reading 75 phút.
      - IELTS: Listening 30, Reading 60, Writing 60, Speaking 15.
    - Tiếng Nhật:
      - JLPT N2: Kiến thức ngôn ngữ & Đọc hiểu 105, Nghe 50.
13. Tên 3 gói tạm: `Basic` (100), `Standard` (500), `Pro` (1000). Giá để trống.

---

## 3. Việc bạn cần chuẩn bị (không code được thay)

| # | Việc | Cần trước step |
|---|---|---|
| P1 | ✅ 2026-09-16: 2 bucket R2 (`lang-simulator-public` bật public access, `lang-simulator-private` tắt public) + API token riêng cho lang-simulator; 6 biến `R2_*` đã điền ở `apps/lang-api/.env` và `deploy/.env` | Step 10 |
| P2 | Trên Postgres VPS (cần **Postgres ≥ 13**): database `lang-simulator` + user `lang_simulator` có quyền `CREATE` trên schema `public` (PG ≥ 15 mặc định không cấp cho user khác owner) | Step 4 |
| P3 | Tạo GitHub repo `vunguyenquangit/lang-simulator`; thêm secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PORT`, `GHCR_TOKEN` (secrets GitHub theo từng repo nên phải thêm lại, cùng giá trị với LC) | Step 4 |
| P4 | Trên VPS: tạo `/opt/lang-simulator/` chứa `.env` (soạn sẵn ở `deploy/.env` trên máy dev, copy lên bằng scp; `docker-compose.yml` do workflow tự copy), mở port 3001 trên firewall | Step 4 |
| P5 | Đổi mật khẩu DB/admin bên LC đang lộ trong `backend/.env.example` và `README.md` | Nên làm sớm |

---

## 4. Thiết kế dữ liệu (database `lang-simulator`, schema `public`)

> Mọi bảng có `id uuid PK`, `created_at`, `updated_at` trừ khi ghi khác. Enum lưu dạng Postgres enum hoặc `varchar` + check.

### 4.1 Tài khoản & phiên
```
users
  email varchar(254) luôn chữ thường, UNIQUE lower(email) (where deleted_at is null), password_hash, full_name, date_of_birth date NOT NULL,
  gender (male, female, other) NULL, phone NULL, avatar_url NULL, address NULL,
  locale default 'vi', timezone default 'Asia/Ho_Chi_Minh',
  system_role enum(SYSTEM_OWNER, SYSTEM_ADMIN, REGISTERED_USER) default REGISTERED_USER,
  status enum(active, locked) default active,
  must_change_password bool default false, token_version int default 0,
  email_verified_at NULL, last_login_at NULL, deleted_at NULL

refresh_tokens
  user_id FK, token_hash (sha256), family_id uuid, expires_at, revoked_at NULL,
  replaced_by_id NULL, user_agent, ip
```

### 4.2 Tenant & membership
```
service_plans
  code UNIQUE, name, max_members int, price numeric NULL, description, is_active, sort_order

tenants
  name, slug UNIQUE (where deleted_at is null), logo_url, description, email, phone, address,
  status enum(pending, active, rejected, suspended), rejection_reason NULL,
  plan_id FK service_plans, owner_user_id FK users,
  reviewed_by NULL, reviewed_at NULL, deleted_at NULL

memberships
  tenant_id FK, user_id FK, status enum(active, inactive), joined_at, created_by, deleted_at
  UNIQUE(tenant_id, user_id) where deleted_at is null

membership_roles
  membership_id FK, role enum(TENANT_OWNER, TENANT_ADMIN, TEACHER, STUDENT, PARENT)
  PK(membership_id, role)
  -- partial unique: mỗi tenant đúng 1 TENANT_OWNER (enforce ở service + unique index qua bảng phụ/trigger)

student_guardians
  tenant_id FK, student_membership_id FK, parent_membership_id FK, relationship NULL
  UNIQUE(student_membership_id, parent_membership_id)
```

### 4.3 Danh mục đề
```
exam_categories
  tenant_id NULL (NULL = hệ thống), name, code, description, icon, color, sort_order, is_active,
  created_by, updated_by
  UNIQUE(code) where tenant_id is null; UNIQUE(tenant_id, code) where tenant_id is not null

exam_blueprints
  tenant_id NULL, category_id FK, name, code, description, is_active, created_by, updated_by
  (unique code theo phạm vi như trên; blueprint tenant có thể thuộc category hệ thống)

exam_modules
  blueprint_id FK, name, code, sort_order, reference_duration_minutes (5..180, %5=0), description
```

### 4.4 Đề thi & version
```
exams
  tenant_id FK, blueprint_id FK, title, description,
  status enum(draft, published, archived), current_version int default 1,
  published_at NULL, created_by, updated_by, deleted_at NULL

exam_sections
  exam_id FK, version int, status enum(active, deactivated),
  module_id NULL (chỉ tham khảo, không ràng buộc), name, sort_order,
  duration_minutes (5..180, %5=0), raw_data jsonb, content_public jsonb,
  question_count int, created_by
  INDEX(exam_id, version)

exam_parts
  section_id FK ON DELETE CASCADE, parent_part_id NULL, kind enum(part, subpart),
  node_id (indicator id), sort_order, first_number NULL, last_number NULL

exam_questions
  section_id FK ON DELETE CASCADE, part_id NULL FK,
  number int (đánh số trong section, từ 1), node_id (indicator id), sub_index int (vị trí blank/cặp/pick trong indicator),
  qtype, grading enum(auto, manual), answer_key jsonb NULL, options jsonb NULL,
  params jsonb (seconds / maxChars / maxPicks), max_score numeric (auto = 1, manual = 10)
  UNIQUE(section_id, number)
```
> Step 12: thêm `exams.content_revision int` (chống ghi đè khi lưu); FK `exams.blueprint_id` NO ACTION thay cho RESTRICT; `exam_parts` UNIQUE(section_id, node_id); bảng `exam_attempts` (mục 4.5) tạo luôn ở Step 12.

### 4.5 Bài làm
```
exam_attempts
  tenant_id, exam_id FK, exam_version int, user_id FK, membership_id FK,
  status enum(in_progress, submitted, graded),
  started_at, submitted_at NULL, graded_at NULL,
  auto_correct int, auto_total int, manual_count int, manual_graded_count int
  INDEX(exam_id, exam_version)

exam_attempt_sections
  attempt_id FK, section_id FK, sort_order,
  status enum(not_started, in_progress, submitted),
  started_at NULL, deadline_at NULL, submitted_at NULL, auto_submitted bool,
  responses jsonb (định dạng Responses của exam-core), order_seed int,
  correct int NULL, total int NULL

exam_attempt_answers                  -- sinh khi nộp section, phục vụ chấm tay + thống kê
  attempt_id FK, attempt_section_id FK, question_id FK exam_questions,
  response jsonb NULL, is_correct bool NULL, score numeric NULL, comment text NULL,
  recording_key NULL (R2 private), graded_by NULL, graded_at NULL
  UNIQUE(attempt_id, question_id)
```

### 4.6 Thuật toán Save nội dung đề (`PUT /t/:slug/exams/:id/content`)
```
BEGIN
  SELECT * FROM exams WHERE id = :id FOR UPDATE
  kiểm tra quyền (Teacher = created_by, hoặc Owner/Admin)
  validate payload bằng exam-core: ≥1 section, duration hợp lệ, không có data: URI, cấu trúc Plate hợp lệ
  hasAttempts = EXISTS(attempts WHERE exam_id AND exam_version = current_version)
  IF hasAttempts:
     UPDATE exam_sections SET status='deactivated' WHERE exam_id AND version = current_version
     v = current_version + 1; UPDATE exams SET current_version = v
  ELSE:
     DELETE exam_sections WHERE exam_id AND version = current_version   -- cascade parts/questions
     v = current_version
  FOR each section: extractStructure(raw_data) → INSERT exam_sections(version=v, status=active, content_public=stripAnswers(...)),
                    INSERT exam_parts, exam_questions
COMMIT
```
- Bắt đầu attempt cũng `SELECT exams ... FOR SHARE` và đọc `current_version` trong transaction, để tránh race với Save.
- Khôi phục version k: đọc `raw_data` + metadata các section của version k, rồi gọi đúng thuật toán trên.

---

## 5. Phân quyền

### 5.1 Hệ thống (`/api/admin/*`, `/admin`)
| Hành động | System Owner | System Admin |
|---|---|---|
| Xem thống kê, danh sách user/tenant | ✔ | ✔ |
| Tạo/sửa/khoá/reset mật khẩu user thường | ✔ | ✔ |
| Sửa/khoá user SYSTEM_OWNER | ✔ (không tự hạ quyền nếu là Owner cuối cùng) | ✘ (chỉ xem) |
| Đổi `system_role` (nâng/hạ Admin, Owner) | ✔ | ✘ |
| Duyệt/từ chối/khoá tenant, đổi gói | ✔ | ✔ |
| CRUD service plans | ✔ | ✔ |
| CRUD category/blueprint hệ thống | ✔ | ✔ |

### 5.2 Tenant (`/api/t/:slug/*`, `/t/{slug}/dashboard`)
| Hành động | Owner | Admin | Teacher | Student | Parent |
|---|---|---|---|---|---|
| Dashboard tenant | ✔ | ✔ | ✔ (tổng quan rút gọn) | ✘ | ✘ |
| Quản lý membership | ✔ | ✔ (không đụng Owner, không cấp TENANT_OWNER) | ✘ | ✘ | ✘ |
| Gắn Parent ↔ Student | ✔ | ✔ | ✘ | ✘ | ✘ |
| CRUD category/blueprint của tenant | ✔ | ✔ | xem | ✘ | ✘ |
| Tạo đề | ✔ | ✔ | ✔ | ✘ | ✘ |
| Sửa/publish/archive/xoá/khôi phục version | mọi đề | mọi đề | đề mình tạo | ✘ | ✘ |
| Upload media đề | ✔ | ✔ | ✔ | ✘ | ✘ |
| Chấm bài (trừ bài của mình) | ✔ | ✔ | ✔ | ✘ | ✘ |
| Xem & thi đề đã publish | ✔ | ✔ | ✔ | ✔ | ✔ |

Guard backend:
- `JwtAuthGuard`: xác thực token và tải user từ DB, kiểm tra `status` và `token_version`.
- `SystemRolesGuard` + `@SystemRoles()`.
- `TenantGuard`: resolve `:slug` → tenant `active` → membership active + roles → gắn vào `req.tenantCtx`.
- `@TenantRoles()`.
- Kiểm tra quyền sở hữu đề nằm trong service.

---

## 6. Cấu trúc route

### 6.1 Frontend (`apps/lang-app/src/app`)
```
(site)/                         layout chính (header/footer theo design/Home.html)
  page.tsx                      /                     landing chung
  login/, register/             /login, /register     (theo design/Auth.html + LC login)
  me/page.tsx                   /me                   Không gian của tôi: thẻ "Quản trị hệ thống", danh sách tenant (trạng thái, role), nút Tạo trung tâm
  me/account/                   /me/account           hồ sơ, đổi mật khẩu
  me/tenants/new, [id]/edit     đăng ký / sửa & gửi lại tenant
  t/[slug]/page.tsx             /t/{slug}             giới thiệu trung tâm; nếu là member: danh sách đề publish (lọc category/blueprint)
  t/[slug]/exams/[examId]/      thông tin đề, nút Bắt đầu, lịch sử lượt làm
  t/[slug]/attempts/[id]/result kết quả lượt làm
(exam)/t/[slug]/attempts/[id]/  layout toàn màn hình cho giả lập thi
(dashboard)/                    layout dashboard copy LC (sidebar 260px, header 68px)
  admin/                        /admin            tổng quan hệ thống
  admin/users, admin/tenants, admin/plans, admin/exam-categories, admin/exam-blueprints
  t/[slug]/dashboard/           tổng quan tenant
  t/[slug]/dashboard/members, exam-categories, exam-blueprints, exams, exams/[id]/edit, exams/[id]/versions, grading, grading/[attemptId]
middleware.ts                   chặn /me, /admin, /t/*/dashboard, /t/*/attempts khi không có cookie refresh
```
Sau đăng nhập:
- `must_change_password` → `/me/account`.
- Nhiều ngữ cảnh, hoặc chưa có ngữ cảnh nào → `/me`.
- Chỉ system → `/admin`.
- Chỉ 1 tenant và có role quản trị/Teacher → `/t/{slug}/dashboard`, còn lại → `/t/{slug}`.

### 6.2 Backend (`/api`)
```
auth:        POST register, login, refresh, logout · GET me · POST change-password
me:          GET contexts · PATCH profile
public:      GET plans · GET tenants/:slug
tenants:     POST (đăng ký, ≥18) · GET mine · PUT :id (sửa & gửi lại khi rejected)
admin:       GET stats · users CRUD + lock + reset-password + system-role · tenants list/detail/approve/reject/suspend/plan
             plans CRUD · exam-categories CRUD · exam-blueprints CRUD (kèm modules)
t/:slug:     GET dashboard/stats
             memberships: list · add-by-email · create-account · PATCH roles/status · DELETE · guardians add/remove · GET deactivation-suggestions
             exam-categories, exam-blueprints: list (hệ thống + tenant) · POST/PATCH/DELETE (tenant)
             exams: list (lọc q/status/categoryId/blueprintId/createdBy) · GET creators · POST (từ blueprint) · GET :id (kèm raw_data version hiện tại, hasAttempts, contentRevision) · PATCH metadata/blueprint
                    PUT :id/content (baseRevision) · GET :id/versions · GET :id/versions/:v · POST :id/versions/:v/restore (baseRevision)
                    POST :id/publish · POST :id/archive · DELETE :id
             media: POST upload (bucket public)
             learner: GET exams (published) · GET exams/:id (info + attempts của tôi)
                      POST exams/:id/attempts · GET attempts/:id
                      POST attempts/:id/sections/:sid/start · PUT .../responses · POST .../submit
                      POST attempts/:id/recordings · GET attempts/:id/recordings/:answerId/url
                      GET attempts/:id/result
             grading: GET attempts (lọc exam/học viên/trạng thái) · GET attempts/:id · PUT answers/:answerId (score, comment)
health:      GET /api/health
```

---

## 7. Các step implement

> Mỗi step kết thúc bằng: build/lint/test pass, và đạt **tiêu chí nghiệm thu**. Làm lần lượt; step 4 deploy sớm để phát hiện sớm vấn đề Docker/turbo.

### Step 1 – Khởi tạo monorepo
**Việc làm**
- `git init`, `.gitignore`, `.editorconfig`, `.nvmrc` (24), `pnpm-workspace.yaml`, `turbo.json` (pipeline `build`, `dev`, `lint`, `test`, `typecheck`).
- Root `package.json`: `dev` (turbo chạy song song app 3100 + api 3101), `build`, `lint`, `test`, `format`.
- `packages/tsconfig` (base, nextjs, nestjs), `packages/eslint-config`, Prettier config.
- `packages/shared`: enum `SystemRole`, `TenantRole`, `TenantStatus`, `ExamStatus`…, type DTO dùng chung, hằng số (duration 5..180).
- `packages/exam-core`: khung rỗng, build bằng `tsup` (xuất CJS cho Nest + ESM cho Next).
- `README.md` (cách chạy local), `CLAUDE.md` (quy ước dự án, trỏ tới `docs/requirements`).

**Nghiệm thu:** `pnpm install && pnpm build && pnpm lint` chạy thành công ở root.

### Step 2 – Khung `lang-api`
**Việc làm**
- NestJS 10: `main.ts` (prefix `api`, port env, `ValidationPipe` như LC, JSON limit 2mb, `cookie-parser`), `app.module.ts`.
- Config: `@nestjs/config` + validate env khi khởi động. Thiếu `JWT_SECRET`, `DB_*`… thì dừng. Không có fallback kiểu `dev_secret`.
- TypeORM: `data-source.ts` dùng chung cho app và CLI, `schema: 'lang_simulator'`, `migrationsTableName`, `synchronize: false`.
- Script `migrate.ts`: `CREATE SCHEMA IF NOT EXISTS lang_simulator`, sau đó `runMigrations`. Scripts `migration:generate`, `migration:run`, `migration:revert`, `seed`.
- Common: exception filter (format lỗi `{ statusCode, message }` như LC), pagination DTO/helper, `@CurrentUser()`, `Logger`.
- `GET /api/health`, Jest config.
- Env mẫu `.env.example` (không chứa giá trị thật).

**Nghiệm thu:** `pnpm --filter lang-api dev` chạy ở 3101, `/api/health` trả 200, migrate tạo được schema trên DB local.

> Cập nhật 2026-09-15: schema lấy từ env `DB_SCHEMA` (mặc định `public`); `migrate.ts` chỉ `CREATE SCHEMA` khi schema chưa tồn tại (tránh đòi quyền `CREATE` trên database). Dev nối database `lang-simulator` trên VPS.

### Step 3 – Khung `lang-app` (copy UI LC)
**Việc làm**
- Next 14.2 App Router.
  - `next.config.mjs`: `output: 'standalone'`, `experimental.outputFileTracingRoot` = root monorepo, `transpilePackages: ['@lang/exam-core', '@lang/shared']`.
  - Rewrite `/api/:path*` → `BACKEND_INTERNAL_URL` (local `http://127.0.0.1:3101`, cố định lúc build).
- Copy & đổi tên:
  - `LC-FE/app/globals.css` (bỏ các class không dùng, đổi `lc-*` → `ls-*`), `tailwind.config.ts`, fonts trong `LC-FE/app/layout.tsx`.
  - `LC-FE/components/ui/*`, `LC-FE/components/GlobalLoadingBar.tsx`.
  - `LC-FE/lib/api.ts`: sửa thành access token lưu **trong bộ nhớ**, tự gọi `/auth/refresh` khi gặp 401 rồi thử lại 1 lần, `credentials: 'include'`.
- Layout dashboard từ `LC-FE/app/(dashboard)/layout.tsx`:
  - Sidebar đọc **menu cấu hình** theo ngữ cảnh (`system` / `tenant` + roles), thay cho `GROUPS` hardcode.
  - Thêm **context switcher** (System / các tenant).
  - Header hiển thị tiêu đề trang động.
- Khung các route group `(site)`, `(dashboard)`, `(exam)`; trang tạm; `middleware.ts`.
- `src/i18n/vi.ts`: gom chuỗi UI.
- Branding "Lang Simulator", icon lucide `Languages`.

**Nghiệm thu:** `pnpm dev` mở được `http://localhost:3100`, layout dashboard hiển thị giống LC, `/api/health` gọi qua rewrite OK.

> Cập nhật khi làm Step 3: chỉ copy các component `ui/*` đã theo theme Solarized (`Modal`, `ConfirmDialog`, `PromptDialog`, `Pagination`, `TagMultiSelect` – id đổi sang `string`). Các component kiểu cũ màu indigo/gray của LC (`button`, `input`, `label`, `textarea`, `badge`, `table`, `select`, `dialog`, `checkbox`) **không copy**; khi cần sẽ viết lại theo theme.

### Step 4 – Docker & deploy sớm
**Việc làm**
- `Dockerfile` nhiều stage:
  1. `turbo prune lang-api lang-app --docker`.
  2. `pnpm install --frozen-lockfile` + `turbo build` với `BACKEND_INTERNAL_URL=http://127.0.0.1:3002` và `NEXT_PUBLIC_API_URL=/api`.
  3. Runner (`node:24-bookworm-slim`): `pnpm deploy --filter lang-api --prod` + Next standalone + static. `TZ=Asia/Ho_Chi_Minh`, `USER node`, `EXPOSE 3000`, healthcheck gọi `/api/health` qua 3000.
- `docker/entrypoint.sh`:
  - **chạy migrate trước**, lỗi thì thoát;
  - sau đó chạy api `:3002` và app `:3000`, dùng `wait -n` như LC.
- `deploy/docker-compose.yml`:
  - service `app`, container `lang-simulator-app`, image GHCR `:latest`, `env_file: .env`;
  - ports `3001:3000`, network external `postgres_default`, logging giống LC.
- `deploy/.env.example`.
- `.github/workflows/deploy.yml`: copy từ LC, đổi `cd /opt/lang-simulator`.
- `docs/setup/deploy.md`: các bước P2–P4, quyền user DB, kiểm tra log, rollback bằng tag `sha-…`.
- Container dùng chung database `lang-simulator` / schema `public` với máy dev.

**Nghiệm thu:**
- Máy local không có Docker (người dùng chọn): image được build và kiểm chứng trên GitHub Actions.
- Push `main` thì `http://<ip>:3001` trả trang tạm và `/api/health` = 200.
- LC ở port 3000 không bị ảnh hưởng.

> Cập nhật khi làm Step 4 (2026-09-15):
> - Workflow **tự copy** `deploy/docker-compose.yml` lên `/opt/lang-simulator` (appleboy/scp-action) trước khi `docker compose pull && up -d --wait`; `.env` VPS soạn sẵn ở `deploy/.env` (gitignored) để người dùng scp lên.
> - Pull request vào `main` chỉ build image (không push/deploy) để kiểm Dockerfile, vì máy dev không có Docker.
> - `pnpm deploy` cần `--legacy` (pnpm ≥ 10). Compose dùng `image: …:${IMAGE_TAG:-latest}` để rollback bằng tag `sha-…`.
> - Postgres trên VPS: container `postgres_db` (image `postgres:16-alpine`), network `postgres-docker_default` (không phải `postgres_default`); giống `/opt/lightc/.env`.

### Step 5 – Tài khoản & xác thực
**Việc làm**
- **Backend**
  - Migration `users`, `refresh_tokens`.
  - `AuthModule`:
    - `register`: validate email, mật khẩu ≥ 8 ký tự, `full_name`, `date_of_birth` bắt buộc và không ở tương lai.
    - `login`: bcrypt, chặn `locked`, cập nhật `last_login_at`.
    - `refresh`: xoay token; phát hiện dùng lại token cũ thì thu hồi cả family.
    - `logout`, `me`.
    - `change-password`: tăng `token_version`, thu hồi các refresh token khác, xoá `must_change_password`.
  - Access token payload `{ sub, tv }`, `JWT_ACCESS_EXPIRES_IN=15m`, `REFRESH_EXPIRES_IN=30d`. Cookie `ls_rt`: httpOnly, `SameSite=Lax`, `Secure=COOKIE_SECURE`.
  - `JwtStrategy` load user và so `token_version`, `status`. `SystemRolesGuard`.
  - Seed System Owner từ env `SEED_OWNER_EMAIL/PASSWORD/NAME/DOB` (idempotent).
- **Frontend**
  - Trang `/login` (copy LC login, bỏ nút OAuth giả, bỏ "remember me" giả).
  - Trang `/register` và `/me/account` (hồ sơ + đổi mật khẩu). Bắt buộc đổi mật khẩu khi `must_change_password`.
  - `AuthProvider` (context: user, contexts, logout).
- Test: register/login/refresh rotation/reuse detection/lock user làm token cũ vô hiệu.

**Nghiệm thu:**
- Đăng ký, đăng nhập, đổi mật khẩu được.
- Khoá user trong DB thì request kế tiếp bị 401.
- Reload trang vẫn giữ phiên nhờ refresh cookie.

> Cập nhật khi làm Step 5 (2026-09-15, người dùng chọn):
> - Email: `varchar` luôn lưu chữ thường + unique index `lower(email)` where `deleted_at is null`, **không dùng citext** (không tạo extension).
> - Seed System Owner: script `pnpm --filter lang-api seed:owner` đọc `SEED_OWNER_*` do người dùng tự điền trong `apps/lang-api/.env`; chỉ chạy từ máy dev (database dùng chung), không chạy trong container.
> - Giới tính: `male` / `female` / `other` (Nam / Nữ / Khác), để trống được.
> - Refresh token dùng lại trong 30 giây sau khi xoay vẫn được cấp token mới (nhiều tab), quá 30 giây thu hồi cả family.
> - Kỹ thuật: `bcryptjs` (thuần JS, khỏi build native trong Docker), guard tự viết bằng `@nestjs/jwt` thay cho passport (`JwtAuthGuard` toàn cục + `@Public()`), `PATCH /me/profile` làm luôn ở step này, `/me` tạm có thẻ quản trị hệ thống + tài khoản (danh sách tenant ở Step 8).

### Step 6 – Tenant, gói dịch vụ, membership (backend)
**Việc làm**
- Migrations `service_plans`, `tenants`, `memberships`, `membership_roles`, `student_guardians`; seed 3 gói.
- `TenantsModule`:
  - Đăng ký tenant: kiểm tra tuổi ≥ 18 tính theo `timezone`, slug unique và sinh gợi ý từ tên.
  - Tạo membership `TENANT_OWNER` cho người đăng ký.
  - `GET mine`; sửa & gửi lại khi `rejected`.
  - `GET public/tenants/:slug`.
- `TenantGuard` + `@TenantRoles()` + decorator `@TenantCtx()`.
- `MembershipsModule`:
  - list (lọc role, tìm theo tên/email, phân trang);
  - **add-by-email** và **create-account** (mật khẩu tạm, `must_change_password`);
  - kiểm tra **giới hạn gói** (đếm membership active, 409 khi đầy);
  - đổi roles/status, xoá (soft).
  - Quy tắc bảo vệ Owner: không xoá, không đổi role Owner, Admin không cấp `TENANT_OWNER`.
- Guardians: gắn/gỡ, kiểm tra 2 membership cùng tenant, một bên có role `STUDENT`, bên kia có role `PARENT`.
- `GET me/contexts`: system role + danh sách membership (tenant, trạng thái tenant, roles).
- Test phân quyền: Tenant Admin không sửa được Owner; tenant `pending` bị chặn ở `TenantGuard`; giới hạn gói; người < 18 tuổi không tạo được tenant.

**Nghiệm thu:** toàn bộ API trên hoạt động, test phân quyền pass.

> Cập nhật khi làm Step 6 (2026-09-15, người dùng chọn):
> - Slug tenant: 3–40 ký tự, chỉ `a-z`, `0-9` và gạch nối đơn ở giữa; chặn từ dành riêng (`RESERVED_TENANT_SLUGS` trong `@lang/shared`: `admin`, `api`, `login`, `new`…). Gợi ý từ tên (bỏ dấu tiếng Việt, trùng thì thêm `-2`, `-3`…); không gửi slug thì tự dùng gợi ý; đổi được khi sửa & gửi lại.
> - 3 gói `basic` / `standard` / `pro` seed **trong migration** (chỉ thêm khi `code` chưa có).
> - Create-account: admin nhập mật khẩu tạm, hoặc để trống để hệ thống sinh 12 ký tự (không có ký tự dễ nhầm), chỉ trả về một lần trong response.
> - Tuổi ≥ 18 tính theo `users.timezone` của người đăng ký.

### Step 7 – Dashboard hệ thống (`/admin`)
**Việc làm**
- **Backend** `AdminModule`:
  - stats: tổng user, user mới 7 ngày, tenant theo trạng thái, số tenant chờ duyệt;
  - users: CRUD, khoá/mở, reset mật khẩu, đổi system role (Owner only), áp quy tắc bảo vệ Owner;
  - tenants: list/lọc trạng thái, chi tiết cơ bản (owner, gói, số thành viên/giới hạn), approve / reject (lý do) / suspend / đổi gói;
    - đổi gói (nâng/hạ) có hiệu lực ngay, **không** yêu cầu số membership active ≤ giới hạn mới, không deactivate ai; danh sách/chi tiết đánh dấu tenant đang vượt giới hạn;
  - plans: CRUD.
- **Frontend**:
  - Trang Tổng quan (thẻ số liệu).
  - Trang Người dùng: bảng, tìm kiếm, `Pagination`, `Modal` tạo/sửa, `ConfirmDialog` khoá.
  - Trang Tenant: tab theo trạng thái, dialog duyệt/từ chối.
  - Trang Gói dịch vụ.

**Nghiệm thu:**
- System Admin không thao tác được trên tài khoản Owner (UI ẩn nút, API trả 403).
- Duyệt tenant xong thì Owner vào được dashboard tenant.

> Cập nhật khi làm Step 7 (2026-09-15, người dùng chọn):
> - Tạo user / reset mật khẩu: như create-account (admin nhập hoặc hệ thống sinh, hiển thị một lần), luôn bật `must_change_password`; reset còn tăng `token_version` và thu hồi mọi refresh token. User tạo trong `/admin` luôn là Registered User, đổi role qua `system-role` (chỉ Owner).
> - **Không xoá user** trong req-1, chỉ khoá/mở khoá (khoá thì thu hồi refresh token). Không tự khoá hay tự reset mật khẩu của mình.
> - Tenant: duyệt / từ chối (bắt buộc lý do) chỉ từ `pending`; tạm khoá (bắt buộc lý do, lưu cột mới `suspension_reason`) chỉ từ `active`; mở khoá `suspended → active`. `rejected` chỉ về `pending` khi Owner gửi lại. `reviewed_by/at` ghi người xử lý gần nhất.
> - Gói: `code` cố định sau khi tạo; xoá cứng chỉ khi chưa tenant nào dùng (kể cả tenant đã xoá mềm), đang dùng thì chỉ ngừng áp dụng. Đổi gói tenant chỉ chọn gói đang áp dụng.
> - System Admin chỉ thao tác trên Registered User; tài khoản System Admin/Owner chỉ System Owner thao tác (theo mục 1). Luôn còn ít nhất một System Owner đang hoạt động.

### Step 8 – Khu vực chính & dashboard tenant cơ bản
**Việc làm**
- **Layout `(site)`** theo `LC/design/Home.html`, trích phần cần thiết. File mockup nặng 1.1MB, **không nhúng nguyên**.
- **Các trang khu vực chính:**
  - `/`: landing chung giới thiệu nền tảng, CTA "Đăng ký trung tâm".
  - `/me`: danh sách ngữ cảnh, trạng thái tenant (chờ duyệt / bị từ chối + lý do + nút sửa).
  - `/me/tenants/new`: form đăng ký tenant, chọn gói.
  - `/t/{slug}`: giới thiệu trung tâm. Người chưa là thành viên chỉ thấy phần giới thiệu. Danh sách đề để trống, làm ở step 12.
  - Điều hướng sau đăng nhập theo mục 6.1.
- **Dashboard tenant:**
  - **Tổng quan:** số giáo viên, học viên, phụ huynh, số thành viên / giới hạn gói, số đề theo trạng thái, số lượt làm, số bài chờ chấm. Hai số liệu cuối trả 0 cho tới step 12–13.
  - **Thành viên:**
    - bảng lọc role, dialog thêm theo email, dialog tạo account (hiện mật khẩu tạm 1 lần), sửa roles (checkbox), khoá/xoá;
    - badge "< 18 tuổi";
    - panel gắn phụ huynh cho học viên;
    - vượt giới hạn gói (sau khi hạ gói): banner "cần deactivate N thành viên để khớp gói", khoá nút thêm thành viên, danh sách gợi ý deactivate.
  - **Gợi ý deactivate** (chốt 2026-09-15):
    - cột `memberships.last_active_at`, `TenantGuard` cập nhật tối đa 1 lần/giờ mỗi membership;
    - `GET t/:slug/memberships/deactivation-suggestions` (Owner/Admin): membership active chỉ có role `STUDENT`/`PARENT` (không gợi ý Owner, Tenant Admin, Teacher), xếp chưa từng vào tenant trước rồi tới `last_active_at` cũ nhất, lấy đúng N = số active − giới hạn;
    - chỉ gợi ý, Owner/Admin tự bấm deactivate.
  - Menu sidebar theo role (mục 5.2).

**Nghiệm thu:**
- Một account vừa là System Admin, vừa là Owner tenant A, vừa là Student tenant B: sau đăng nhập thấy `/me`, chuyển qua lại được giữa 3 ngữ cảnh.
- Student/Parent vào `/t/{slug}/dashboard` bị chặn.

> Cập nhật khi làm Step 8 (2026-09-16; người dùng giao tự quyết phần giao diện):
> - Landing `/` lấy từ `LC/design/Home.html`: header dính (mờ nền, link Tính năng/Gói dịch vụ), hero kèm thẻ minh hoạ đề IELTS, 3 thẻ tính năng, bảng gói dịch vụ lấy thật từ `public/plans` (gói giữa nổi bật, nút chọn gói mở `/me/tenants/new?plan=`), footer tối. Bỏ phần "Học phí/tháng", avatar học viên, số liệu marketing của mockup.
> - Trang đích sau đăng nhập: ngữ cảnh gồm quản trị hệ thống và **mọi** tenant user là thành viên (kể cả chưa hoạt động, để thấy trạng thái trên `/me`); đúng 1 tenant mà tenant chưa hoạt động → `/me`.
> - `/me`: mỗi trung tâm một thẻ (trạng thái, vai trò, gói nếu là chủ). Chờ duyệt / bị từ chối (kèm lý do + nút "Sửa và gửi lại") / tạm khoá; **lý do tạm khoá chỉ chủ trung tâm thấy** (`OwnedTenant.suspensionReason`), thành viên khác chỉ thấy "đang tạm khoá".
> - `/t/{slug}`: khách thấy giới thiệu + liên hệ + mời đăng nhập; người đã đăng nhập nhưng không là thành viên thấy lời nhắn liên hệ trung tâm; thành viên thấy vai trò, nút vào dashboard (nếu có role) và khu đề thi trống. Thành viên của tenant chờ duyệt / bị từ chối / tạm khoá thấy thông báo trạng thái thay cho nội dung. Trang thành viên gọi `GET t/:slug/me` (API mới) để ghi lần vào tenant.
> - Dashboard tenant: roles từ `me/contexts`; Student/Parent, người ngoài, tenant chưa hoạt động thấy trang thông báo (không có sidebar). Teacher có tổng quan **rút gọn**: học viên, đề theo trạng thái, lượt làm, bài chờ chấm (không có giáo viên/phụ huynh/giới hạn gói). API `GET t/:slug/dashboard/stats` trả `management = null` cho Teacher.
> - Trang thành viên: quota `x / giới hạn` luôn hiện; đạt giới hạn thì khoá nút thêm; vượt giới hạn thì banner + nút "Xem gợi ý" mở danh sách gợi ý (ngừng kích hoạt từng người, có xác nhận). Chi tiết thành viên trong dialog: sửa vai trò (checkbox), gắn/gỡ phụ huynh (tìm Phụ huynh đang hoạt động), xem học viên được giám hộ.
> - Không có "đăng ký nhanh" từ landing: nút "Đăng ký trung tâm" đưa khách qua `/login?next=/me/tenants/new` (có tab đăng ký).

### Step 9 – `packages/exam-core`
**Việc làm**
- **Chuyển logic thuần** (không phụ thuộc React/Plate UI) từ LC vào package:
  - types & meta indicator (`LC-FE/components/plate/exam/indicator.tsx`: phần type/meta/`isIndicator`), `isBlank`, `isPair`, `ORDERING_STYLE`, `scope.ts`, `migrate.ts`;
  - `LC-FE/app/(dashboard)/labs/exam-editor/_lib/preview-plan.ts`, `grading.ts`, `validate.ts`, `outline.ts`.
- **Thêm mới:**
  - `extractStructure(value)` → `{ parts[], questions[] }`, với `answer_key` từng câu:

    | qtype | `answer_key` |
    |---|---|
    | mc-single / mc-multi | `{ indexes }` |
    | pick-n | `{ indexes, pickIndex }` |
    | matching / tfng / ynng | `{ answer }` |
    | fill-blank | `{ accepted[] }` |
    | ordering | `{ order[] }` |
    | polytomous | `{ weights[] }` |
    | speaking / writing | `null`, `grading = manual` |

    Đánh số từ 1 cho mỗi section.
  - `stripAnswers(value, seed)` → `content_public`:
    - bỏ `checked`;
    - bỏ `pair.answer`;
    - làm rỗng text trong `blank` (giữ số lượng blank);
    - ordering/polytomous: bỏ `num`, gán `key`, xáo trộn theo seed.
  - `gradeResponses(questions, responses)` → verdict từng câu + `{ correct, total, manual }`. Refactor `gradeExam` của LC dùng chung hàm này để preview và server chấm giống hệt nhau.
  - `validateSection(value)`: lỗi cấu trúc (lấy từ `validate.ts`), không có `data:` URI, có ít nhất 1 câu hỏi (cảnh báo).
- **Test Jest:**
  - dùng mẫu `LC/docs/data/exam-draft-2.json`, `exam-editor-sample.json`;
  - chấm bằng cách gọi trực tiếp `gradeResponses` và gọi qua `gradeExam` phải ra cùng kết quả;
  - `content_public` không còn chứa đáp án (duyệt đệ quy tìm `checked`/`answer`/text blank/`num`).

**Nghiệm thu:** test pass, package build được cho cả Next và Nest.

> Cập nhật khi làm Step 9 (2026-09-16, người dùng chọn):
> - **Xáo theo từng lượt làm:** `stripAnswers(value, seed)` lúc Save đã xáo sẵn (content_public lỡ trả thẳng cũng không lộ đáp án); khi phục vụ lượt làm, server gọi `shuffleOrdering(content_public, order_seed, questions)`. Kết quả chỉ phụ thuộc seed.
> - **Không hiện thứ tự lộ đáp án:** xáo xong mà Ordering trùng thứ tự đúng, hoặc dòng điểm cao nhất của Polytomous nằm đúng vị trí soạn gốc, thì xoay vòng dãy đó thêm một vị trí.
> - **Câu trả lời bất thường:** bỏ lựa chọn trùng / không phải số nguyên ≥ 0; Pick-n còn nhiều hơn n lựa chọn thì sai cả n câu; MC 1 đáp án và Polytomous phải chọn đúng 1.
> - Kỹ thuật: `QuestionType`, `ExamPartKind` khai báo trong `@lang/shared` (exam-core phụ thuộc shared). Save kiểm `validateSectionShape` (định dạng Plate, indicator có id/kind hợp lệ và không trùng id, không có data URI), publish kiểm `validateSection` (thêm lỗi soạn thảo và cảnh báo "chưa có câu hỏi"). content_public ghi bù `maxPicks` (pick-n đời cũ) và `options` (matching đời cũ) lên indicator để đánh số/hiển thị như bản gốc.

### Step 10 – Upload media (R2)
**Việc làm**
- `StorageModule`: `R2Service` (copy `LC-BE/storage/r2.service.ts`), **export** service thay vì mỗi module khai báo lại như LC.
  - Hỗ trợ 2 bucket (`R2_PUBLIC_BUCKET`, `R2_PRIVATE_BUCKET`), `putObject`, `deleteObject`, `getPresignedGetUrl(key, 600s)`.
  - Env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BUCKET`, `R2_PUBLIC_BASE_URL`, `R2_PRIVATE_BUCKET`.
- `POST /t/:slug/media/upload` (Owner/Admin/Teacher):
  - giới hạn và convert webp như `LC-BE/storage/media.controller.ts`;
  - key `tenants/{tenantId}/exam-media/{uuid}.{ext}`;
  - `GET media/status`.
- Upload logo tenant: `tenants/{tenantId}/branding/...`.
- Frontend: copy `LC-FE/lib/media-api.ts`, `MediaDialog.tsx`, `embedded-media.ts` (đổi endpoint theo slug).

**Nghiệm thu:** upload ảnh/audio/video từ dashboard tenant, URL public mở được; thiếu cấu hình R2 trả 501 như LC.

> Cập nhật khi làm Step 10 (2026-09-16, người dùng chọn):
>
> - **Logo trung tâm đặt theo user**, không theo tenant: endpoint `POST /me/branding/upload`, key `users/{userId}/branding/{uuid}.webp`. Lý do: logo chọn ngay trong form đăng ký, lúc đó tenant chưa tồn tại nên chưa có `tenantId`. `logoUrl` thêm vào `TenantFormDto` (URL http(s), ≤ 1024 ký tự).
> - **Thêm trang Thư viện media** `/t/{slug}/dashboard/media` (mục 6.1 chưa liệt kê): upload, copy URL, mở, xoá. Danh sách đọc thẳng R2 theo prefix `tenants/{tenantId}/exam-media/` nên **không cần bảng DB**. Cần trang này để nghiệm thu vì trình soạn đề tới Step 12 mới có, và giáo viên dùng lại được file đã tải.
> - Ảnh convert webp bằng `sharp` (như LC); audio/video giữ nguyên định dạng và mimetype gốc.
> - 6 biến `R2_*` khai báo **tuỳ chọn** trong `env.validation.ts`: để trống thì API vẫn khởi động, chỉ endpoint media trả 501.
> - `MediaDialog` viết lại cho lang-app (không phụ thuộc Plate, nhận `slug`); `embedded-media.ts` mới có `uploadDataUrls` – `applyDataUrls` cần editor Plate nên để Step 12.

### Step 11 – Danh mục đề & Loại đề
**Việc làm**
- **Backend:**
  - Migrations `exam_categories`, `exam_blueprints`, `exam_modules`.
  - Service dùng chung cho 2 phạm vi (hệ thống / tenant). Tenant list trả **hệ thống + tenant**, kèm cờ `scope`.
  - Không xoá khi đang được dùng, chỉ `is_active=false`.
  - Blueprint lưu kèm modules trong 1 request (thêm/sửa/xoá/sắp xếp).
  - Validate duration 5..180 và chia hết cho 5.
  - Seed dữ liệu mẫu hệ thống (giả định 12).
- **Frontend:**
  - Trang Danh mục: bảng, modal, sắp xếp.
  - Trang Loại đề: lọc theo danh mục, form có danh sách module kéo thả, `select` duration 5..180.
  - Dùng cho cả `/admin/...` và `/t/{slug}/dashboard/...`. Ở tenant, mục hệ thống chỉ đọc (badge "Hệ thống"), Teacher chỉ xem.

**Nghiệm thu:** CRUD 2 phạm vi đúng quyền (mục 5); tenant thấy cả loại đề hệ thống lẫn của mình.

> Cập nhật khi làm Step 11 (2026-09-16, người dùng chọn):
>
> - **Icon/màu danh mục chọn từ bộ có sẵn**: 8 màu nhấn Solarized (`ExamCategoryColor`) và 12 icon lucide (`ExamCategoryIcon`), lưu tên (`blue`, `book-open`), CHECK trong DB. Mặc định `book-open` + `blue`.
> - **Mã IN HOA, sửa được**: chữ in hoa không dấu, số, `-`/`_` ở giữa (`EXAM_CATALOG_CODE_PATTERN`, tối đa 32), tự đổi sang in hoa. Unique theo phạm vi (hệ thống / từng tenant); **tenant được trùng mã với mục hệ thống** (phân biệt bằng badge). Mã module bắt buộc, unique trong loại đề.
> - **Xoá cứng khi chưa dùng**: danh mục còn loại đề (kể cả loại đề của tenant thuộc danh mục hệ thống) → 409; loại đề có đề thi → 409 (FK RESTRICT từ `exams`, Step 12). Module xoá tự do trong form (section chỉ snapshot). **Ngừng dùng** (`is_active=false`) vẫn hiện trong danh sách (badge "Ngừng dùng", tenant cũng thấy mục hệ thống ngừng dùng) nhưng không chọn được khi tạo loại đề/đề mới; loại đề giữ được danh mục cũ đã ngừng dùng, chỉ chặn khi **đổi sang** danh mục ngừng dùng.
> - **Sắp xếp danh mục bằng ô Thứ tự** trong modal (như Gói dịch vụ); danh sách: mục hệ thống trước, rồi thứ tự, rồi tên. Loại đề xếp theo phạm vi → danh mục → tên. **Loại đề bắt buộc ≥ 1 module** (tối đa 20) vì đề cần ≥ 1 section.
> - Module kéo thả bằng tay cầm (HTML5 drag & drop, không thêm thư viện) + nút lên/xuống; `sort_order` = vị trí trong danh sách gửi lên.
> - API: `GET/POST /admin/exam-categories`, `PATCH/DELETE /admin/exam-categories/:id` và tương tự cho `exam-blueprints`, `t/:slug/exam-categories`, `t/:slug/exam-blueprints`. Sửa dùng **PATCH** (gửi `modules` là thay cả danh sách: có `id` = sửa, không có = thêm, thiếu = xoá). Danh sách không phân trang, lọc ở client. Tenant: xem cho Owner/Admin/Teacher, ghi cho Owner/Admin; tenant đụng mục hệ thống → 403, mục của tenant khác → 404.
> - Unique mã module `DEFERRABLE INITIALLY DEFERRED` để đổi chéo mã giữa 2 module trong 1 lần lưu. Xoá cứng tenant thì danh mục/loại đề của tenant xoá theo (CASCADE); tenant chỉ xoá mềm thì dữ liệu giữ nguyên.
> - Seed bằng migration `SeedExamCatalog`: danh mục `EN` Tiếng Anh, `JA` Tiếng Nhật; loại đề `TOEIC`, `IELTS`, `JLPT_N2` với module theo giả định 12 (JLPT N2: `LANGUAGE_READING` "Kiến thức ngôn ngữ & Đọc hiểu" 105, `LISTENING` "Nghe hiểu" 50).

### Step 12 – Đề thi, trình soạn thảo & version
**Việc làm**
- **Backend** (migrations `exams`, `exam_sections`, `exam_parts`, `exam_questions`):
  - `POST exams`: chọn blueprint → tạo exam `draft`, version 1, sections sinh từ modules (tên, thứ tự, `duration = reference_duration`, `raw_data` rỗng).
  - `PATCH` metadata/`blueprint_id` (không tạo version).
  - `PUT content`: thuật toán mục 4.6.
  - `GET :id`: trả `raw_data` version hiện tại + `hasAttempts` (để FE cảnh báo).
  - Versions: danh sách (version, ngày, người tạo, số attempt), xem, khôi phục.
  - Publish: validate mọi section bằng `exam-core`, lỗi thì 422 kèm danh sách issue. Archive; soft delete.
  - List đề: lọc theo category/blueprint/trạng thái/người tạo; Teacher thấy tất cả nhưng chỉ sửa được đề của mình.
- **Frontend – trang danh sách đề:** bảng, tạo đề (chọn blueprint), badge trạng thái, hành động theo quyền.
- **Frontend – trình soạn thảo `/exams/[id]/edit`** (copy từ LC `labs/exam-editor/_components/*` và `components/plate/*`):
  - **Thanh tab section:** thêm (trống hoặc "từ module của blueprint"), đổi tên, xoá (confirm), kéo sắp xếp, `select` duration.
  - **Mỗi tab** là 1 `ExamWorkspace` (Plate editor + toolbar + slash menu + minimap + issue panel), số câu đánh lại từ 1.
  - **Autosave localStorage** theo `exam:{id}:draft`, lưu toàn bộ các tab. Khi mở lại, nếu nháp mới hơn bản server thì hỏi có khôi phục không.
  - **Nút Save / Ctrl+S:** lưu tất cả, cảnh báo nếu `hasAttempts`, chặn rời trang khi chưa lưu.
  - **Xử lý data URI:** upload trước khi lưu, như LC.
  - **Bỏ autosave lên server** của LC.
  - Import/Export JSON theo từng section.
  - Form metadata: tiêu đề, mô tả, đổi blueprint.
- **Frontend – Preview** (`PreviewDialog`): chọn section → `ExamSimulator` chấm ở client như LC.
- **Frontend – trang Versions:** danh sách + khôi phục (confirm, nêu rõ sẽ ghi đè hay tạo version mới).
- **Test backend:**
  - Save khi chưa có attempt thì số version giữ nguyên và câu hỏi được thay mới.
  - Có attempt (kể cả `in_progress`) thì tạo version mới và version cũ `deactivated`.
  - Khôi phục version.
  - Teacher sửa đề của người khác bị 403.
  - Publish đề lỗi bị 422.

**Nghiệm thu:**
- Tạo đề IELTS sinh ra 4 tab.
- Soạn và lưu xong, DB có đủ `exam_parts` / `exam_questions` với `answer_key` đúng.
- Publish, rồi tạo 1 attempt, rồi sửa: sinh version 2.

> Cập nhật khi làm Step 12 (2026-09-16, người dùng chọn):
>
> - **Đề đã publish/lưu trữ phải hết lỗi mới lưu được nội dung** (422 kèm danh sách lỗi theo section, như publish). Đề nháp lưu tự do, lỗi chỉ hiện ở bảng kiểm tra.
> - **Trạng thái:** nháp → publish; publish → lưu trữ; **lưu trữ → publish lại** (validate lại). Không có đường về nháp. Đề lưu trữ vẫn sửa được, học viên không thấy.
> - **Tạo bảng `exam_attempts` ngay ở Step 12** (đúng cột mục 4.5) để quy tắc version đếm bài làm thật; luồng làm bài vẫn ở Step 13.
> - **Teacher mở đề người khác ở chế độ chỉ xem**: xem nội dung, xem trước, xem version; không lưu/publish/lưu trữ/xoá/khôi phục.
>
> Quyết định kỹ thuật (mình tự chọn):
> - Thêm cột `exams.content_revision` (tăng mỗi lần lưu nội dung/khôi phục). Client gửi `baseRevision`; lệch → 409, tránh 2 tab/2 người ghi đè lẫn nhau. Sửa metadata không đổi revision.
> - FK `exams.blueprint_id` và `exam_attempts.exam_id` là **NO ACTION** (thay cho RESTRICT): vẫn chặn xoá loại đề/đề đang dùng nhưng xoá cứng tenant (CASCADE cả loại đề, đề, bài làm) chạy được. `exam_sections.module_id` không có FK. `exam_parts`/`exam_questions` CASCADE theo section; `node_id` varchar(64) (exam-core chặn id indicator dài hơn).
> - Xoá đề: chưa có bài làm (mọi version) → xoá hẳn; có → xoá mềm. Đề xoá mềm vẫn chặn xoá loại đề. Trang Loại đề có cột **Số đề** và khoá nút xoá khi > 0.
> - Tạo đề/đổi loại đề: loại đề phải nhìn thấy được, đang dùng và danh mục đang dùng. Tạo đề: mỗi module thành 1 section trống (`duration = reference_duration`). Tối đa 20 section.
> - Lưu nội dung: `PUT content` gửi toàn bộ section (thứ tự = vị trí); server kiểm `validateSectionShape` (400), tách `extractStructure`, `stripAnswers` với seed ngẫu nhiên. Section tạo lại mỗi lần lưu nên `created_at` = lúc lưu (`contentSavedAt` để so với bản nháp).
> - Danh sách đề phân trang ở server, lọc tên/trạng thái/danh mục/loại đề/người tạo (`GET exams/creators`), mới cập nhật trước.
> - Trình soạn: mỗi section một editor Plate (giữ lịch sử hoàn tác khi đổi tab); bản nháp `exam:{id}:draft` ghi sau 800ms ngừng gõ, mở lại mà bản nháp mới hơn bản server (và khác nội dung) thì hỏi khôi phục. Tắt `nodeId` của Plate (không gắn `id` cho mọi block) để so nội dung đã lưu chính xác. Rời trang khi chưa lưu: cảnh báo `beforeunload` (điều hướng trong app không chặn, bản nháp vẫn còn).
> - Validation lồng nhau của Nest trả message không kèm tiền tố đường dẫn (`validationExceptionFactory`, áp dụng mọi API).
> - Route frontend: `/t/{slug}/dashboard/exams`, `exams/[id]/edit`, `exams/[id]/versions` (đúng mục 6.1). API thêm `GET exams/creators`, `GET exams/:id/versions/:version`, `POST …/restore` nhận `baseRevision`.

### Step 13 – Làm bài thi (giả lập) & chấm tự động
**Việc làm**
- **Backend** (migrations `exam_attempts`, `exam_attempt_sections`, `exam_attempt_answers`):
  - **Học viên xem đề:**
    - `learner/exams`: đề `published` của tenant (mọi member active).
    - `learner/exams/:id`: thông tin + lịch sử lượt làm.
  - **Làm bài:**
    - `POST attempts`: khoá đọc exam, lấy `current_version`, tạo attempt + các attempt_section `not_started` (seed xáo trộn).
    - `GET attempts/:id`: trạng thái, section hiện tại, `content_public` + `responses` của section đang làm. Chỉ trả intro khi section chưa bắt đầu. Có lazy finalize.
    - `start`: `started_at`, `deadline_at = now + duration`. Chỉ được bắt đầu section kế tiếp khi section trước đã nộp.
    - `PUT responses`: từ chối sau `deadline + 10s`.
    - `submit`: chấm bằng `gradeResponses` với `exam_questions` → ghi `exam_attempt_answers` + `correct/total`. Nếu là section cuối thì chốt attempt: `graded` nếu không có câu tay, ngược lại `submitted`.
  - **Ghi âm Speaking:** `POST recordings` (multer ≤10MB, `audio/webm`) lưu bucket private `tenants/{tenantId}/attempts/{attemptId}/{questionId}-{uuid}.webm`, ghi đè thì xoá file cũ. `GET url` trả presigned URL, chỉ cho chủ bài hoặc người chấm.
  - **Cron** (`@nestjs/schedule`): mỗi phút chốt các section quá hạn (`auto_submitted = true`).
  - **Kết quả:**
    - `GET result`: số câu đúng theo section + tổng; phần chấm tay gồm trạng thái "Chờ chấm" hoặc điểm + nhận xét.
    - **Không** trả đáp án hay verdict từng câu.
- **Frontend:**
  - `/t/{slug}`: danh sách đề publish (thẻ đề: tên, loại đề, số section, tổng thời gian).
  - `/t/{slug}/exams/{id}`: thông tin, nút Bắt đầu / Làm tiếp, lịch sử lượt làm.
  - **Trang thi** `(exam)/t/{slug}/attempts/{id}`, refactor `ExamSimulator.tsx` + `SimulatorState.tsx` của LC:
    - lớp **Section**: màn hình hướng dẫn (intro), nút Bắt đầu, đồng hồ đếm ngược theo `deadline_at` của server, nộp sớm (confirm), hết giờ tự nộp, màn hình chờ section kế;
    - bên trong giữ UI LC: tab Part, passage trái / câu hỏi phải, `AnswerNav` chỉ câu của section, flag;
    - render từ `content_public` (ordering theo `key`);
    - autosave responses (debounce 3s + khi đổi tab), báo trạng thái "Đã lưu";
    - Speaking: component ghi âm (MediaRecorder, giới hạn `seconds`, nghe lại, ghi lại, upload);
    - bỏ phần tô xanh/đỏ và "Làm lại" của LC ở chế độ thi thật.
  - Trang kết quả: bảng section (x / y), trạng thái chấm tay, điểm & nhận xét.
- **Test:**
  - chấm server khớp exam-core;
  - API học viên không lộ đáp án (snapshot kiểm tra key);
  - quá hạn thì từ chối cập nhật, cron/lazy tự nộp;
  - không bắt đầu được section khi section trước chưa nộp.

**Nghiệm thu:**
- Làm trọn 1 đề TOEIC 2 section.
- Reload giữa chừng vẫn giữ câu trả lời và thời gian còn lại.
- Hết giờ tự chuyển section.
- Kết quả hiển thị theo section, không có đáp án.

> Cập nhật khi làm Step 13 (2026-09-16, người dùng chọn phương án đề xuất):
>
> - **Mỗi người tối đa 1 lượt làm dở cho mỗi đề** (index unique `(exam_id, user_id) WHERE status = 'in_progress'`). Trang đề hiện "Làm tiếp"; màn hình hướng dẫn/chờ của mọi section có nút **"Nộp toàn bài"**: chốt các section còn lại (chưa làm tính bỏ trống), sau đó mới bắt đầu lượt mới được.
> - **Đề bị lưu trữ hoặc xoá mềm khi đang làm dở: vẫn làm tiếp và nộp được**; chỉ chặn tạo lượt mới (409). Đề không còn mở vẫn xem được trang đề (lịch sử) và kết quả nếu mình từng làm.
> - **Ghi âm nhận `audio/webm` và `audio/mp4`** (Safari chỉ ghi được mp4), ≤ 10MB, key `tenants/{tenantId}/attempts/{attemptId}/{questionId}-{uuid}.webm|m4a`.
> - **Trang kết quả chỉ mở khi đã nộp hết các section** (409 nếu còn dở); lịch sử hiện tiến độ section cho lượt đang làm.
>
> Quyết định kỹ thuật (mình tự chọn):
> - API học viên dưới `t/:slug/learner/*` (mọi thành viên active, không giới hạn role): `GET exams` (phân trang, lọc tên/danh mục/loại đề, kèm danh sách danh mục/loại đề đang có đề publish), `GET exams/:id`, `POST exams/:id/attempts`, `GET attempts` (lượt làm của tôi), `GET attempts/:id`, `POST attempts/:id/sections/:sid/start`, `PUT …/responses`, `POST …/submit` (gửi kèm câu trả lời mới nhất), `POST attempts/:id/finish`, `POST attempts/:id/recordings` (multipart `file`, `sectionId`, `number`), `GET attempts/:id/recordings/:answerId/url`, `GET attempts/:id/result`.
> - Mọi thao tác ghi khoá dòng lượt làm + section (`FOR UPDATE`), chốt section quá `deadline_at + 10s` trước (lazy) rồi mới xử lý; cron `@nestjs/schedule` (bản 4, Nest 10) mỗi phút chốt nốt. Nộp section đã được chốt (client tự nộp tới sau cron) trả trạng thái hiện tại thay vì lỗi. `auto_submitted = true` khi nộp từ lúc `deadline_at` trở đi.
> - `exam_attempt_answers` sinh cho **mọi câu** khi nộp section (kể cả bỏ trống: `response` null); câu tự động có `is_correct` + `score` (= `max_score` hoặc 0), câu chấm tay `score` null. Ghi âm tạo dòng sớm (lúc tải lên) và được giữ khi nộp. Câu chấm tay bỏ trống vẫn chờ giáo viên chấm (không tự cho 0).
> - Chưa bắt đầu section thì chỉ trả phần hướng dẫn (`buildPlan(content_public).intro`). Ordering chưa động tới thì không lưu thứ tự (tính bỏ trống).
> - `exam_attempt_sections.section_id` và `exam_attempt_answers.question_id` là FK **NO ACTION** (như `exam_attempts.exam_id`). Thêm index một phần `deadline_at WHERE status = 'in_progress'` cho cron.
> - Frontend: simulator chuyển sang `components/exam-simulator` (dùng chung xem trước + thi), thêm chế độ thi (câu trả lời ban đầu, autosave 3s + khi đổi tab Part + khi ẩn tab, nộp qua server, ô ghi âm). Cờ câu hỏi lưu localStorage theo lượt làm/section. Trang `/t/{slug}` có "Lượt làm gần đây" (5 lượt) + danh sách đề; `/t/{slug}/exams/{id}`, trang thi `(exam)/t/{slug}/attempts/{id}`, kết quả `/t/{slug}/attempts/{id}/result`. Middleware chặn thêm `/t/:slug/exams/*`.
> - Lỗi 413 của multer (file vượt `limits.fileSize`) đổi sang message tiếng Việt ở `AllExceptionsFilter` (áp dụng cả upload media).
> - **Ghi âm cần HTTPS hoặc localhost**: trình duyệt chặn micro ở `http://<ip>:3001`, ô ghi âm báo không hỗ trợ cho tới khi có domain + SSL.

### Step 14 – Chấm bài thủ công
**Việc làm**
- **Backend:**
  - `grading/attempts`: bài có câu manual, lọc exam / học viên / trạng thái (chờ chấm, đã chấm), loại bài của chính người chấm.
  - Chi tiết bài: nội dung câu hỏi (từ `content_public` của đúng version), bài viết, link ghi âm presigned.
  - `PUT answers/:id`: `score` 0–10 (bước 0.5), `comment`. Khi đủ câu thì attempt → `graded`, `graded_at`.
- **Frontend:**
  - Trang "Chấm bài": bảng + bộ lọc.
  - Trang chi tiết: danh sách câu Writing/Speaking, player audio, ô điểm + nhận xét, lưu từng câu, điều hướng câu kế.
  - Tổng quan tenant cập nhật "bài chờ chấm".
- Trang kết quả học viên hiển thị điểm + nhận xét.

**Nghiệm thu:**
- Teacher chấm được bài của Student; không chấm được bài của chính mình.
- Học viên thấy điểm và nhận xét sau khi chấm.

> Cập nhật khi làm Step 14 (2026-09-16, người dùng chọn phương án đề xuất):
>
> - **Chấm lại được** mọi lúc (ghi đè điểm, nhận xét, người chấm, thời điểm chấm của câu); lượt làm đã `graded` giữ nguyên trạng thái và `graded_at` lần chấm đủ đầu tiên.
> - **Câu Writing/Speaking bỏ trống vẫn chờ chấm** (không tự cho 0); trang chấm báo "bỏ trống/không ghi âm" và có nút "Cho 0 điểm".
> - **Trang Chấm bài chỉ có lượt làm đã nộp hết** (`submitted`/`graded`, `manual_count > 0`); lượt đang làm dở chưa chấm được (409) dù section Writing đã nộp.
> - **Học viên thấy điểm từng câu ngay khi chấm** (như trang kết quả Step 13); chấm đủ thì trang kết quả hiện thêm tổng điểm tự luận.
>
> Quyết định kỹ thuật (mình tự chọn):
> - API `t/:slug/grading/*` (`GRADER_ROLES`): `GET attempts` (phân trang, lọc `status`/`examId`/`q` tên-email học viên, kèm danh sách đề có bài để lọc; bỏ bài của người chấm), `GET attempts/:id` (chỉ section có câu chấm tay; đề bài tách từ `content_public` của đúng section: hướng dẫn subpart trước câu + nội dung câu, passage part riêng; bài viết, có ghi âm, điểm/nhận xét/người chấm; `nextAttemptId` = bài chờ chấm nộp sớm nhất khác), `GET attempts/:id/recordings/:answerId/url` (presigned cho người chấm; route học viên giữ nguyên chỉ chủ lượt làm), `PUT answers/:answerId` (`score` 0 → `max_score` bước 0,5, `comment` ≤ 5000). Bài của chính mình 403, lượt chưa nộp xong 409, câu tự động 400.
> - Chấm trong transaction khoá dòng lượt làm; `manual_graded_count` **đếm lại** số câu chấm tay đã có `graded_at` (không cộng dồn, chấm lại không tăng), đủ `manual_count` thì `submitted → graded` (update có điều kiện trạng thái cũ).
> - Không cần migration (bảng/cột đã có từ Step 13). Tổng quan tenant lấy số thật: đề theo trạng thái, số lượt làm, **bài chờ chấm = lượt `submitted` không phải của người xem**; thẻ bấm được sang trang Chấm bài.
> - Frontend: `/t/{slug}/dashboard/grading` (mặc định lọc Chờ chấm, `?status=graded|all`), `/t/{slug}/dashboard/grading/{attemptId}` (danh sách câu bên trái, đề bài + passage thu gọn + bài làm/player ghi âm, ô điểm + nhận xét, "Lưu điểm" / "Lưu & câu tiếp", điểm nháp giữ khi đổi câu và báo "Chưa lưu", link bài chờ chấm tiếp theo khi chấm đủ).

### Step 15 – Hoàn thiện & nghiệm thu tổng
**Việc làm**
- Rà soát phân quyền toàn bộ API: bảng mục 5 → test e2e tối thiểu bằng supertest.
- Empty state, loading, thông báo lỗi tiếng Việt; responsive cơ bản cho trang thi và landing.
- Cập nhật `README.md`, `docs/setup/deploy.md`, `.env.example`.
- Deploy production, chạy seed Owner + gói + dữ liệu mẫu, rồi đi hết checklist nghiệm thu bên dưới trên VPS.

**Checklist nghiệm thu req-1** (đạt trên `http://160.25.166.163:3001` ngày 2026-09-17, chi tiết trong nhật ký Step 15 của progress)
- [x] Đăng ký / đăng nhập / đổi mật khẩu; khoá user có hiệu lực ngay.
- [x] System Owner/Admin: tổng quan, quản lý user (bảo vệ Owner), duyệt/từ chối tenant, gói dịch vụ, danh mục & loại đề hệ thống.
- [x] Registered User ≥ 18 đăng ký tenant; < 18 bị chặn; tenant `pending` chưa vào được dashboard.
- [x] Tenant Owner/Admin: tổng quan, quản lý membership (nhiều role, giới hạn gói, bảo vệ Owner, gắn phụ huynh).
- [x] Danh mục / loại đề / module theo 2 phạm vi.
- [x] Tạo đề từ blueprint → tab section → soạn Plate → Save → publish; version mới khi đã có bài làm; khôi phục version.
- [x] Thành viên thi tại khu vực chính: timer section, tự nộp, số câu đánh từ 1 mỗi section, ghi âm Speaking.
- [x] Chấm tự động phía server, không lộ đáp án; chấm tay Writing/Speaking.
- [x] Deploy `http://<ip>:3001`, LC ở 3000 không bị ảnh hưởng.

> Cập nhật khi làm Step 15 (2026-09-16, người dùng chọn phương án đề xuất):
>
> - **Test e2e phân quyền không dùng DB**: app Nest thật (mọi controller của `AppModule`, guard toàn cục, `TenantGuard`, filter lỗi) + repository trong bộ nhớ, service rỗng, interceptor dừng ngay sau guard; bảng quyền viết tay theo mục 5 cho **mọi route** (thiếu route thì test lỗi), chạy trong `pnpm test`. Quy tắc trong service (đề của mình, bài của mình, bảo vệ Owner…) kiểm bằng unit test service.
> - **Giữ HTTP** (`http://<ip>:3001`), chưa có domain + SSL; ghi âm Speaking trên VPS thử bằng flag Chrome `unsafely-treat-insecure-origin-as-secure`.
> - **Deploy qua PR trước**: làm xong local → mở PR để workflow build thử image → người dùng cập nhật `R2_*` trên VPS và cho phép push `main` → nghiệm thu checklist trên :3001 bằng dữ liệu thử rồi xoá.
> - **Không seed thêm dữ liệu mẫu**: chỉ Owner + 3 gói + danh mục/loại đề hệ thống (đã có).

---

## 8. Ngoài phạm vi req-1 (ghi nhận cho req sau)
- Xác thực email, quên mật khẩu, dịch vụ gửi mail, OAuth Google/Facebook.
- Khoá học / lớp, giao đề theo lớp, role theo khoá học.
- Chuyển quyền Tenant Owner.
- Trang Parent xem kết quả học tập của con.
- Thanh toán, thời hạn gói, quota dung lượng upload.
- Thang điểm quy đổi (TOEIC 990, IELTS band), thống kê tỉ lệ đúng theo câu.
- Giới hạn nghe audio 1 lần, thời gian chuẩn bị Speaking.
- Đăng nhập bằng username (học viên không có email), i18n đa ngôn ngữ, domain + SSL.
- Tuỳ chọn đánh số liên tục qua các section.
