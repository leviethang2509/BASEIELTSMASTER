# Requirement 1 – Tiến độ

> **Phiên chat mới:** đọc [CLAUDE.md](../../CLAUDE.md) → file này → phần liên quan của [req-1-plan.md](req-1-plan.md).
> Sau mỗi step: cập nhật bảng trạng thái + thêm mục nhật ký bên dưới.
>
> Trạng thái: ✅ Xong · 🟡 Đang làm · ⬜ Chưa làm · ⛔ Bị chặn

## Bảng trạng thái

| Step | Nội dung | Trạng thái | Ngày xong | Ghi chú |
|---|---|---|---|---|
| 1 | Khởi tạo monorepo | ✅ | 2026-09-13 | Đã commit (`feat: first commit on git`) |
| 2 | Khung `lang-api` | ✅ | 2026-09-14 | Đã commit (`feat: init project`) |
| 3 | Khung `lang-app` (copy UI LC) | ✅ | 2026-09-14 | Đã commit (`feat: init project`); xem giao diện gộp vào việc chờ số 3 bên dưới |
| 4 | Docker & deploy sớm | ✅ | 2026-09-15 | PR #1 đã merge; `http://160.25.166.163:3001` chạy, `/api/health` 200 |
| 5 | Tài khoản & xác thực | ✅ | 2026-09-15 | Đã commit + push (`3868d15 feat: auth`), :3001 chạy code mới; đã seed 1 System Owner |
| 6 | Tenant, gói dịch vụ, membership (backend) | ✅ | 2026-09-15 | Đã commit + push (`6c2083b feat: membership`); 3 gói đã seed |
| 7 | Dashboard hệ thống `/admin` | ✅ | 2026-09-15 | Đã commit (`10594de feat: main page`, gộp Step 8); migration `AddTenantSuspensionReason` đã chạy trên DB dùng chung |
| 8 | Khu vực chính & dashboard tenant cơ bản | ✅ | 2026-09-16 | Đã commit (`10594de feat: main page`); migration `AddMembershipLastActiveAt` đã chạy trên DB dùng chung |
| 9 | `packages/exam-core` | ✅ | 2026-09-16 | Đã commit (`350ad90 feat: exam core`); package thuần, không có migration/env |
| 10 | Upload media (R2) | ✅ | 2026-09-16 | Đã commit (`42adeb4 feat: r2 storage`); 6 biến `R2_*` (tuỳ chọn) đã có ở `apps/lang-api/.env` + `deploy/.env`, **VPS `/opt/lang-simulator/.env` chưa cập nhật**; không có migration |
| 11 | Danh mục đề & Loại đề | ✅ | 2026-09-16 | Đã commit (`fe39e4a feat: exam category and blueprint`); migration `CreateExamCatalog` + `SeedExamCatalog` đã chạy trên DB dùng chung; không có env mới |
| 12 | Đề thi, trình soạn thảo & version | ✅ | 2026-09-16 | Đã commit (`594be7e feat: exam compose`); migration `CreateExams` (gồm `exam_attempts`) đã chạy trên DB dùng chung; không có env mới |
| 13 | Làm bài thi & chấm tự động | ✅ | 2026-09-16 | Đã commit (`3894fed feat: exam simulator`); migration `CreateAttemptSectionsAndAnswers` đã chạy trên DB dùng chung; thêm dependency `@nestjs/schedule` 4; không có env mới |
| 14 | Chấm bài thủ công | ✅ | 2026-09-16 | Đã commit (`d8e9b94 feat: exam grading`); không có migration, không có env mới |
| 15 | Hoàn thiện & nghiệm thu tổng | ✅ | 2026-09-17 | Đã commit (`abbae0f`, `4073f78 test: acceptance`), merge PR #2 (`7a7998e`) và deploy; checklist req-1 đạt trên VPS :3001; không có migration, không có env mới |

### Bàn giao cho phiên tiếp theo (2026-09-17, req-1 xong)

**Trạng thái**
- **Req-1 hoàn thành**: 15/15 step ✅. `main` tại `7a7998e` (merge PR #2), đã deploy lên `http://160.25.166.163:3001` và nghiệm thu checklist req-1 trên VPS. Sau commit chỉ còn thay đổi docs nghiệm thu (plan, file này) **chưa commit**.
- VPS `/opt/lang-simulator/.env` đã có 6 biến `R2_*` (upload media, ghi âm chạy thật trên container; image có `sharp`).
- DB dùng chung sạch: 1 System Owner, 3 gói, 2 danh mục + 3 loại đề hệ thống, 0 tenant/đề/bài làm; 2 bucket R2 trống.

**Việc tiếp theo**: req sau (plan mục 8: domain + SSL để ghi âm không cần flag Chrome, thanh toán/thời hạn gói…). Theo quy trình: `req-2-question.md` → người dùng trả lời → `req-2-plan.md`.

---

_Bàn giao sau Step 13 (giữ để tham khảo):_ `exam_attempt_answers` có đủ cột chấm tay, mọi câu có dòng sau khi nộp; `recordingUrl` của học viên chỉ cho chủ lượt làm — Step 14 thêm route riêng cho người chấm; link menu `grading` đã có trang.

_Bàn giao sau Step 12 (giữ để tham khảo):_ `exam_attempts` tạo sớm ở Step 12; bắt đầu attempt khoá `exams FOR SHARE`; simulator tách để đọc content_public — đều đã làm ở Step 13.

_Bàn giao cũ (cuối phiên Step 8, giữ để tham khảo):_

**Database dùng chung (`lang-simulator` / `public` trên VPS)**
- Migration đã chạy: `CreateUsersAndRefreshTokens1789482175602`, `CreateTenantsAndMemberships1789486401727`, `SeedServicePlans1789486401728`, `AddTenantSuspensionReason1789490128190`, `AddMembershipLastActiveAt1789491719211`.
- `service_plans`: 3 gói `basic`/`standard`/`pro`. `tenants`, `memberships`: trống. `users`: 1 `SYSTEM_OWNER`, không còn dữ liệu test.

**Bắt đầu Step 9**
1. Đọc plan Step 9 (exam-core) và mục 4.4; mở các file LC được liệt kê (`indicator.tsx`, `labs/exam-editor/_lib/*`, mẫu `LC/docs/data/exam-draft-2.json`, `exam-editor-sample.json`).
2. Hỏi người dùng những điểm chưa rõ trước khi code (vd. định dạng `answer_key`, cách xáo `ordering/polytomous`).
3. Step 9 là package thuần, nghiệm thu bằng Jest + build ESM/CJS; không cần server/E2E. Mẫu E2E Step 8 (script Node + puppeteer-core trong scratchpad, sẽ mất) mô tả trong nhật ký Step 8.

### Việc người dùng chuẩn bị (plan mục 3)

| # | Việc | Trạng thái |
|---|---|---|
| P1 | 2 bucket R2 (public + private), gửi `R2_PUBLIC_BASE_URL` | ✅ 2026-09-16: `lang-simulator-public` (public access bật, URL `pub-….r2.dev`) + `lang-simulator-private`; người dùng tạo **API token riêng** cho lang-simulator (Object Read & Write, giới hạn 2 bucket) và tự điền 6 biến `R2_*` vào `apps/lang-api/.env`; mình copy sang `deploy/.env` (không đọc giá trị). Đã upload/xoá thử file thật trên bucket public |
| P2 | Database `lang-simulator` + user `lang_simulator` (quyền CREATE trên schema `public`); **Postgres VPS ≥ 13** | ✅ 2026-09-15: Postgres **16.15**; `lang_simulator` là owner database, không phải superuser, có CREATE trên `public`. Role ban đầu thiếu `LOGIN` → đã `ALTER ROLE … LOGIN PASSWORD` (mật khẩu ngẫu nhiên 64 ký tự, chỉ nằm trong `apps/lang-api/.env`) |
| P3 | GitHub repo `vunguyenquangit/lang-simulator` + secrets VPS/GHCR | ✅ 2026-09-15: workflow build, push GHCR, scp và ssh deploy đều chạy được (repo private, máy dev không có `gh`) |
| P4 | `/opt/lang-simulator` trên VPS, mở port 3001 | ✅ 2026-09-15: thư mục thuộc user `vunq` (cấp từ root), có `.env`; truy cập `:3001` từ ngoài OK |
| P5 | Đổi mật khẩu đang lộ trong LC | ❓ Chưa xác nhận |

### Quyết định chốt ngày 2026-09-15 (đã cập nhật plan, README, CLAUDE.md)

- Dev **không dùng Postgres local** nữa: `apps/lang-api/.env` nối database `lang-simulator` trên VPS, schema `public`.
- Chưa có production. Container trên VPS (:3001, Step 4) **dùng chung** database này với máy dev.
- Step 4 vẫn làm; **không cài Docker local**, kiểm chứng image qua GitHub Actions.
- Biến R2 để đến Step 10 mới thêm.
- Database `lang_simulator_dev` tạo ở Step 2 trên Postgres local không còn dùng (chưa xoá, chỉ có bảng `typeorm_migrations`).

Kiểm tra sau khi chuyển DB (2026-09-15):
- `migrate.ts` chỉ `CREATE SCHEMA` khi chưa có; `DB_SCHEMA` mặc định `public`; `.env.example` trỏ database VPS (không chứa giá trị thật).
- `pnpm build`, `lint`, `typecheck`, `test` (29), `format:check` → OK.
- `pnpm --filter lang-api migrate` và `node dist/database/migrate.js` bằng user `lang_simulator` → tạo `public.typeorm_migrations` (owner `lang_simulator`), chạy lại báo đã mới nhất.
- `node dist/main.js` (PORT=3199) → `/api/health` 200 `{"status":"ok","database":"up"}`.

### Đang chờ người dùng (cập nhật 2026-09-17, sau nghiệm thu req-1)

1. ~~VPS `.env` thêm `R2_*`~~ – xong 2026-09-17 (upload media + ghi âm trên :3001 chạy được).
2. ~~Kiểm image có `sharp`~~ – xong 2026-09-17 (image deploy từ `7a7998e` chạy được, ảnh upload trên VPS ra WebP).
3. Xem giao diện bằng mắt: `/login`, `/register`, `/me`, `/me/account`, `/admin`, `/admin/users`, `/admin/tenants`, `/admin/plans` (Step 5–7), `/`, `/me/tenants/new`, `/t/{slug}`, `/t/{slug}/dashboard`, `/t/{slug}/dashboard/members` (Step 8) `/t/{slug}/dashboard/media` + ô Logo trong form đăng ký trung tâm (Step 10), `/admin/exam-categories`, `/admin/exam-blueprints`, `/t/{slug}/dashboard/exam-categories`, `/t/{slug}/dashboard/exam-blueprints` (Step 11: bộ icon/màu, form module kéo thả), `/t/{slug}/dashboard/exams`, `…/exams/{id}/edit`, `…/exams/{id}/versions` (Step 12: trình soạn, tab section, xem trước, trang version; trên điện thoại thanh công cụ chiếm nhiều chỗ). Mình mới kiểm bằng ảnh chụp Chrome headless. Phần giao diện Step 8 do mình tự quyết (người dùng giao), xem plan Step 8 mục "Cập nhật khi làm Step 8".
4. VPS `/opt/lang-simulator/.env`: **không bắt buộc** thêm `JWT_ACCESS_EXPIRES_IN`, `REFRESH_EXPIRES_IN`, `COOKIE_SECURE` (đều có mặc định); `deploy/.env` trên máy dev đã thêm.
5. **Ghi âm Speaking cần HTTPS**: đã chốt ở Step 15 giữ HTTP, domain + SSL để req sau; thử ghi âm trên VPS bằng Chrome `chrome://flags/#unsafely-treat-insecure-origin-as-secure` thêm `http://160.25.166.163:3001` (hướng dẫn trong `docs/setup/deploy.md`).
6. Xem giao diện Step 13 bằng mắt: `/t/{slug}` (lượt làm gần đây + thẻ đề), `/t/{slug}/exams/{id}`, trang thi `/t/{slug}/attempts/{id}` (màn hình hướng dẫn, làm bài, đồng hồ, ghi âm, nộp toàn bài), `/t/{slug}/attempts/{id}/result`.
7. Xem giao diện Step 14 bằng mắt: `/t/{slug}/dashboard` (thẻ Bài chờ chấm), `/t/{slug}/dashboard/grading` (lọc, tìm), `/t/{slug}/dashboard/grading/{attemptId}` (đề bài, bài viết, nghe ghi âm, chấm từng câu, Lưu & câu tiếp), trang kết quả học viên sau khi chấm (tổng điểm tự luận).
8. ~~Step 15: commit, PR, deploy, nghiệm thu VPS~~ – xong 2026-09-17. Còn tuỳ ý xem bằng mắt: trang 404 (đường dẫn bất kỳ), thông báo mất mạng; commit thay đổi docs nghiệm thu.
9. Không bắt buộc: `REVOKE CONNECT ON DATABASE "lightc-general" FROM PUBLIC` (hiện `lang_simulator` vẫn CONNECT được DB của LC nhưng không có quyền trên bảng); giới hạn IP truy cập cổng 5432.

Đã xong ngày 2026-09-16: commit Step 9 (`350ad90 feat: exam core`) và Step 10 (`42adeb4 feat: r2 storage`); xoá `SEED_OWNER_PASSWORD` khỏi `apps/lang-api/.env` (đã kiểm lại tên biến, chỉ còn `SEED_OWNER_EMAIL`/`NAME`/`DOB`).

Đã xong ngày 2026-09-15: người dùng đổi mật khẩu superuser `admin` và cập nhật `lightc-general/backend/.env` (kết nối lại OK); `pnpm dev` đã khởi động lại với user `lang_simulator`.

---

## Nhật ký

### Step 15 – Hoàn thiện & nghiệm thu tổng (✅ 2026-09-17)

**Quyết định (người dùng chọn phương án đề xuất, đã ghi vào plan)**
- Test e2e phân quyền không dùng DB (app Nest thật + repository giả), chạy trong `pnpm test`.
- Giữ HTTP, ghi âm trên VPS thử bằng flag Chrome; domain + SSL để req sau.
- Mở PR build thử image trước, người dùng duyệt rồi mới push `main`.
- Không seed thêm dữ liệu mẫu.

**Đã làm**
- lang-api:
  - `src/access-control.e2e.spec.ts` (supertest): lấy mọi controller từ `AppModule` (đệ quy imports), guard toàn cục từ metadata `AuthModule`, `TenantGuard` + `AllExceptionsFilter` thật; repository User/Tenant/Membership/MembershipRole trong bộ nhớ, service thay bằng object rỗng (`useMocker`), interceptor gắn header rồi dừng ngay sau guard. Bảng `ROUTES` viết tay theo plan mục 5 cho **95 route**, test đầu kiểm bảng khớp đúng route thật. 20 người gọi: khách, token sai / không phải Bearer, user bị khoá, token cũ (`token_version`), user không tồn tại, phải đổi mật khẩu, Registered User, System Admin/Owner (không là thành viên), 5 role tenant, Student + Teacher, membership inactive, Owner tenant chờ duyệt, người ngoài vào tenant chờ duyệt (404), slug không tồn tại; lỗi luôn dạng `{ statusCode, message }`. Thêm test slug hoa thường.
  - `exam-content.service.spec.ts`: Teacher sửa metadata/lưu trữ/xoá/khôi phục đề người khác → 403; đề của tenant khác (xem, sửa, publish, xoá, danh sách version) → 404.
- lang-app:
  - `app/not-found.tsx`, `app/error.tsx` (nút Thử lại), `app/global-error.tsx` tiếng Việt, dùng `components/StatusPage.tsx`; xoá `ComingSoon` (không còn dùng) và chuỗi `comingSoon`.
  - `lib/api.ts`: `fetch` lỗi mạng → `ApiError` "Không kết nối được máy chủ…"; 5xx không có body JSON → "Máy chủ đang gặp sự cố…". `errorMessage` chỉ lấy message của `ApiError`; `LoginForm`/`RegisterForm` dùng `errorMessage`.
- Docs: README (đề thi, làm bài, chấm bài, ghi âm cần HTTPS, R2, test), `docs/setup/deploy.md` (ghi âm trên HTTP, kiểm tra nhanh sau deploy, sự cố 501 / không ghi âm được), CLAUDE.md. `.env.example` không đổi (không có env mới).

**Sai khác so với plan**
- Test e2e dừng ở tầng guard (không chạy service/SQL) theo lựa chọn của người dùng; quy tắc trong service dựa vào unit test.
- Không seed dữ liệu mẫu (người dùng chọn); nghiệm thu VPS bằng dữ liệu thử `step15-*` rồi xoá.

**Kiểm tra đã chạy**
- `pnpm build`, `lint`, `typecheck`, `test` (295: 57 shared + 49 exam-core + 189 api), `format:check` → OK.
- Test phân quyền chạy 3 lần liên tiếp đều đạt; thử bỏ `@TenantRoles` của `GradingController` và `@SystemRoles(SYSTEM_OWNER)` của route đổi system role → test báo đúng các route đó, đã khôi phục.
- Bản build (api `:3101`, `next start :3100`) + DB dùng chung, dữ liệu `step15-*` tạo qua API (System Admin duyệt tenant thật), Chrome headless ở **1366px và 390px**: khách (landing, đăng nhập, đăng ký, 404, trang trung tâm, trung tâm không tồn tại), user không thuộc trung tâm (`/me` trống, trang trung tâm "chưa là thành viên", dashboard, `/admin`), người < 18 tuổi đăng ký trung tâm bị chặn, System Admin (6 trang, tìm không khớp), tenant trống (tổng quan, thành viên, đề thi/chấm bài/media trống, danh mục, loại đề, trang trung tâm chưa có đề), Owner (danh sách đề, trình soạn, version, đề/bài chấm không tồn tại, **mất mạng khi lọc → thông báo tiếng Việt**), Học viên (trang trung tâm, chi tiết đề, đề/lượt làm/kết quả không tồn tại, dashboard bị chặn, làm trọn bài Reading → Writing → Speaking có ghi âm micro giả → kết quả → lịch sử). Mỗi trang: không tràn ngang ở 390px, không có chuỗi "Failed to fetch"/"Not Found"/"Invalid Date"/"undefined"/"NaN"…; không có lỗi JS. Lượt chạy cuối: 256/259 kiểm tra đạt, 3 lỗi đều do kịch bản (mong đợi sai chữ: bộ lọc mặc định "Chờ duyệt", nhãn "v1", lịch sử đã có lượt làm).
- Đã xem ảnh: 404, mất mạng, lượt làm/bài chấm không tồn tại, làm bài Reading/Speaking/xác nhận nộp/màn hình hướng dẫn trên điện thoại, kết quả, trang trung tâm, danh sách đề trống, landing, người dùng (admin), đăng ký trung tâm < 18 tuổi.
- Dữ liệu test + 2 file R2 đã xoá; DB còn 1 user, 0 tenant.

**Nghiệm thu trên VPS (2026-09-17, bản `7a7998e`, `http://160.25.166.163:3001`)**
- Người dùng thêm `R2_*` vào `/opt/lang-simulator/.env`, merge PR #2 → deploy. `/api/health` `database: up`; LC `:3000` vẫn trả 200 trước và sau nghiệm thu.
- Script API (scratchpad `vps-api.mjs`, gọi thẳng :3001, dữ liệu `step15-*`) theo checklist req-1 – 109/111 đạt, 2 lỗi do script mong đợi 201 trong khi API trả 200 (dữ liệu đúng):
  1. Đăng ký (trùng email hoa thường 409), sai mật khẩu 401 tiếng Việt, đổi mật khẩu (mật khẩu cũ hết hiệu lực), **khoá user → token đang dùng 401 ngay**, không đăng nhập được, mở khoá, reset mật khẩu tạm → bắt đổi mật khẩu (route khác 403).
  2. System Admin: tổng quan; bảo vệ System Owner (khoá/sửa 403), không tự khoá, không đổi system role; tạo user; user thường vào `/admin` 403. Tenant pending không vào dashboard, từ chối cần lý do, duyệt tenant đã từ chối 409; tạm ngưng/mở lại; tạo gói (trùng mã 409, hiện ở danh sách công khai), đổi gói tenant, xoá gói đang dùng 409; danh mục + loại đề hệ thống có module.
  3. < 18 tuổi đăng ký tenant 403; slug trùng 409.
  4. Membership: nhiều role (Admin + Teacher), tạo tài khoản phụ huynh, **vượt giới hạn gói → 409 tiếng Việt**, trùng thành viên 409, gắn phụ huynh (trùng 409), Tenant Admin không sửa/xoá Owner và không cấp Owner, Owner sửa role mình vẫn giữ `TENANT_OWNER`, Teacher/Student/người ngoài/System Admin bị chặn.
  5. Danh mục/loại đề tenant (loại đề tenant thuộc danh mục hệ thống, thêm module), Teacher chỉ đọc, tenant sửa mục hệ thống 403, tenant khác 404.
  6. Đề từ loại đề tenant sinh section theo module; Teacher không sửa đề người khác; publish/lưu trữ; đề không có câu hỏi chỉ cảnh báo (đúng plan Step 12).
  7. Thi: học viên không thấy đề lưu trữ; nội dung không có đáp án; lượt làm người khác 404; nộp 3 section + **upload ghi âm lên R2 private**; kết quả chấm tự động; section quá hạn → autosave 409 "Đã hết giờ", **cron trên container tự nộp** (`auto_submitted`).
  8. Lưu nội dung khi đã có bài làm → version 2; baseRevision cũ 409; khôi phục v1; lượt làm cũ vẫn xem kết quả.
  9. Chấm tay: danh sách, không lộ đáp án, người chấm tải được ghi âm từ R2, điểm vượt thang 400, chấm đủ → graded, học viên thấy điểm + nhận xét, không lộ người chấm.
  10. Media: `configured`, upload ảnh → WebP, URL public trả `image/webp` (**`sharp` chạy trong image**).
- Giao diện (Chrome headless, `--unsafely-treat-insecure-origin-as-secure=http://160.25.166.163:3001` + micro giả; `audit15.mjs` chạy với `APP` là VPS) ở 1366px và 390px: 258/259 đạt (1 lỗi do kịch bản: lượt 390px học viên đã có lượt làm từ lượt 1366px). Gồm làm trọn Reading → Writing → **Speaking ghi âm trên HTTP** → kết quả, 404 tiếng Việt, mất mạng tiếng Việt, không tràn ngang.
- `ui-vps.mjs`: trang media không cảnh báo R2, upload ảnh qua giao diện → `.webp` mở được; Teacher chấm Writing + Speaking (player phát được ghi âm từ R2) → Đã chấm 2/2; học viên thấy "Tổng điểm tự luận 15/20" + nhận xét; không có pageerror/5xx. Đã xem ảnh chụp trang chấm Speaking, ghi âm trên điện thoại, kết quả.
- Xoá dữ liệu thử: tenant/user `step15-*`, gói/danh mục/loại đề hệ thống thử, file R2 (2 bucket trống). DB còn 1 System Owner, 3 gói, 2 danh mục, 3 loại đề.

**Lỗi tự phát hiện và đã sửa**
- Mất mạng hiện "Failed to fetch" (tiếng Anh) ở mọi chỗ báo lỗi API → đổi trong `lib/api.ts` + `errorMessage`.
- Không có trang 404/lỗi tiếng Việt (Next.js hiện trang tiếng Anh mặc định).
- Test e2e: supertest mở cổng ngẫu nhiên trên `::` cho từng request, thỉnh thoảng trùng cổng process khác nghe `127.0.0.1` → response lạ; sửa bằng `app.listen(0, '127.0.0.1')` một lần.

### Step 14 – Chấm bài thủ công (✅ 2026-09-16)

**Quyết định (người dùng chọn phương án đề xuất, đã ghi vào plan)**
- Chấm lại được mọi lúc; lượt làm đã chấm xong giữ trạng thái `graded`.
- Câu Writing/Speaking bỏ trống vẫn chờ chấm (có nút "Cho 0 điểm").
- Trang Chấm bài chỉ có lượt làm đã nộp hết.
- Học viên thấy điểm từng câu ngay khi chấm.

**Đã làm**
- `@lang/shared/grading.ts`: `GRADING_COMMENT_MAX_LENGTH`, `GradingAttemptItem/List/Detail`, `GradingSection`, `GradingQuestion`, `GradeAnswerInput/Result`, `GradingAnswerState`, `GradingAttemptProgress`. `exam.ts`: `isValidManualScore(value, max)` (0 → max, bước 0,5) + test.
- lang-api:
  - `grading/`: `GradingController` (`t/:slug/grading`, `GRADER_ROLES`) + `GradingService`: `list` (QueryBuilder join user, lọc trạng thái/đề/tên-email có `escapeLike`, bộ lọc đề), `detail` (section có câu chấm tay, đề bài từ `content_public` bằng `sectionPrompts` trong `grading-content.ts`, bài viết, có ghi âm, người chấm, `nextAttemptId`), `grade` (transaction khoá lượt làm, kiểm câu chấm tay + điểm theo `max_score`, đếm lại `manual_graded_count`, đủ thì `graded` có điều kiện), `recordingUrl` cho người chấm. Bài của mình 403, lượt chưa nộp xong 409, không có câu chấm tay 404.
  - `TenantDashboardService`: số đề theo trạng thái, số lượt làm, bài chờ chấm (lượt `submitted` không phải của người xem) — trước đây trả 0.
  - `InMemoryRepository`: `Not(IsNull())` đọc toán tử con ở `child` (trước đây luôn khớp sai).
  - Test (+9): chi tiết (đề bài có hướng dẫn subpart, passage, bài viết, ghi âm, không có câu tự động), bài của mình 403 / tenant khác 404, lượt đang làm 409, chấm từng câu → graded + chấm lại không cộng dồn và giữ `graded_at`, chỉ chấm câu tay + điểm sai 400, câu bỏ trống + bài kế tiếp, link ghi âm, `sectionPrompts`, `GradeAnswerDto`.
- lang-app:
  - Trang `/t/{slug}/dashboard/grading`: `DataTable` + tìm học viên + lọc trạng thái (mặc định Chờ chấm, `?status=`) + lọc đề + phân trang.
  - Trang `/t/{slug}/dashboard/grading/{attemptId}` → `GradingAttemptView`: thông tin bài (học viên, đề, nộp lúc, tự động đúng, tiến độ), danh sách câu theo section (badge Chờ chấm / điểm / Chưa lưu), khung câu: passage part (thu gọn), đề bài (`ExamBlocks`), bài viết + đếm ký tự/từ hoặc player ghi âm (presigned, tải lại khi lỗi), ô điểm (kiểm ở client, form `noValidate` để báo lỗi tiếng Việt) + nhận xét, Lưu điểm / Lưu & câu tiếp, người chấm + thời điểm; chấm đủ → thông báo + link bài chờ chấm tiếp theo.
  - Tổng quan tenant: thẻ Bài chờ chấm bấm sang trang Chấm bài. `AttemptResultView`: tổng điểm tự luận khi mọi câu đã chấm. `ExamIntro` → `ExamBlocks` (dùng chung cho hướng dẫn section và đề bài khi chấm).

**Sai khác so với plan**
- Thêm `GET grading/attempts/:id/recordings/:answerId/url` (route học viên giữ nguyên chỉ chủ lượt làm) thay vì mở route learner cho người chấm.
- Tổng quan tenant: ngoài "bài chờ chấm" còn điền số đề theo trạng thái và số lượt làm (Step 12–13 còn trả 0).
- Trang kết quả học viên thêm tổng điểm tự luận.
- Trên điện thoại danh sách câu nằm trên khung chấm; "Lưu & câu tiếp" không tự cuộn tới câu mới.

**Kiểm tra đã chạy**
- `pnpm build`, `lint`, `typecheck`, `test` (272: 57 shared + 49 exam-core + 166 api), `format:check` → OK (chạy lại sau lần sửa cuối).
- Không có migration; entity không đổi.
- Bản build (api `:3101`, `next start :3100`), script Node qua rewrite `/api` + SQL trên DB dùng chung, **54/54 + 4/4 đạt** (chạy lại từ dữ liệu sạch): tổng quan Teacher bài chờ chấm 2 (không tính bài mình), Owner 3, lượt làm 4, đề publish 1; khách 401, Student 403, Owner tenant khác 403; danh sách Teacher 2 bài (không bài mình, không lượt dở), Owner 3, tìm tên không phân biệt hoa thường, tìm email, `%` không khớp tất cả, lọc đề + trạng thái + phân trang, trạng thái `in_progress` 400; chi tiết: 2 section 4 câu, đề bài có hướng dẫn subpart cho cả hai câu writing, passage part, bài viết, `maxChars`/`seconds`, có/không ghi âm, không lộ `checked`/`answerKey`/`isCorrect`, `nextAttemptId`, bài mình 403, lượt dở chưa nộp section 404, lượt dở đã nộp Writing 409 (chi tiết + chấm) và không có trong danh sách, id lạ 404, tenant B 404, bài bỏ trống; ghi âm m4a thật trên R2 private: presigned tải đúng số byte, câu không ghi âm 404, bài mình 403; điểm 11 / 7.25 / chuỗi / thiếu / nhận xét 5001 ký tự → 400 tiếng Việt, câu tự động 400, chấm bài mình 403, Student 403, tenant B 404; chấm câu 1 → submitted 1/4, học viên thấy điểm + nhận xét câu 1, câu khác chờ; đủ 4 câu → graded + `graded_at`; Owner chấm lại → vẫn graded, không cộng dồn, giữ `graded_at`, người chấm đổi; kết quả học viên 4 điểm, không lộ người chấm; lịch sử học viên graded; lọc Đã chấm; bài chờ chấm còn 1.
- Chrome headless (puppeteer-core), **34/34 đạt**: tổng quan thẻ Bài chờ chấm = 2 → bấm sang danh sách (2 bài, không bài của mình), lọc Đã chấm, tìm tên; trang chấm: header + tiến độ, 4 câu Chờ chấm, mở sẵn câu chưa chấm đầu tiên (đề bài, bài viết, đếm ký tự/từ), mở passage; điểm 11 báo lỗi tiếng Việt; 7.5 + nhận xét → Lưu & câu tiếp, badge 7.5/10, tiến độ 1/4; điểm nháp câu 2 báo "Chưa lưu" khi đổi câu và còn nguyên khi quay lại; câu 1 hiện người chấm; Speaking: player ghi âm tải được (có thời lượng), không có nút Cho 0 điểm; câu không ghi âm có nút Cho 0 điểm, câu cuối không có Lưu & câu tiếp; chấm đủ → thông báo + Đã chấm 4/4, DB graded; link bài chờ chấm tiếp theo mở bài bỏ trống; mở bài của mình báo lỗi; 390px danh sách + trang chấm không tràn ngang; học viên: kết quả tổng điểm tự luận 21.5/40 + nhận xét, không còn Chờ chấm, không vào được trang chấm; lỗi mạng chỉ có favicon 404 và 403 cố ý.
- Đã xem ảnh chụp: danh sách, trang chấm Writing, Speaking, chấm xong, điện thoại, kết quả học viên.
- Dữ liệu test + file R2 đã xoá.

**Lỗi tự phát hiện và đã sửa**
- `InMemoryRepository` xử lý `Not(IsNull())` sai (TypeORM giữ toán tử con ở `child`, `value` undefined) → đếm câu đã chấm sai trong unit test; đã sửa helper.
- Ô điểm `type=number` có `max`: bấm "Lưu điểm" với 11 bị trình duyệt chặn bằng tooltip (không có thông báo tiếng Việt) → form `noValidate`, kiểm bằng `isValidManualScore`.

**Lưu ý cho các step sau**
- Step 15: thêm test e2e supertest cho `grading` theo bảng quyền (Owner/Admin/Teacher được, Student/Parent 403, bài của mình 403).
- Presigned URL ghi âm có hạn; trang chấm mở lâu thì player lỗi → bấm "Tải ghi âm" để lấy link mới.
- Điểm tối đa câu chấm tay đọc từ `exam_questions.max_score` (hiện luôn 10).

### Step 13 – Làm bài thi & chấm tự động (✅ 2026-09-16)

**Quyết định (người dùng chọn phương án đề xuất, đã ghi vào plan)**
- Mỗi người 1 lượt làm dở mỗi đề; màn hình hướng dẫn/chờ section có nút "Nộp toàn bài".
- Đề lưu trữ/xoá mềm khi đang làm dở: vẫn làm tiếp được, chỉ chặn lượt mới; lịch sử + kết quả vẫn xem được.
- Ghi âm nhận `audio/webm` + `audio/mp4` (Safari).
- Trang kết quả chỉ mở khi đã nộp hết section.

**Đã làm**
- `@lang/shared/attempt.ts`: `ATTEMPT_GRACE_SECONDS` (10), giới hạn ghi âm/câu trả lời, `AttemptResponses`, kiểu `LearnerExamItem/List/Detail`, `LearnerAttemptItem`, `AttemptView` (`serverNow`, `current` = intro hoặc content + responses + recordings), `AttemptResult`.
- lang-api:
  - Entity + migration `CreateAttemptSectionsAndAnswers1789572935771` (generate): `exam_attempt_sections` (UNIQUE(attempt, sort_order), CHECK status, index một phần `deadline_at` đang làm, `responses` jsonb, `order_seed`), `exam_attempt_answers` (UNIQUE(attempt, question), `score numeric(4,1)`, `recording_key`, `graded_by` SET NULL), index unique một phần `UQ_exam_attempts_in_progress`. FK tới section/câu hỏi NO ACTION. Default jsonb viết đúng thứ tự khoá Postgres lưu (không thì generate báo lệch).
  - `AttemptsService`: tạo lượt (khoá đề `FOR SHARE`, đề phải publish, 409 khi đang có lượt dở / unique violation), xem (lazy chốt), bắt đầu section (phải là section tới lượt, idempotent), autosave (update có điều kiện `status` + `deadline_at ≥ now − 10s`), nộp section (idempotent khi đã chốt), nộp toàn bài, ghi âm (kiểm trước khi đẩy R2, kiểm lại trong transaction, ghi lại xoá file cũ, lỗi thì xoá file vừa đẩy), presigned URL, kết quả (không đáp án, không đúng/sai từng câu), `finalizeExpired` cho cron. `attempt-grading.ts`: `gradeSection` (dùng `gradeResponses` của exam-core) + `responseOf` + `isAttemptResponses`.
  - `LearnerExamsService`: danh sách đề publish (phân trang, lọc, bộ lọc danh mục/loại đề đang có đề), chi tiết đề (đề không còn mở chỉ xem được khi đã từng làm), lượt làm của tôi. `LearnerController` (`t/:slug/learner`), `AttemptsScheduler` (`@Cron` mỗi phút, không chạy chồng).
  - `AllExceptionsFilter`: 413 → "File vượt quá dung lượng cho phép". `numericTransformer` chuyển sang `common/sql.ts`.
  - Test (+12): tạo lượt chỉ trả intro; 1 lượt dở, đề lưu trữ 409, nháp 404; người khác 404; section sau khi section trước chưa nộp 409; nội dung không lộ `checked/answer/num/answerKey` và chữ đáp án, ordering có `key` đã xáo; chấm server khớp `gradeExam` + ghi đủ dòng câu trả lời (pick-n chung lựa chọn) + trạng thái `submitted` khi có câu tay + nộp lại không cộng dồn; quá hạn từ chối lưu, trong 10s vẫn nhận, lazy chốt bằng câu trả lời đã lưu; cron chỉ chốt lượt quá hạn; nộp toàn bài + kết quả không có đáp án; ghi âm (mime, câu không phải Speaking, chưa bắt đầu không đẩy file, ghi lại xoá file cũ, nộp giữ ghi âm, URL chỉ chủ lượt làm); dạng câu trả lời; filter 413.
- lang-app:
  - `components/exam-simulator` (chuyển từ `exam-editor`): `SimulatorProvider` thêm chế độ thi (`exam`: câu trả lời ban đầu, `onChange`, `onTabChange`, `onSubmit`, `locked`, `renderSpeaking`, cờ lưu localStorage); các ô nhập đọc giá trị ban đầu và đánh dấu đã trả lời; dòng có `key` dùng làm chỉ số và không xáo lại; `ExamIntro`; nút "Nộp section" luôn hỏi lại ở chế độ thi. Chuỗi chuyển sang `vi.simulator`.
  - `components/exam-taking`: `AttemptRunner` (trạng thái từ server, bù lệch giờ, xong thì sang trang kết quả), `SectionIntroScreen` (báo section vừa nộp/tự nộp, hướng dẫn, bắt đầu, nộp toàn bài có xác nhận, danh sách section), `SectionWorkspace` (autosave 3s + đổi tab + ẩn trang, một request lưu mỗi lúc, 409 → tải lại, hết giờ tự nộp + thử lại khi lỗi mạng, cảnh báo rời trang khi chưa lưu), `Countdown`, `SpeakingRecorder` (MediaRecorder, giới hạn `seconds`, nghe lại, ghi lại, tải lên ngay, báo khi trình duyệt không cho ghi âm), `ExamHeader`.
  - `components/learner`: `LearnerExamList` (thẻ đề, tìm/lọc, phân trang), `MyRecentAttempts`, `LearnerExamDetailView` (bắt đầu/làm tiếp/đề đã đóng, cấu trúc đề, lịch sử), `AttemptResultView`, badge/link lượt làm. Trang `/t/{slug}/exams/[examId]`, `/t/{slug}/attempts/[id]/result`, `(exam)/t/{slug}/attempts/[id]`; middleware chặn thêm `/t/:slug/exams/*`.

**Sai khác so với plan**
- Bảng `exam_attempts` đã có từ Step 12; Step 13 chỉ thêm 2 bảng + index unique một phần.
- API thêm `GET learner/attempts` (lượt làm gần đây ở trang trung tâm) và `POST attempts/:id/finish` (nộp toàn bài); route đặt dưới `t/:slug/learner/*`.
- `exam_attempt_answers` ghi cho mọi câu (plan chỉ nói "sinh khi nộp section"); câu Speaking có dòng từ lúc tải ghi âm.
- Câu chấm tay bỏ trống vẫn chờ chấm (không tự cho 0) — theo plan, có thể đổi ở Step 14 nếu muốn.
- Ghi âm chưa dùng được trên VPS vì HTTP (xem mục chờ người dùng số 5).

**Kiểm tra đã chạy**
- `pnpm build`, `lint`, `typecheck`, `test` (251: 45 shared + 49 exam-core + 157 api), `format:check` → OK (chạy lại sau lần sửa cuối).
- `pnpm --filter lang-api migrate` trên DB dùng chung → chạy `CreateAttemptSectionsAndAnswers`; `migration:generate` lại → "No changes" (lần đầu báo lệch default jsonb, đã sửa entity).
- Kiểm ngược unit test: bỏ điều kiện thứ tự section và điều kiện quá hạn → 3 test fail, đã khôi phục.
- Bản build (api `:3101`, `next start :3100`), script Node qua rewrite `/api` + SQL, **71/71 đạt**: khách 401, người ngoài 403; học viên thấy 1 đề publish (không thấy nháp), số liệu thẻ đề, bộ lọc, lọc tên có `%`, đề nháp 404; tạo lượt → intro, lượt thứ hai 409, người khác 404; section 2 trước 409; deadline +45 phút, bắt đầu lại không đổi; content không lộ đáp án, ordering có `key` đã xáo, tải lại cùng thứ tự; câu trả lời sai dạng/trường lạ 400; autosave + tải lại giữ; ghi âm thật trên R2 private (video 400, không phải Speaking 400, > 10MB 413 tiếng Việt, webm 201, key đúng prefix, presigned tải được, người khác 404, ghi lại mp4 → file cũ bị xoá khỏi R2); sửa đề khi có bài làm → version 2, lượt làm vẫn đọc version 1; nộp section 1 → 6/6, 7 dòng câu trả lời, speaking giữ ghi âm; kết quả khi chưa xong 409; section 2: trong 10s vẫn lưu, quá hạn 409, GET tự chốt bằng câu trả lời đã lưu (6/6, `auto_submitted`), lượt làm 12/12 + 2 câu chờ chấm, kết quả theo section không có đáp án/bài làm; lượt 2 dùng version 2, **cron chốt section quá hạn** (chờ < 75s); lưu trữ đề: ẩn khỏi danh sách, chi tiết vẫn xem (isOpen=false), người chưa làm 404, vẫn làm tiếp, nộp toàn bài, lượt mới 409; lượt làm của tôi + lọc.
- Chrome headless (puppeteer-core, micro giả), **44/44 đạt**: trang trung tâm (lượt làm gần đây, thẻ đề), trang đề → bắt đầu → màn hình hướng dẫn (không lộ nội dung) → bắt đầu section, đồng hồ ~45:00; trả lời radio, 2 blank, gắn cờ, 2 select, sắp xếp ordering bằng nút lên/xuống, ghi âm 2s → tải lên → nghe lại; "Đã lưu" + DB có câu trả lời; **tải lại giữa chừng giữ câu trả lời, ghi âm, cờ, thứ tự, thời gian không reset**; nộp section có xác nhận → màn hình section 2 báo đã nộp, DB 6/6; section 2 trả lời + autosave, đặt deadline còn 5s → đồng hồ đếm theo server → **hết giờ tự nộp → trang kết quả** (6/6, 2/6, badge hết giờ, chờ chấm, không có đáp án); 390px: trang trung tâm, hướng dẫn, vùng làm bài, kết quả không tràn ngang; nộp toàn bài từ màn hình chờ; xem trước trong trình soạn đề vẫn chấm ở client (1 / 6, có Làm lại); console chỉ có 404 favicon/prefetch `grading`.
- Xoá cứng tenant test có lượt làm + câu trả lời → CASCADE chạy (FK NO ACTION đúng); file R2 test đã xoá.
- Đã xem ảnh chụp: trang trung tâm, trang đề, màn hình hướng dẫn, vùng làm bài (desktop Part 2 có ghi âm, điện thoại), kết quả.

**Lỗi tự phát hiện và đã sửa**
- Multer chặn file ghi âm quá cỡ với message tiếng Anh "File too large" → `AllExceptionsFilter` đổi 413 sang tiếng Việt.
- `migration:generate` báo lệch default jsonb `responses` do Postgres sắp lại khoá → viết default theo thứ tự đã lưu.
- StrictMode (dev) gỡ rồi dựng lại effect làm cờ `unmounted` của `SectionWorkspace` kẹt `true` (autosave không chạy) → đặt lại cờ mỗi lần dựng effect.

**Lưu ý cho các step sau**
- Step 14: dùng `exam_attempt_answers` + `exam_questions` (grading `manual`); nội dung câu hỏi lấy `content_public` của đúng section trong lượt làm (`exam_attempt_sections.section_id`). Mở `recordingUrl` cho người chấm. Khi chấm đủ `manual_count` câu → `graded` + `graded_at` (update có điều kiện `status = 'submitted'`).
- Ghi âm trên VPS cần HTTPS (hoặc flag Chrome) — nghiệm thu Step 15 phải có domain + SSL hoặc chấp nhận thử bằng flag.
- Cron chạy ở mọi process API (máy dev + container dùng chung DB): an toàn vì chốt trong transaction có khoá dòng, nhưng log "Đã chốt" có thể xuất hiện ở máy khác.

### Step 12 – Đề thi, trình soạn thảo & version (✅ 2026-09-16)

**Quyết định (người dùng chọn phương án đề xuất, đã ghi vào plan Step 12)**
- Đề đã publish/lưu trữ phải hết lỗi mới lưu được nội dung (422); đề nháp lưu tự do.
- Lưu trữ → publish lại được; không có đường về nháp; đề lưu trữ vẫn sửa được.
- Tạo bảng `exam_attempts` ngay ở Step 12 để quy tắc version đếm bài làm thật.
- Teacher mở đề người khác ở chế độ chỉ xem (nội dung, xem trước, version).

**Đã làm**
- `@lang/shared/exam-content.ts`: giới hạn (tên 200, mô tả 2000, tên section 100, 1–20 section), `EXAM_STATUS_TRANSITIONS`, kiểu `ExamListItem`, `ExamDetail`, `ExamSectionItem`, input tạo/sửa/lưu/khôi phục, `ExamVersionList/Item/Detail`, `ExamContentIssue`. `ExamBlueprintItem.examCount`.
- `@lang/exam-core`: `MAX_NODE_ID_LENGTH = 64`, `validateSectionShape` chặn id indicator dài hơn.
- lang-api:
  - Entity + migration `CreateExams1789567469674` (generate): `exams` (`content_revision`, xoá mềm, FK loại đề NO ACTION), `exam_sections` (CHECK duration/status, INDEX(exam_id, version)), `exam_parts` (UNIQUE(section, node), cha CASCADE), `exam_questions` (UNIQUE(section, number), CHECK qtype/grading, `max_score numeric(4,1)` đổi sang number), `exam_attempts` (mục 4.5). Helper `sqlDurationMinutes` (dùng lại cho `exam_modules`, generate vẫn "No changes").
  - `ExamsService`: danh sách (QueryBuilder, lọc, phân trang, số section/câu/phút theo version hiện tại, `canEdit`), `creators`, tạo đề từ loại đề (`ExamBlueprintsService.findUsable`), chi tiết (`hasAttempts`, `contentSavedAt`), sửa metadata, publish (validate mọi section, update có điều kiện trạng thái cũ), lưu trữ, xoá (mềm nếu có bài làm).
  - `ExamContentService`: `save` (400 định dạng → khoá dòng đề → quyền → revision → 422 nếu không nháp và còn lỗi → có bài làm thì deactivate + version mới, không thì xoá section cũ → insert section/part/câu → tăng revision), `restore`, `listVersions` (số bài làm theo version), `getVersion`. Controller `t/:slug/exams` (`EXAM_AUTHOR_ROLES`), `VersionPipe`.
  - `AllExceptionsFilter` giữ `issues`; `validationExceptionFactory` bỏ tiền tố đường dẫn message lồng nhau (lưu ý từ Step 11). `ExamBlueprintsService.list` đếm số đề (kể cả xoá mềm).
  - Test (+11): `exam-content.service.spec` (tạo đề sinh section, loại đề ngừng dùng 400, lưu chưa có bài làm giữ version + thay câu hỏi, có bài làm → version mới + cũ deactivated, khôi phục ghi đè/tạo version, Teacher sửa đề người khác 403, revision cũ 409, data: URI 400, publish lỗi 422 kèm issue + lưu đề đã publish còn lỗi 422 + lưu trữ/publish lại, DTO), `validation.spec`, filter giữ `issues`.
- lang-app:
  - Plate 53 (cùng bản LC) + `components/plate`: `value.ts` (`toEditorValue` kiểm dạng + migrate), `toolbar.tsx`, `exam/indicator|blank|pair|list-render|number-popover|media|table|marks|plugins|embedded-media|selection`.
  - `components/exam-editor`: `ExamEditor` (header trạng thái/version, Lưu + Ctrl+S, xác nhận tạo version mới khi có bài làm, upload data: URI trước khi lưu rồi thay URL trong editor, lỗi 422 bấm để tới đúng tab/indicator, publish/lưu trữ, bản nháp localStorage, cảnh báo rời trang), `SectionTabs` (thêm trống/từ module, đổi tên, chọn thời lượng, xoá có xác nhận, kéo sắp xếp, số lỗi mỗi tab), `SectionEditor` (toolbar, slash menu, mini map, bảng kiểm tra, dialog dạng câu hỏi, MediaDialog, nhập/xuất JSON), `PreviewDialog` (chọn section) + `ExamSimulator`/`SimulatorState` (chép LC, bỏ `any`), `exam-draft.ts`, `editor-sections.ts`.
  - `components/exams`: `ExamFormModal` (tạo đề/sửa thông tin, loại đề nhóm theo danh mục, gợi ý tên + section sẽ tạo), `ExamStatusBadge`. Trang danh sách đề, trình soạn (hỏi khôi phục bản nháp mới hơn bản server), trang version (xem nội dung, khôi phục có nêu rõ ghi đè hay tạo version). Trang Loại đề thêm cột Số đề, khoá xoá khi > 0.

**Sai khác so với plan**
- Thêm `exams.content_revision`, FK NO ACTION thay RESTRICT, bảng `exam_attempts` tạo sớm, `GET exams/creators` (đã ghi plan).
- Preview chưa ghi âm Speaking (như LC); nhập/xuất JSON theo section hiện tại.
- Kéo sắp xếp tab section dùng HTML5 drag & drop, chưa có nút trái/phải (bàn phím không sắp xếp được tab).
- Rời trang bằng link trong app khi chưa lưu không bị chặn (chỉ `beforeunload`); nội dung vẫn còn trong bản nháp.
- Xoá media không kiểm đề đang dùng (lưu ý Step 10) — chưa làm.

**Kiểm tra đã chạy**
- `pnpm build`, `lint`, `typecheck`, `test` (238: 45 shared + 49 exam-core + 144 api), `format:check` → OK (chạy lại sau lần sửa cuối).
- `pnpm --filter lang-api migrate` trên DB dùng chung → chạy `CreateExams`; `migration:generate` lại → "No changes".
- Kiểm ngược unit test: đảo điều kiện `hasAttempts` và cho mọi người sửa đề → 4 test fail, đã khôi phục.
- Bản build (api `:3101`, `next start :3100`), script Node qua rewrite `/api`, **83/83 đạt**: khách 401, người ngoài/Học viên/tenant khác/System Admin không membership 403; Teacher tạo IELTS → 4 section đúng module/phút; thiếu tên, id sai, loại đề tenant khác, loại đề ngừng dùng → 400; Owner mở đề Teacher `canEdit`, Teacher khác chỉ xem, id tenant khác 404; lưu 4 section → `exam_questions` đúng số câu/đáp án (MC, 2 blank với `|`, TFNG, matching, writing/speaking chấm tay `max_score 10`), `exam_parts` đúng part/subpart/số câu/cha, `content_public` không còn `checked`/`answer`/chữ trong blank; revision cũ 409; Owner lưu đề Teacher, section cũ xoá hẳn; data: URI, duration 47 (message không tiền tố), 0 section, indicator thiếu id, field lạ → 400 và không đổi revision; nháp lưu được khi lỗi, publish lỗi 422 kèm issue đúng section/indicator, publish OK, publish lại 409, đề publish lưu lỗi 422 / lưu đúng 200; chèn bài làm `in_progress` qua SQL → `hasAttempts`, lưu → v2 (v1 deactivated, câu hỏi v1 còn), danh sách version (số bài làm), xem v1, version 99/abc 404, khôi phục: Teacher khác 403, revision cũ 409, version hiện tại 400, ghi đè v2 khi chưa có bài làm, tạo v3 khi v2 có bài làm; Tenant Admin lưu trữ, lưu trữ lại 409, publish lại; sửa tên/mô tả/loại đề không đổi version/revision, đổi sang loại đề ngừng dùng 400; lọc trạng thái/loại đề/danh mục/người tạo/tên (cả `%`), phân trang, `creators`, tenant B không thấy; `examCount` trang tenant + hệ thống, xoá loại đề có đề 409; xoá đề chưa có bài làm → xoá hẳn rồi xoá được loại đề, đề có bài làm → xoá mềm, GET 404; lưu section 120 câu (~106 KB).
- Chrome headless (puppeteer-core), **58/58 đạt, chạy lặp 3 lần**: tạo đề qua modal (gợi ý tên, danh sách section) → 4 tab; soạn bằng toolbar (Part, Question MC qua dialog, danh sách checkbox, tick radio), slash menu `/quest` → fill-blank, bôi đen + nút Blank; tab báo số lỗi, bảng kiểm tra, mini map; Ctrl+S lưu, DB đúng đáp án, xoá bản nháp; gõ thêm → bản nháp localStorage → tải lại hỏi khôi phục (Khôi phục / Dùng bản trên server); thêm section từ module, đổi tên, đổi thời lượng, xoá có xác nhận, thêm section trống; nhập JSON có ảnh data: URI → lưu upload R2, DB và editor đổi sang URL R2, URL trả 200; xem trước chọn section, không lộ đáp án, nộp 2/2; publish; lưu đề đã publish còn lỗi 422 → bấm lỗi về tab, hoàn tác; có bài làm → hỏi tạo version → v2; trang version (v1 có 1 bài làm), xem nội dung, khôi phục nêu rõ ghi đè; sửa thông tin đề; Teacher khác: badge Chỉ xem, không toolbar/Lưu, editor không gõ được, vẫn xem trước, danh sách chỉ có Xem đề; lọc, lưu trữ, xoá (mềm) từ danh sách; 390px danh sách + trình soạn không tràn ngang; console chỉ có 404 favicon/prefetch `grading` và 422 cố ý.
- Xoá cứng 2 tenant test có đề + bài làm → CASCADE chạy (FK NO ACTION đúng).
- Đã xem ảnh chụp: danh sách đề, trình soạn (desktop Reading có TFNG/matching, mobile), xem trước, trang version, chế độ chỉ xem.

**Lỗi tự phát hiện và đã sửa**
- Plate mặc định gắn `id` cho mọi block khi tạo editor → nội dung trong editor luôn khác bản làm mốc, trạng thái "Có thay đổi chưa lưu" và bản nháp không bao giờ xoá sau khi lưu → `nodeId: false`, và sau khi lưu đồng bộ state với nội dung vừa gửi (không nháy "chưa lưu").
- Bôi đen bằng bàn phím ngay sau khi chèn câu hỏi qua dialog rồi bấm nút Blank (lần đầu) không có tác dụng: slate-react chưa đồng bộ vùng chọn DOM vào editor (phím tắt vẫn chạy) → `syncSelectionFromDom` trước khi tạo blank/cặp ghép.
- Màn hình 390px: thanh tab section bị ép còn vài ký tự → tablist có bề rộng tối thiểu, nút thao tác xuống dòng.
- `FormAlert` là `<p>` nên không chứa được danh sách lỗi → đổi sang `<div>`, thêm tone `info`.

**Lưu ý cho các step sau**
- Step 13: `exam_attempts` đã có; khoá `exams` `FOR SHARE` khi bắt đầu; lượt làm dùng `content_public` + `shuffleOrdering`, chấm bằng dòng `exam_questions` (`GradableQuestion` = `number`, `node_id`, `qtype`, `answer_key`). Đề phải `published` và chưa xoá mềm. Trang `/t/{slug}` (khu vực chính) cần API learner riêng, không dùng `t/:slug/exams` (chỉ người soạn đề).
- Simulator ở `components/exam-editor` đọc `raw_data` và chấm ở client; trang thi Step 13 phải tách renderer đọc `content_public` (dòng ordering có `key`), không có đáp án.
- Menu dashboard vẫn còn link `grading` chưa làm → prefetch 404 trong console.
- Chưa có kiểm "media đang được đề dùng" trước khi xoá ở Thư viện media.

### Step 11 – Danh mục đề & Loại đề (✅ 2026-09-16)

**Quyết định (người dùng chọn phương án đề xuất, đã ghi vào plan Step 11)**
- Icon/màu danh mục chọn từ bộ có sẵn (8 màu Solarized, 12 icon lucide).
- Mã IN HOA, sửa được, unique theo phạm vi; tenant được trùng mã hệ thống; mã module unique trong loại đề.
- Xoá cứng khi chưa dùng (409 nếu đang dùng); ngừng dùng chỉ chặn chọn mới, vẫn hiện trong danh sách (kể cả với tenant). Module xoá tự do.
- Danh mục sắp xếp bằng ô Thứ tự; loại đề bắt buộc ≥ 1 module.

**Đã làm**
- `@lang/shared/exam-catalog.ts`: `CatalogScope`, `ExamCategoryColor`, `ExamCategoryIcon`, `EXAM_CATALOG_CODE_PATTERN` + giới hạn độ dài, `EXAM_BLUEPRINT_MIN/MAX_MODULES`, `normalizeCatalogCode`, kiểu `ExamCategoryItem`, `ExamCategoryRef`, `ExamModuleItem`, `ExamBlueprintItem`, `ExamModuleInput` (+ spec).
- lang-api `exam-catalog/`:
  - Entity `ExamCategory`, `ExamBlueprint`, `ExamModule`: 2 partial unique index mã (hệ thống / tenant), CHECK định dạng mã, icon, màu, duration (5..180, %5); unique (blueprint, code) deferred; FK tenant CASCADE, category RESTRICT, module CASCADE, `created_by`/`updated_by` SET NULL.
  - Migration `CreateExamCatalog1789565466681` (generate rồi format lại) + `SeedExamCatalog1789565466682` (chỉ thêm mã chưa có; module chỉ thêm cho loại đề chưa có module).
  - `catalog-scope.ts` (`CatalogOwner`, `findVisible`, `findOwned`, `ownedBy`, `scopeOf`), mapper, `ExamCategoriesService`, `ExamBlueprintsService` (lưu loại đề + module trong transaction, `saveModules` xoá/sửa/thêm theo `id`), DTO (`CatalogCodeField`… tự đổi in hoa, `ModulesField` ValidateNested, duration qua `isValidDurationMinutes`).
  - Controller `/admin/exam-categories|exam-blueprints` (`SYSTEM_MANAGER_ROLES`) và `/t/:slug/exam-categories|exam-blueprints` (class `TENANT_MANAGER_ROLES`, `GET` ghi đè `EXAM_AUTHOR_ROLES`). `ExamCatalogModule` export `ExamBlueprintsService`.
  - Test: `exam-categories.service.spec` (5), `exam-blueprints.service.spec` (6 service + 6 DTO).
- lang-app `components/exam-catalog/`: `ExamCategoriesView`, `CategoryFormModal` (chọn icon/màu, xem trước), `ExamBlueprintsView` (lọc tên/mã, danh mục, phạm vi, trạng thái; mục không sửa được có nút Xem), `BlueprintFormModal` (chọn danh mục theo nhóm Hệ thống/Trung tâm, chế độ chỉ xem bằng `fieldset disabled`, kiểm trùng mã module ở client), `ModulesEditor` (kéo thả bằng tay cầm + nút lên/xuống/xoá, select 5..180 phút), `catalog-ui.tsx` (`CategoryIcon`, `ScopeBadge`, `ActiveBadge`, `matchesSearch` bỏ dấu, `useCatalogList`). 4 trang mỏng gọi view; chuỗi `vi.examCatalog`.

**Sai khác so với plan**
- Plan 6.2 ghi "CRUD": sửa dùng `PATCH` (plan đã sửa); danh sách không phân trang, lọc ở client.
- Loại đề chưa đếm/kiểm đề thi đang dùng (bảng `exams` chưa có); chặn xoá dựa vào FK RESTRICT của Step 12.
- Không thêm thư viện kéo thả; module có thêm ô mô tả (plan 4.3 có cột `description`).

**Kiểm tra đã chạy**
- `pnpm build`, `lint`, `typecheck`, `test` (227: 45 shared + 49 exam-core + 133 api), `format:check` → OK (chạy lại sau lần sửa cuối).
- `pnpm --filter lang-api migrate` trên DB dùng chung → chạy 2 migration; `migration:generate` lại → "No changes". Truy vấn DB: 2 danh mục, 3 loại đề, 8 module đúng thứ tự/phút.
- Kiểm ngược unit test: bỏ kiểm phạm vi danh mục và kiểm `id` module trong service → 2 test fail, đã khôi phục.
- Bản build (api `:3101`, `next start :3100`), script Node qua rewrite `/api`, **61/61 đạt**: khách 401, user thường vào `/admin/*` 403, người ngoài / Học viên / System Admin không có membership vào API tenant 403; seed đúng; admin tạo danh mục (mã thành in hoa), trùng 409, mã có dấu/icon lạ 400; loại đề: duration 47 → 400, 0 module 400, trùng mã module 400, **đổi chéo mã 2 module trong 1 request 200** (unique deferred), thêm/xoá/giữ id module, `updated_by` đúng; Owner A thấy mục hệ thống, tạo danh mục trùng mã `EN` hệ thống, sửa/xoá mục hệ thống 403, tạo loại đề trong danh mục hệ thống và của mình, danh sách hệ thống trước, đếm loại đề theo phạm vi; Teacher xem 200, ghi 403; tenant B không thấy/không sửa được mục của A (404), dùng danh mục/module của A 400; admin sửa mục tenant qua `/admin` 404; loại đề hệ thống thuộc danh mục tenant 400; xoá danh mục có loại đề của tenant 409; ngừng dùng danh mục chặn tạo mới và đổi sang, loại đề giữ danh mục cũ vẫn sửa được; xoá loại đề xoá module (CASCADE), xoá danh mục trống 204; id sai định dạng 404.
- Chrome headless (puppeteer-core), **31/31 đạt, chạy lặp 7 lần**: System Admin xem danh mục/loại đề mẫu; tạo danh mục qua modal (mã tự in hoa, icon/màu lưu đúng); tạo loại đề 3 module (tổng phút cập nhật), **kéo thả module bằng tay cầm**, nút chuyển lên, trùng mã module báo lỗi trước khi gửi, lưu đúng thứ tự/phút; sửa xoá 1 module; lọc theo danh mục; nút xoá danh mục đang dùng bị khoá; 390px trang + form không tràn ngang; Owner A: badge Hệ thống/Trung tâm, mục hệ thống chỉ có nút Xem (modal chỉ đọc, không có Lưu/Thêm module), tạo danh mục trung tâm, lọc phạm vi, chọn danh mục chia nhóm; Teacher không có nút tạo/sửa, có ghi chú chỉ xem; Học viên bị chặn dashboard; dữ liệu mẫu không đổi; console chỉ có 404 prefetch trang chưa làm.
- Đã xem ảnh chụp: danh sách loại đề của Owner, form loại đề (desktop), form sửa trên mobile, bộ lọc phạm vi.

**Lỗi tự phát hiện và đã sửa**
- Lần chạy E2E đầu, script bấm nhầm nút Sửa của **JLPT N2 (dữ liệu mẫu)** do danh mục test có thứ tự 0 đứng đầu, và xoá mất module `LANGUAGE_READING`. Đã khôi phục bằng SQL (đúng mã/tên/thứ tự/phút, `updated_by` về NULL; id module mới, chưa có gì tham chiếu). Script sửa để bấm theo mã dòng và thêm bước kiểm dữ liệu mẫu không đổi.
- Nhấn tay cầm kéo rồi thả chuột ở chỗ khác mà không kéo thì dòng module giữ `draggable` (bôi chọn chữ trong ô thành kéo) → lắng nghe `pointerup` trên `window` để tắt.

**Lưu ý cho các step sau**
- Step 12: tạo đề chọn loại đề qua `GET t/:slug/exam-blueprints` (lọc `isActive` ở client, section sinh từ `modules` theo `sortOrder`, `duration = referenceDurationMinutes`); server kiểm lại loại đề nhìn thấy được + đang dùng. `exams.blueprint_id` FK RESTRICT; trang Loại đề có thể thêm cột số đề và khoá nút xoá như danh mục.
- Lỗi validate lồng nhau của Nest có tiền tố đường dẫn (vd. `modules.0.Thời lượng tham khảo…`); UI chặn trước nên người dùng không thấy, nhưng editor Step 12 có payload lồng sâu hơn → cân nhắc `exceptionFactory` riêng.
- Menu dashboard vẫn còn link tới trang chưa làm (`exams`, `grading`) → prefetch 404 trong console.

### Step 10 – Upload media (R2) (✅ 2026-09-16)

**Quyết định (người dùng chọn, đã cập nhật plan Step 10)**

- Phạm vi: **trang Thư viện media** trong dashboard tenant + **logo trung tâm** (đúng phạm vi plan, cần chỗ upload thật vì editor tới Step 12 mới có).
- Logo đặt theo **user** (`users/{userId}/branding/…`, `POST /me/branding/upload`) thay vì `tenants/{tenantId}/branding/…`: form đăng ký chọn logo khi tenant chưa tồn tại.
- Ảnh convert **webp bằng `sharp`** như LC (audio/video giữ nguyên).

**Đã làm**

- Backend `apps/lang-api/src/storage/`: `R2Service` (2 bucket, `put`/`delete`/`list`/`presignedGetUrl` 600s, thiếu env → 501, `createClient` tách ra để test), `MediaService`, `media-file.ts` (loại/đuôi/giới hạn/key), `MediaController` (`GET status`, `GET`, `POST upload`, `DELETE ?key=` dưới `/t/:slug/media`, `@TenantRoles(...EXAM_AUTHOR_ROLES)`), `BrandingController`. `StorageModule` export `R2Service`/`MediaService` cho Step 13.
- Env: 6 biến `R2_*` **tuỳ chọn** trong `env.validation.ts` + `.env.example` + `deploy/.env.example` + `docs/setup/deploy.md`.
- `@lang/shared/media.ts`: `MediaKind`, `MEDIA_SIZE_LIMITS` (5/50/100MB), `MediaStatus`, `MediaItem`, `mediaKindFromExtension`.
- Logo tenant: `logoUrl` vào `TenantFormDto` + `formFields` (dùng cho cả đăng ký và gửi lại), `TenantAvatar` nhận `logoUrl`, dùng ở `/me` và `/t/{slug}`.
- Frontend: `lib/media-api.ts`, `lib/embedded-media.ts` (`uploadDataUrls`), `lib/clipboard.ts` (có đường lùi `execCommand` vì VPS chạy HTTP), `components/media/MediaDialog.tsx` + `LogoPicker.tsx`, trang `/t/{slug}/dashboard/media`, menu + `vi.media`, `formatBytes`, `FormAlert` thêm tone `warning`.
- Test: **116** (thêm `media-file.spec`, `media.service.spec`, `r2.service.spec` và 2 case env R2).

**Sai khác so với plan**

- Key logo theo user (lý do ở trên) → plan đã sửa.
- Thêm route `/t/{slug}/dashboard/media` (mục 6.1 chưa có); không thêm bảng DB, danh sách đọc thẳng R2 theo prefix (tối đa 1000 key, không phân trang).
- `MediaDialog` viết lại thay vì copy LC (không phụ thuộc Plate); `embedded-media.ts` chưa có `applyDataUrls` (cần editor Plate → Step 12).
- `R2Service` gộp `putObject/deleteObject` thành `put`/`delete` có tham số `scope` thay vì mỗi bucket một hàm.

**Nghiệm thu (chạy thật 2026-09-16, không chỉ build)**

- API `:3199` với `.env` thật, tenant test `test-step-10`: upload jpg → **webp 1794B**, mp3 200KB, mp4 500KB; 3 URL public trả **200** đúng `content-type`; `GET` list ra 3 file; pdf → 400; xoá key của tenant khác → **403**; xoá file của mình → 204 rồi URL trả **404**; `POST /me/branding/upload` → 201, URL 200.
- Đăng ký tenant kèm `logoUrl` → 201, lưu đúng URL; `logoUrl: javascript:alert(1)` → 400.
- API `:3198` với 6 biến R2 **để trống**: khởi động bình thường (log cảnh báo), `status` trả `configured:false` + lý do, `upload`/`list`/`branding` đều **501**.
- Giao diện (Chrome headless, `next dev` :3100 → API :3199): đăng nhập → `/t/test-step-10/dashboard/media` hiện bảng đúng (tên file, badge loại, dung lượng, thời gian, nút chép/mở/xoá); upload qua nút "Tải lên" làm số file tăng; menu có "Thư viện media"; `/me/tenants/new` hiện LogoPicker; `/me` hiện logo lấy từ R2 trên thẻ tenant.
- Dọn sạch sau nghiệm thu: 4 object R2 đã xoá (bucket public còn **0**), tenant/membership/user test đã xoá (DB còn 0 tenant, 0 membership, 1 user System Owner).

**Lỗi tự phát hiện và đã sửa**

- `@IsOptional()` **không** bỏ qua chuỗi rỗng → API **không khởi động được** khi `.env` có `R2_ACCOUNT_ID=` (đúng như `.env.example` ship sẵn). Thêm transform `blankToUndefined` + 2 test hồi quy.
- Bọc `S3Client.send` bằng generic làm hỏng overload của SDK (TS7006/TS18046) → gọi thẳng `requireClient().send(...)`.
- `presignedGetUrl` ném lỗi **đồng bộ** khi chưa cấu hình → đổi thành `async` để luôn trả promise bị reject.

**Lưu ý cho step sau**

- Step 12: `MediaDialog` và `uploadDataUrls` đã sẵn sàng; còn thiếu `applyDataUrls` (thay URL ngay trong editor Plate).
- Step 13: `R2Service.presignedGetUrl` + bucket private đã có nhưng **chưa chạy thử với file thật** (mới unit test); endpoint ghi âm chưa có.
- `sharp` là dependency native: kiểm image Docker bằng PR trước khi deploy.
- Xoá file media hiện không kiểm đề nào đang dùng — cân nhắc ở Step 12 khi đã có `exam_sections`.

### Step 9 – `packages/exam-core` (✅ 2026-09-16)

**Quyết định (người dùng chọn, đã cập nhật plan giả định 9 + Step 9)**
- Ordering/Polytomous xáo **theo từng lượt làm**: content_public lưu lúc Save đã xáo sẵn, phục vụ lượt làm thì xáo lại theo `order_seed`.
- Thứ tự hiển thị **luôn khác đáp án**: Ordering không trùng thứ tự đúng, Polytomous không để dòng điểm cao nhất ở vị trí soạn gốc (xoay vòng dãy thêm một vị trí).
- Câu trả lời bất thường: bỏ trùng / chỉ số không hợp lệ; Pick-n còn quá n lựa chọn thì sai cả n câu; MC 1 đáp án và Polytomous phải chọn đúng 1.

**Đã làm**
- `@lang/shared`: `QuestionType` (11 dạng), `ExamPartKind`.
- `@lang/exam-core` (phụ thuộc `@lang/shared`, không phụ thuộc platejs/React):
  - Chuyển từ LC, bỏ phần plugin/React: `indicator` (kiểu, meta màu/nhãn, `isIndicator`, `createIndicator`, thêm `isQuestionType`, `INDICATOR_KINDS`), `blank` (`isBlank`, `blanksIn`), `pair` (`isPair`, `pairOptions`, `fixedOptions`, `createPair`, thêm `pairAnswer`, `pairChoices` = option matching đời cũ gom từ đáp án như simulator LC), `list` (`ORDERING_STYLE`, `isTodo`, `isOrderingItem`), `scope`, `migrate` (`migrateExamValue`), `plan` (= `preview-plan.ts`: `buildPlan`, `numberingMode`, `segmentQtype`, `range`, thêm `pickCount`), `outline`, `media` (phần thuần của `embedded-media.ts`), `answer` (`normalizeAnswer`, `acceptedAnswers`).
  - `node.ts`: kiểu `ExamElement`/`ExamValue`, `plainText`, `isExamValue` (kiểm dữ liệu từ client/DB, giới hạn lồng 32 mức). `id.ts`: `createNodeId` (thay `nanoid` của platejs; không dùng `crypto.randomUUID` vì VPS chạy HTTP).
  - `extractStructure(value)` / `structureFromPlan(plan)` → `parts` (`nodeId`, `kind`, `parentNodeId`, `sortOrder`, `firstNumber`/`lastNumber`) + `questions` (`number`, `nodeId`, `subIndex`, `qtype`, `grading`, `partNodeId` = subpart/part gần nhất, `answerKey` theo bảng plan, `options` cho cặp ghép, `params`, `maxScore` 1/10). Kiểu `GradableQuestion` phân biệt theo `qtype`.
  - `stripAnswers(value, seed)` + `shuffleOrdering(content, seed, questions)` (seed Mulberry32, xáo trong từng dãy dòng liền nhau như simulator hiển thị).
  - `gradeResponses(questions, responses)`; `gradeExam(plan, responses)` gọi lại hàm này. `Responses`/`GradeResult` giữ định dạng LC.
  - `validateExam` (lỗi soạn thảo của LC), `validateSectionShape` (chặn Save), `validateSection` + `hasErrors` (publish). `Issue` thêm `severity`, `indicatorId` có thể `null`.
- Test (49): fixture `exam-editor-sample.json`, `exam-draft-2.json` chép từ LC; bản chép `gradeExam` gốc của LC ở `src/testing/lc-grading.ts` để đối chiếu; `simulateResponses` sinh câu trả lời như simulator LC.
- Tài liệu: plan (giả định 9, cập nhật Step 9), CLAUDE.md (mục exam-core).

**Sai khác so với plan / LC**
- `QuestionType` nằm ở `@lang/shared` theo quy ước enum (plan không nói).
- Thêm `shuffleOrdering`, `validateSectionShape`, `hasErrors`, `structureFromPlan`, `pickCount`, `pairChoices`; không chuyển `exam-draft.ts` (localStorage, để Step 12 ở lang-app), `uploadDataUrls`/`applyDataUrls` (cần fetch/editor).
- Khác LC có chủ đích (chỉ với dữ liệu lỗi hoặc câu trả lời không do UI tạo): MC chưa tick đáp án / Ordering không có dòng thì không bao giờ đúng (LC chấm đúng khi bỏ trống); Pick-n `maxPicks` lớn hơn số lựa chọn bị chặn bằng số lựa chọn; dạng câu hỏi lạ không được đánh số; `normalizeAnswer` dùng `toLowerCase` thay `toLocaleLowerCase` để client/server luôn giống nhau.
- Kiểm tra chặt hơn LC: tham số `seconds`/`maxChars`/`maxPicks` phải là số nguyên dương, `maxPicks` không vượt số lựa chọn, đáp án TFNG/YNNG ngoài bộ cố định cũng báo lỗi.
- Câu hỏi đứng trước part đầu tiên: không tạo dòng `exam_parts` cho part ngầm, `partNodeId = null`.
- content_public: indicator pick-n được ghi `maxPicks` = số câu, matching đời cũ được ghi `options` (sau khi bỏ `checked` thì không còn đếm lại được); dòng ordering có `key`; thuộc tính `key` cũ trong raw bị bỏ.
- Fixture `exam-draft-2.json`: ảnh base64 ~500KB rút gọn thành data URI ngắn; `src/__fixtures__` thêm vào `.prettierignore`.

**Kiểm tra đã chạy**
- `pnpm build`, `lint`, `typecheck`, `test` (165: 49 exam-core + 32 shared + 84 api), `format:check` → OK.
- Đối chiếu với `gradeExam` gốc của LC trên cả 2 fixture: câu trả lời trống, đúng hết và 300 bộ ngẫu nhiên mỗi đề → `gradeExam`, `gradeResponses` (câu hỏi qua JSON như jsonb) và `gradeResponses` với câu trả lời qua JSON đều khớp.
- content_public 2 fixture: không còn `checked`/`answer`/`num`, blank rỗng và đủ số lượng, đánh số + cấu trúc câu hỏi giống bản gốc, không sửa đầu vào; 300 seed: Ordering không lần nào trùng đáp án (> 15 thứ tự khác nhau), Polytomous không để dòng điểm cao nhất ở vị trí đầu; câu 2 dòng luôn ngược; `shuffleOrdering(stripAnswers(v, 1), 2)` = `stripAnswers(v, 2)`.
- Kiểm tra ngược: tắt bước xoay vòng trong `shuffleOrdering` → 2 test fail, đã khôi phục.
- Chạy thử bản build bằng Node (script scratchpad): `require` `dist/index.cjs` và `import` `dist/index.js` (resolve `@lang/shared` thật) → `extractStructure` 17 câu / 6 part, `stripAnswers` + `shuffleOrdering` không lộ đáp án, `gradeResponses` chạy được. Next đã có `transpilePackages: ['@lang/exam-core']`; chưa app nào import (Step 12–13).

**Lưu ý cho các step sau**
- Step 12: lang-api/lang-app thêm dependency `@lang/exam-core: workspace:*`. Editor dùng `migrateExamValue` khi mở, `validateExam` cho bảng kiểm tra (`indicatorId` giờ có thể `null`), `buildOutline` cho minimap. Save: `validateSectionShape` → 400; `extractStructure` → `exam_parts` (`parent_part_id` tra theo `parentNodeId`) / `exam_questions` (`part_id` theo `partNodeId`); `content_public = stripAnswers(raw, randomInt)`; `question_count = questions.length`. Publish: `hasErrors(validateSection(raw))` → 422 kèm issue. CHECK `qtype` dùng `sqlInList(Object.values(QuestionType))`.
- Step 13: renderer đọc content_public bằng `buildPlan` (số câu khớp server); Ordering/Polytomous gửi `key` thay cho vị trí hiển thị (`row.index` của LC); lựa chọn cặp ghép từ `pairOptions`/`pairChoices` của indicator. Phục vụ section: `shuffleOrdering(content_public, order_seed, questions)`; chấm: dựng `GradableQuestion` từ `exam_questions` (`number`, `node_id`, `qtype`, `answer_key`) rồi `gradeResponses`; `exam_attempt_answers.is_correct` lấy từ `verdicts`.
- Preview dashboard (Step 12) chấm bằng `gradeExam` trên raw → cùng kết quả server trừ các trường hợp dữ liệu lỗi (đề lỗi không publish được).

### Step 8 – Khu vực chính & dashboard tenant cơ bản (✅ 2026-09-16)

**Quyết định (người dùng giao tự quyết phần giao diện; đã ghi vào plan Step 8)**
- Landing theo `LC/design/Home.html` (hero + thẻ minh hoạ đề, tính năng, gói dịch vụ thật, footer tối), bỏ số liệu marketing của mockup.
- Trang đích sau đăng nhập tính mọi tenant user là thành viên (kể cả chưa hoạt động).
- Lý do tạm khoá chỉ chủ trung tâm thấy; thành viên tenant chưa hoạt động thấy thông báo trạng thái ở `/t/{slug}` và dashboard.
- Teacher: tổng quan rút gọn (học viên, đề theo trạng thái, lượt làm, bài chờ chấm).

**Đã làm**
- `@lang/shared`: `DEACTIVATION_SUGGESTION_ROLES`; kiểu `TenantMembershipInfo`, `MemberQuota`, `DeactivationSuggestions`, `TenantDashboardStats`; `MembershipListItem.lastActiveAt`, `OwnedTenant.suspensionReason`.
- lang-api:
  - Migration `1789491719211-AddMembershipLastActiveAt` (cột `memberships.last_active_at`); `TenantGuard` ghi cột này tối đa 1 lần/giờ khi tenant active và là thành viên (trước bước kiểm role).
  - `GET t/:slug/me` (mọi thành viên): tenant công khai + roles; trang `/t/{slug}` gọi để ghi lần vào tenant.
  - `GET t/:slug/memberships/deactivation-suggestions` (Owner/Admin): quota (`planName`, `maxMembers`, `activeMembers`, `excess`) + tối đa `excess` membership chỉ có role Học viên/Phụ huynh, chưa từng vào trước rồi tới lần vào cũ nhất, rồi ngày tham gia. Khai báo trước `:id`.
  - `GET t/:slug/dashboard/stats` (`TenantDashboardModule`, Owner/Admin/Teacher): số học viên, đề theo trạng thái / lượt làm / bài chờ chấm (tạm 0), `management` (giáo viên, phụ huynh, quota) chỉ cho Owner/Admin.
  - `assertPlanHasRoom` tách `loadQuota` dùng chung với `getQuota`.
  - Spec mới: guard ghi lần vào (1), gợi ý ngừng kích hoạt (3).
- lang-app:
  - `AuthProvider`: `tenantContexts`, `contextsReady`, `reloadContexts`; switcher gồm mọi tenant active (dashboard hoặc `/t/{slug}` tuỳ role) + lối về `/me`. `destinationAfterLogin(user, tenants, next)` theo plan 6.1; `useRedirectAfterLogin` cho login/register/đổi mật khẩu bắt buộc.
  - Layout `(site)`: header dính mờ nền + link Tính năng/Gói dịch vụ, `SiteFooter` tối; landing `/` + `PlanCards`.
  - `/me`: thẻ từng trung tâm (trạng thái, vai trò, gói nếu là chủ, gợi ý theo trạng thái, lý do từ chối/tạm khoá, nút Vào dashboard / Trang trung tâm / Sửa và gửi lại), nút Đăng ký trung tâm.
  - `/me/tenants/new` (`?plan=` chọn sẵn) và `/me/tenants/[id]/edit`: `TenantForm` (slug tự gợi ý từ tên tới khi người dùng sửa, kiểm `validateTenantSlug`, chọn gói dạng thẻ, < 18 tuổi khoá form).
  - `/t/{slug}`: `TenantHome` (khách / người ngoài / thành viên / tenant chưa hoạt động / không tồn tại).
  - Dashboard tenant: `TenantDashboardShell` + `useTenantDashboard()`; tổng quan theo role + banner vượt gói; trang Thành viên (lọc, badge `< 18 tuổi`, lần vào gần nhất, quota, khoá nút thêm khi đầy, banner + modal gợi ý ngừng kích hoạt, dialog thêm theo email / tạo tài khoản / chi tiết: sửa vai trò, gắn/gỡ phụ huynh, học viên được giám hộ; ngừng kích hoạt / kích hoạt lại / xoá có xác nhận).
  - Dùng chung: `components/tenant/*` (`TenantNotice`, `TenantAvatar`, `OverLimitBanner`, `tenant-status` chuyển từ admin), `SectionCard` (AccountSettings dùng lại), `Brand inverted`.
  - Xử lý lưu ý Step 7: `Modal` chỉ modal trên cùng nhận Esc; header dashboard ẩn tên/email trên mobile.
- Tài liệu: plan (quyết định Step 8), CLAUDE.md (contexts, dashboard tenant, prefetch, Modal, quota/last_active_at), README (trung tâm, trang đích).

**Sai khác so với plan**
- API ngoài plan 6.2: `GET t/:slug/me`. `deactivation-suggestions` trả kèm quota để trang Thành viên dùng luôn.
- Gợi ý ngừng kích hoạt lọc/sắp xếp trong service (đọc mọi membership active của tenant, ≤ giới hạn gói lớn nhất) thay cho một câu SQL, để unit test bằng repository giả.
- Sửa role dạng checkbox trong dialog chi tiết, không sửa trực tiếp trên bảng.
- `TenantGuard` ghi `last_active_at` bằng `update()` nên `memberships.updated_at` cũng đổi theo.

**Kiểm tra đã chạy**
- `pnpm build`, `lint`, `typecheck`, `test` (116: 32 shared + 84 api), `format:check` → OK (chạy lại lint/typecheck/format sau lần sửa prefetch).
- `pnpm --filter lang-api migrate` trên DB dùng chung → chạy `AddMembershipLastActiveAt`; `migration:generate` lại → "No changes".
- Bản build (api `:3101`, `next start :3100`), script Node gọi qua rewrite `/api`, **45/45 đạt**: < 18 tuổi 403; gợi ý slug bỏ dấu; tenant pending: `t/:slug/me` 403 "chờ duyệt", không ghi `last_active_at`, không có trang công khai; public tenant không phân biệt hoa thường, không lộ trạng thái/gói; vào tenant ghi `last_active_at`, gọi lại trong giờ không ghi; tài khoản System Admin + Owner A + Học viên B có đủ contexts; Học viên gọi stats/gợi ý 403, người ngoài 403, khách 401; stats Owner đủ số, Teacher `management = null`, Teacher quản lý thành viên 403, Student stats 403; `lastActiveAt` trong danh sách; gắn phụ huynh; hạ gói 3 thành viên khi có 5 → gợi ý đúng [học viên chưa từng vào, phụ huynh vào lâu nhất] (không có Owner/Teacher), stats báo vượt, thêm 409; ngừng kích hoạt → còn vượt 1, kích hoạt lại 409; từ chối → lý do ở `tenants/mine`, gửi lại → pending; tạm khoá → chủ thấy lý do, `me/contexts` không lộ, thành viên 403 "tạm khoá"; mở khoá.
- Chrome headless (puppeteer-core), **46/46 đạt**: landing (hero, gói thật, 390px không tràn); `/t/{slug}` khách và slug không tồn tại; khách mở đăng ký trung tâm → `/login?next=`; tài khoản 3 ngữ cảnh đăng nhập → `/me`, vào dashboard A, switcher qua tenant B (trang trung tâm), `/admin` ↔ dashboard A; Học viên vào dashboard B bị chặn; trang Thành viên (badge < 18, `4 / 3`, nút thêm bị khoá, cột lần vào, modal gợi ý, Esc chỉ đóng dialog xác nhận, chi tiết có phụ huynh), `/me` và trang Thành viên 390px không tràn; Owner B tạo tài khoản qua dialog → mật khẩu tạm; đăng nhập bằng mật khẩu tạm → `/me/account` → đổi xong vào `/t/{slug}` B; Teacher → dashboard rút gọn không có menu Thành viên; Học viên 1 ngữ cảnh → `/t/{slug}`; đăng ký tài khoản → `/me` trống → form (slug tự gợi ý, slug sai báo lỗi) → chờ duyệt → bị từ chối hiện lý do → sửa & gửi lại → chờ duyệt; < 18 tuổi form bị khoá; tenant tạm khoá: thành viên thấy thông báo, `/me` không lộ lý do, chủ thấy lý do; không có lỗi console ngoài 401/403/404/409 mong đợi.
- Lần chạy trình duyệt đầu **thất bại**: đăng nhập xong bị đẩy về `/login?next=/me`. Nguyên nhân: footer/landing mới có link `/me`, `/me/tenants/new`; Next prefetch lúc chưa đăng nhập nhận redirect của middleware và router cache giữ lại. Sửa bằng `prefetch={false}` cho các link đó, build lại, chạy lại toàn bộ E2E như trên.
- Đã xem ảnh chụp: landing (desktop/mobile), `/me`, `/me` bị từ chối, form đăng ký, trang trung tâm của thành viên, tổng quan Owner, trang Thành viên (desktop/mobile), dialog chi tiết, trang bị chặn.
- Dữ liệu test (`step8-test-…`, gói `step8-test-mini`) đã xoá hết; DB còn 1 user, 0 tenant, 3 gói. Log API không có lỗi; app chỉ có DEP0060 và cảnh báo `next start` với `output: standalone` đã biết.

**Lưu ý cho các step sau**
- Step 12–14: thay số 0 tạm trong `TenantDashboardService` (đề theo trạng thái, lượt làm, bài chờ chấm); gắn `href` cho thẻ đề khi có trang. Step 13: khu "Đề thi" trên `/t/{slug}` (`TenantHome`, nhánh thành viên).
- Step 10: logo tenant – `TenantAvatar` đang chỉ hiện chữ cái đầu.
- Menu dashboard tenant vẫn có link tới trang chưa làm (`exam-categories`, `exam-blueprints`, `exams`, `grading`) → prefetch 404 như Step 7.
- Link tới route cần đăng nhập ở chỗ khách nhìn thấy: `prefetch={false}` (đã ghi CLAUDE.md).
- `last_active_at` chỉ ghi qua route có `TenantGuard`; trang học viên mới ở khu vực chính nên gọi API dưới `/t/:slug/*` để được tính là đã vào.
- Chưa có unit test cho `TenantDashboardService` (QueryBuilder), chỉ E2E.

### Step 7 – Dashboard hệ thống `/admin` (✅ 2026-09-15)

**Quyết định (người dùng chọn, đã cập nhật plan mục 1, 6.2, Step 7, Step 8)**
- Hạ gói: System Admin đổi, có hiệu lực ngay, không deactivate ai; tenant vượt giới hạn chỉ bị chặn thêm/mở lại thành viên. Cảnh báo và gợi ý deactivate Học viên/Phụ huynh lâu không vào tenant thuộc Step 8.
- Tạo user / reset mật khẩu như create-account (admin nhập hoặc hệ thống sinh, hiển thị một lần, luôn bắt đổi mật khẩu).
- Không xoá user trong req-1, chỉ khoá/mở khoá.
- Tenant: duyệt / từ chối (bắt buộc lý do) chỉ từ `pending`; tạm khoá (bắt buộc lý do) chỉ từ `active`; mở khoá `suspended → active`.
- Gói: `code` cố định sau khi tạo; xoá cứng chỉ khi chưa tenant nào dùng.

**Đã làm**
- `@lang/shared`: `admin.ts` (`canManageUser`, `SERVICE_PLAN_CODE_*`, kiểu `AdminStats`, `AdminUser`, `AdminUserPasswordResult`, `AdminTenant`, `AdminServicePlan`); `Paginated<T>` chuyển vào shared (API re-export).
- lang-api:
  - Migration `1789490128190-AddTenantSuspensionReason` (cột `tenants.suspension_reason`).
  - `AdminModule`, controller gắn `@SystemRoles(...SYSTEM_MANAGER_ROLES)`:
    - `GET admin/stats`: user (tổng, mới 7 ngày, bị khoá), tenant theo trạng thái.
    - `admin/users`: list (`q`, `systemRole`, `status`, phân trang), `GET :id`, `POST` (luôn Registered User, mật khẩu tạm), `PATCH :id`, `POST :id/lock|unlock` (khoá thì thu hồi refresh token), `POST :id/reset-password` (tăng `token_version`, thu hồi refresh token, bắt đổi mật khẩu), `PATCH :id/system-role` (chỉ Owner; khoá các dòng Owner trong transaction, luôn còn ≥ 1 Owner active).
    - Quyền trên tài khoản dùng `canManageUser`: System Admin chỉ thao tác Registered User. Không tự khoá (403), không tự reset mật khẩu (400); kiểm "chính mình" trước để có thông báo đúng.
    - `admin/tenants`: list (`status`, `q` theo tên/slug/tên hoặc email chủ trung tâm, phân trang) và chi tiết (gói, owner, số membership active, người xử lý gần nhất); `POST :id/approve|reject|suspend|unsuspend` (update có điều kiện trạng thái cũ, ghi `reviewed_by/at`); `PATCH :id/plan` (chỉ gói đang áp dụng, hiệu lực ngay).
    - `admin/plans`: list kèm `tenantCount`, `POST`, `PATCH` (không nhận `code`), `DELETE` (409 khi có tenant dùng kể cả tenant đã xoá mềm; bắt lỗi khoá ngoại khi có race).
  - `common/validators/fields.ts`: `composeDecorators`, `isPresent`, `EmailField`, `FullNameField`, `GenderField`, `PhoneField`, `AddressField`, `ReasonField` (DTO thành viên chuyển sang dùng); `isForeignKeyViolation`; `InMemoryRepository.count`.
  - Spec mới: `admin-users.service` (7), `admin-tenants.service` (5, gồm "duyệt xong thì Owner qua `TenantGuard`"), `admin-plans.service` (3).
- lang-app:
  - `/admin`: 6 thẻ thống kê; thẻ bấm được mở danh sách đã lọc (`StatCard` thêm `href`).
  - `/admin/users`: tìm kiếm, lọc vai trò/trạng thái, phân trang; modal tạo/sửa, reset mật khẩu, đổi vai trò (chỉ Owner thấy nút), xác nhận khoá/mở khoá. Ẩn thao tác trên tài khoản không quản lý được, ẩn khoá/reset trên chính mình.
  - `/admin/tenants`: tab theo trạng thái kèm số lượng (giữ trên URL `?status=`, mặc định "Chờ duyệt"), tìm kiếm, cột thành viên `x / giới hạn` + badge "Vượt giới hạn"; dialog chi tiết có Duyệt / Từ chối (lý do) / Tạm khoá (lý do) / Mở khoá / Đổi gói (cảnh báo khi gói mới nhỏ hơn số thành viên).
  - `/admin/plans`: bảng + modal tạo/sửa; nút xoá bị vô hiệu khi đã có trung tâm dùng.
  - Dùng chung: `Badge`, `DataTable` (lưới theo OxfordTable của LC, mobile xếp dọc kèm nhãn cột), `SearchInput`, `SelectFilter`, `TemporaryPasswordDialog`; class `compactPrimaryButtonClass`/`compactDangerButtonClass`/`secondaryButtonClass`/`iconButtonClass`; `lib/format.ts`, `lib/error-message.ts` (AccountSettings dùng lại), `lib/use-debounced-value.ts`; chuỗi `vi.admin`, `vi.systemRoles`, `vi.userStatus`, `vi.tenantStatus`.
- Tài liệu: plan (quyết định Step 7), CLAUDE.md (quy ước admin, decorator trường, component danh sách), README (mục quản trị hệ thống).

**Sai khác so với plan**
- Không có xoá user (plan ghi "users CRUD"); thêm `unlock`, `unsuspend` và cột `suspension_reason`.
- `reviewed_by/at` là người xử lý gần nhất (cả tạm khoá/mở khoá), không chỉ lần duyệt.
- Page client đọc query bằng prop `searchParams` thay cho `useSearchParams` (khỏi bọc Suspense).

**Kiểm tra đã chạy**
- `pnpm build`, `lint`, `typecheck`, `test` (112: 32 shared + 80 api), `format:check` → OK.
- `pnpm --filter lang-api migrate` trên DB dùng chung → chạy `AddTenantSuspensionReason`; `migration:generate` lại → "No changes".
- Bản build (api `:3101`, `next start :3100`), script Node gọi qua rewrite `/api` + Chrome headless, **78/78 đạt**:
  - chưa đăng nhập 401; Registered User vào `/admin/*` 403; thống kê đúng cấu trúc;
  - user: tìm/lọc/phân trang, không lộ `passwordHash`; tạo user (mật khẩu tạm, đăng nhập bị bắt đổi; nhập tay không trả lại; trùng email 409; gửi `systemRole` 400);
  - System Admin sửa/khoá/reset System Owner và System Admin khác → 403, đổi vai trò → 403, DB không đổi;
  - khoá user: access token cũ 401, refresh cookie 401, đăng nhập 403; mở khoá đăng nhập lại được nhưng refresh cookie cũ vẫn 401; reset mật khẩu: token cũ 401, mật khẩu cũ 401, mật khẩu tạm 200;
  - System Owner sửa/khoá System Admin; nâng user lên System Admin có hiệu lực ngay với access token đang có, hạ lại mất quyền ngay;
  - gói: tạo (code thành chữ thường, giá 2 chữ số), trùng 409, sai định dạng 400, sửa code 400, gói ngừng áp dụng không có ở `public/plans`, xoá gói đang dùng 409 / chưa dùng 204;
  - tenant: trước duyệt Owner vào `/t/:slug/memberships` 403, **duyệt xong 200**; duyệt lại/từ chối tenant active 409; tạm khoá thiếu lý do 400, tạm khoá chặn Owner 403 "tạm khoá", mở khoá; hạ gói xuống gói 1 thành viên khi đang có 2 → 200, không ai bị deactivate, thêm thành viên 409; từ chối (lý do hiện ở `tenants/mine`), tenant bị từ chối không duyệt/khoá được, gửi lại → pending;
  - trình duyệt (System Admin): thẻ thống kê có số; bảng user chỉ có nút sửa ở Registered User, không có nút đổi vai trò; tạo user qua modal hiện mật khẩu tạm; 390px không tràn ngang; duyệt trung tâm qua dialog; trang gói; không có lỗi console ngoài 404 đã biết.
- Chạy lại E2E Step 6 sau khi đổi DTO thành viên: 67/67.
- Đã xem ảnh chụp: tổng quan, người dùng, dialog mật khẩu tạm, người dùng trên mobile, chi tiết trung tâm, gói dịch vụ.
- Dữ liệu test (`step7-test-…`) đã xoá hết; DB vẫn 1 System Owner thật. Log API không lỗi; app chỉ có DEP0060 đã biết.

**Lưu ý cho các step sau**
- "Không hạ quyền System Owner hoạt động cuối cùng" chỉ có unit test: DB dùng chung có Owner thật nên E2E không tạo được tình huống này.
- Menu dashboard có link tới trang chưa làm (`/admin/exam-*`, `/t/:slug/dashboard/*`): request prefetch 404 treo, trang không bao giờ `networkidle0` → puppeteer chờ `domcontentloaded` + nội dung cụ thể.
- Step 8:
  - trang thành viên dùng lại `DataTable`, `SearchInput`, `SelectFilter`, `Badge`, `Pagination`, `TemporaryPasswordDialog`;
  - banner vượt giới hạn làm giống `TenantDetailModal`/`ChangePlanModal` (`vi.admin.tenants.overLimitWarning`);
  - `/me` hiển thị `suspensionReason`? `MeContexts` hiện chỉ có `rejectionReason` → bổ sung nếu người dùng muốn.
- Owner tự hạ vai trò của mình: `AuthProvider` giữ `user` cũ tới khi tải lại trang (API đã chặn đúng).
- `Modal` nghe phím Esc riêng từng cái: Esc trong dialog con (xác nhận, đổi gói) đóng luôn dialog chi tiết tenant.
- Header dashboard trên mobile: tiêu đề trang xuống 2 dòng vì khối tên/email bên phải (có từ Step 5) – cân nhắc ẩn email trên mobile.

### Step 6 – Tenant, gói dịch vụ, membership (✅ 2026-09-15)

**Quyết định (người dùng chọn, đã cập nhật plan Step 6)**
- Slug: 3–40 ký tự `a-z`, `0-9`, gạch nối đơn ở giữa; chặn từ dành riêng; gợi ý từ tên (bỏ dấu, trùng thêm `-2`, `-3`…); không gửi slug thì dùng gợi ý; đổi được khi sửa & gửi lại.
- 3 gói seed trong migration.
- Mật khẩu tạm khi tạo account: admin nhập, hoặc để trống để hệ thống sinh 12 ký tự và trả về một lần.

**Đã làm**
- `@lang/shared`:
  - `tenant.ts`: `TENANT_SLUG_*`, `RESERVED_TENANT_SLUGS`, `validateTenantSlug`, `slugifyTenantName`;
  - kiểu `ServicePlanSummary`, `PublicTenant`, `OwnedTenant`, `MeContexts`, `MembershipListItem`, `MembershipDetail`, `GuardianLink`, `CreateMemberAccountResult`;
  - `ASSIGNABLE_TENANT_ROLES` (mọi role trừ Owner).
- lang-api – DB:
  - Entity `ServicePlan`, `Tenant`, `Membership`, `MembershipRole`, `StudentGuardian`.
  - Migration `1789486401727-CreateTenantsAndMemberships` (sinh bằng `migration:generate`, định dạng lại như Step 5) và `1789486401728-SeedServicePlans` (`ON CONFLICT (code) DO NOTHING`).
  - Ràng buộc: slug unique where `deleted_at is null` + CHECK định dạng; membership unique `(tenant_id, user_id)` where `deleted_at is null`; `tenants.plan_id`/`owner_user_id` FK RESTRICT.
  - `membership_roles` có thêm `tenant_id` + FK kép `(membership_id, tenant_id)` → `memberships(id, tenant_id)`, nhờ vậy có unique index "mỗi tenant một `TENANT_OWNER`". `student_guardians` dùng FK kép cho cả hai phía (DB bắt cùng tenant) + CHECK hai membership khác nhau.
- lang-api – API:
  - `GET public/plans` (gói `is_active`).
  - `POST tenants` (tuổi ≥ 18 theo `users.timezone`, gói active, slug), `GET tenants/mine`, `GET tenants/slug-suggestion?name=`, `PUT tenants/:id` (chỉ chủ tenant, chỉ khi `rejected`, update có điều kiện `status = rejected`, về `pending`, xoá lý do + người duyệt), `GET public/tenants/:slug` (chỉ `active`, không phân biệt hoa thường).
  - `TenantGuard` + `@TenantRoles()` + `@TenantCtx()`: tenant không tồn tại, hoặc chưa active mà user không là thành viên → 404; không là thành viên → 403; tenant `pending`/`rejected`/`suspended` → 403 kèm thông báo riêng; membership `inactive` coi như không là thành viên.
  - `/t/:slug/memberships` (Owner/Admin): list (lọc `role`, `status`, `q` ILIKE họ tên/email có escape, phân trang), `GET :id` (kèm phụ huynh `guardians` / con `wards`), `POST add-by-email`, `POST create-account`, `PATCH :id` (roles/status), `DELETE :id` (xoá mềm), `POST :id/guardians`, `DELETE :id/guardians/:parentMembershipId`.
  - `GET me/contexts`: system role + membership active (mọi trạng thái tenant, kèm lý do từ chối).
  - Giới hạn gói: trong transaction khoá dòng tenant (`pessimistic_write`), đếm membership active chưa xoá; áp cho add-by-email, create-account và mở lại membership `inactive`.
  - Bảo vệ Owner: không ai xoá/khoá được Owner; Tenant Admin không sửa được membership của Owner; Owner sửa role phụ của chính mình (luôn giữ `TENANT_OWNER`); DTO và service đều chặn cấp `TENANT_OWNER`. Bỏ role Học viên/Phụ huynh hoặc xoá membership thì gỡ liên kết phụ huynh tương ứng.
  - Create-account: hash mật khẩu trước transaction, user `must_change_password = true`; email đã có account → 409 gợi ý thêm theo email.
- lang-api – dùng chung & test:
  - Gom helper vào `common/`: `sqlInList`, `escapeLike`, `isUniqueViolation`, `ParseIdPipe` (id sai định dạng → 404), transform `trimToNull`/`emptyToUndefined`/`toEmail`, validator `NewPassword`. Thêm `generateTemporaryPassword` (bỏ ký tự dễ nhầm).
  - `InMemoryDataSource` (transaction không rollback); `InMemoryRepository` thêm `findOne`/`findBy`/`find`/`countBy`/`insert`/`softDelete`, `In`/`Like`, khoá chính kép; `fakeDate()`.
  - Spec mới: `tenants.service` (10), `tenant.guard` (5), `memberships.service` (13); shared `tenant.spec` (12).
- lang-app: `AuthProvider` gọi `GET /me/contexts` (bỏ qua khi còn phải đổi mật khẩu); switcher liệt kê tenant `active` có role vào dashboard, mô tả là tên role (`vi.tenantRoles`).
- Tài liệu: plan (quyết định Step 6), CLAUDE.md (TenantGuard, helper, test có transaction).

**Sai khác so với plan**
- `membership_roles.tenant_id` + FK kép thay cho "bảng phụ/trigger" để giữ đúng 1 Owner; `student_guardians` thêm `created_by`.
- Thêm API ngoài plan 6.2: `GET tenants/slug-suggestion`, `GET t/:slug/memberships/:id`.
- Frontend làm trước một phần (switcher dùng `me/contexts`). **`destinationAfterLogin` chưa đổi**: để Step 8 vì trang `/t/{slug}` và danh sách tenant trên `/me` chưa có. Switcher tạm chỉ hiện dashboard tenant.
- Membership của user bị khoá vẫn tính vào giới hạn gói (plan: mọi membership active).

**Kiểm tra đã chạy**
- `pnpm build`, `lint`, `typecheck`, `test` (97: 32 shared + 65 api), `format:check` → OK.
- `pnpm --filter lang-api migrate` trên DB dùng chung → chạy 2 migration; `migration:generate` lại → "No changes in database schema were found".
- Bản build (api `:3101`, `next start :3100`), script Node gọi qua rewrite `/api`, **67/67 đạt**:
  - gói công khai; đăng ký tenant: chưa đăng nhập 401, < 18 tuổi 403, slug dành riêng/ngắn/sai định dạng 400, slug trùng 409, slug in hoa được đổi thành chữ thường, email tenant chuẩn hoá;
  - tenant pending: public 404, Owner vào `/t/:slug/*` 403 "chờ duyệt", người ngoài 404; gửi lại khi pending 409, người khác 404, khi rejected → pending;
  - (duyệt giả lập bằng DB, gói tạm 3 thành viên) thêm theo email không phân biệt hoa thường, trùng 409, không có account 404, cấp Owner 400; tạo account sinh mật khẩu tạm, đầy gói 409 và không tạo user;
  - học viên đăng nhập bằng mật khẩu tạm → bắt đổi, `me/contexts` 403 tới khi đổi; Student gọi API quản lý 403;
  - Tenant Admin sửa/khoá/xoá Owner 403; membership inactive không tính giới hạn và biến mất khỏi `me/contexts`; mở lại khi đầy 409;
  - phụ huynh: gắn, trùng 409, sai role 400, chi tiết có `guardians`/`wards`, bỏ role Học viên gỡ liên kết; xoá rồi thêm lại tạo membership mới;
  - danh sách: phân trang, lọc role/status, tìm email, `%` được escape; uuid sai 404, field lạ 400;
  - DB từ chối Owner thứ hai (23505) và role khác tenant với membership (23503).
- Chrome headless (2/2): Owner và Tenant Admin đăng nhập với `?next=/t/{slug}/dashboard`, switcher hiện tên tenant + role.
- Dữ liệu test (`step6-test-…`) đã xoá hết (còn 0 user/tenant/gói). Log API không có lỗi; app chỉ có cảnh báo DEP0060 đã biết.

**Lưu ý cho các step sau**
- Route `/t/:slug/*` mới làm theo quy ước `TenantGuard` trong CLAUDE.md; mọi truy vấn lọc `ctx.tenantId`.
- Step 7:
  - duyệt/từ chối/khoá tenant: ghi `reviewed_by`/`reviewed_at`, update có điều kiện trạng thái (resubmit đang dùng `status = rejected`);
  - không xoá cứng gói đang có tenant dùng (FK RESTRICT), dùng `is_active`;
  - chi tiết tenant: số thành viên = membership active chưa xoá;
  - đổi gói không kiểm tra chỗ trống. `assertPlanHasRoom` (so `>=`) đã chặn thêm/mở lại thành viên khi tenant vượt giới hạn, không cần sửa.
- Step 8:
  - `destinationAfterLogin` theo `me/contexts` (plan mục 6.1);
  - `/me` dùng `me/contexts` + `tenants/mine`;
  - switcher thêm tenant không có role dashboard (→ `/t/{slug}`), `AuthProvider` cần hàm tải lại contexts sau khi đăng ký tenant;
  - layout dashboard tenant lấy roles thật từ contexts thay `[TENANT_OWNER]`;
  - form đăng ký dùng `slug-suggestion` + `validateTenantSlug`; dialog tạo account hiện `temporaryPassword` một lần;
  - vượt giới hạn gói: banner cảnh báo + `GET t/:slug/memberships/deactivation-suggestions` (cột `memberships.last_active_at` do `TenantGuard` cập nhật ≤ 1 lần/giờ; chỉ membership chỉ có role Học viên/Phụ huynh), xem plan Step 8.
- Tìm thành viên bằng ILIKE không bỏ dấu (không có `unaccent`): "hoc vien" không khớp "Học viên".
- `InMemoryDataSource` không rollback: test chỉ kiểm lỗi xảy ra trước khi ghi.

### Step 5 – Tài khoản & xác thực (✅ 2026-09-15)

**Quyết định (người dùng chọn, đã cập nhật plan mục 1, 4.1, Step 5)**
- Email: `varchar` luôn chữ thường + unique index `lower(email)` where `deleted_at is null`, không citext (Postgres VPS có citext trusted nhưng giữ quy tắc không tạo extension).
- Seed System Owner: người dùng tự điền `SEED_OWNER_*`, chạy `seed:owner` một lần từ máy dev, không chạy trong container.
- Giới tính `male` / `female` / `other`.
- Refresh token dùng lại trong 30 giây sau khi xoay vẫn được cấp token mới (nhiều tab), quá 30 giây thu hồi cả family.

**Đã làm**
- `@lang/shared`: `Gender`, `DEFAULT_LOCALE`/`DEFAULT_TIMEZONE`, `PASSWORD_MIN_LENGTH` (8) / `PASSWORD_MAX_LENGTH` (72, giới hạn bcrypt), `normalizeEmail`, `AuthUser`/`AuthResponse`, `isValidDateOfBirth` + `MIN_DATE_OF_BIRTH` (1900-01-01).
- lang-api:
  - Entity `User`, `RefreshToken`; migration `1789482175602-CreateUsersAndRefreshTokens` sinh bằng `migration:generate`, thêm tay unique index `UQ_users_email` (`@Index(..., { synchronize: false })` trên entity). Enum lưu varchar + CHECK; `refresh_tokens.user_id` FK cascade; index `token_hash` (unique), `user_id`, `family_id`.
  - `AuthModule`:
    - `POST /auth/register` (tự đăng nhập), `login`, `refresh`, `logout` (204), `GET /auth/me`, `POST /auth/change-password`.
    - Cookie `ls_rt`: httpOnly, SameSite=Lax, Path=/, Secure theo `COOKIE_SECURE`, Max-Age theo `REFRESH_EXPIRES_IN`; refresh lỗi 401 thì xoá cookie.
    - Refresh token 32 byte ngẫu nhiên, DB lưu sha256 + `family_id`, xoay mỗi lần refresh (gia hạn 30 ngày). Thu hồi token cũ bằng update có điều kiện `revoked_at IS NULL` để hai request xoay cùng lúc không ghi đè nhau. Ân hạn chỉ áp cho token bị thu hồi do xoay (`replaced_by_id` có giá trị) và family còn token hoạt động.
    - Login so bcrypt với hash giả khi email không tồn tại; tài khoản khoá → 403; dọn refresh token hết hạn của user.
    - Đổi mật khẩu: tăng `token_version`, bỏ `must_change_password`, thu hồi family khác, giữ phiên hiện tại, trả access token mới.
  - `JwtAuthGuard` (APP_GUARD): mặc định mọi route cần đăng nhập trừ `@Public()`; tải user mỗi request, so `status` + `token_version`; còn `must_change_password` → 403 trừ route `@AllowPendingPasswordChange()`. `SystemRolesGuard` + `@SystemRoles()`. `/api/health` gắn `@Public()`.
  - `UsersModule`: `PATCH /me/profile` (họ tên, ngày sinh, giới tính, SĐT, địa chỉ; chuỗi rỗng → null), `toAuthUser` (không trả `password_hash`).
  - Validator `@IsDateOfBirth()`; message validation tiếng Việt. `app.set('trust proxy', 'loopback')` để lấy IP client qua rewrite của Next.
  - Env mới (có mặc định): `JWT_ACCESS_EXPIRES_IN=15m`, `REFRESH_EXPIRES_IN=30d`, `COOKIE_SECURE=false` + `durationToSeconds`. Đã thêm vào `.env.example`, `deploy/.env.example`, `apps/lang-api/.env`, `deploy/.env`.
  - Script `seed:owner`: đọc `SEED_OWNER_*`, idempotent (Owner đã có → bỏ qua, không đổi mật khẩu), không nâng quyền tài khoản có sẵn, không in mật khẩu.
  - Test mới: `auth.service.spec` (13), `jwt-auth.guard.spec` (6), `system-roles.guard.spec` (3), `duration.spec` (2), env (+2); repository giả `src/testing/in-memory-repository.ts` (loại khỏi `tsconfig.build.json`).
- lang-app:
  - `AuthProvider` trong root layout: server truyền `hasSession` (có cookie `ls_rt`) để khỏi gọi refresh khi chắc chắn chưa đăng nhập; tải trang gọi `/auth/refresh` (nay trả cả `user`); `login`, `register`, `logout` (tải lại `/login`), `applySession`, `setUser`; `contexts` hiện chỉ có thẻ "Quản trị hệ thống" cho Owner/Admin.
  - `RequireAuth`: chưa đăng nhập → `/login?next=`; còn `must_change_password` → `/me/account`; `/admin` chỉ Owner/Admin, người khác → `/me`. `AuthedDashboardShell` cho `/admin` và dashboard tenant (roles tenant vẫn tạm); `(exam)` bọc `RequireAuth`.
  - Trang `/login`, `/register` theo design/Auth.html (tab chuyển trang, giữ `?next=`, bỏ OAuth/"ghi nhớ"/cột giới thiệu; đăng ký có thanh độ mạnh mật khẩu). `/me` tạm (thẻ quản trị hệ thống + tài khoản, "chưa là thành viên trung tâm nào"). `/me/account`: hồ sơ + đổi mật khẩu; đang bị bắt đổi mật khẩu thì chỉ hiện form đổi.
  - Header khu vực chính đổi theo trạng thái đăng nhập (`SiteHeaderNav`); `Brand` ẩn chữ trên mobile, không xuống dòng.
  - Dùng chung: `components/ui/form-styles.ts`, `PasswordInput`, `FormAlert`; `lib/auth-redirect.ts` (`safeNextPath` chặn open redirect, `destinationAfterLogin`), `lib/password-strength.ts`, `lib/initials.ts`.
- Tài liệu: README (mục Tài khoản, bỏ mẹo cookie), CLAUDE.md (quy ước migration/email/guard/test, AuthProvider/RequireAuth/form), `docs/setup/deploy.md` (env mới, không đặt `SEED_OWNER_*` trên VPS).

**Sai khác so với plan (đã cập nhật plan)**
- Các quyết định người dùng chọn ở trên (lower(email), seed, gender, ân hạn 30 giây).
- `bcryptjs` thay `bcrypt` native (khỏi build native trong image, không cần `allowBuilds`); `@nestjs/jwt` 11 (bản 12 vừa ra, không cần); guard tự viết bằng `@nestjs/jwt` thay passport `JwtStrategy`.
- Làm luôn `PATCH /me/profile` (plan mục 6.2) vì `/me/account` cần; `GET me/contexts` vẫn để Step 6.
- Chưa có giới hạn số lần đăng nhập sai (plan không yêu cầu) – cân nhắc ở Step 15.

**Kiểm tra đã chạy**
- `pnpm build`, `lint`, `typecheck`, `test` (57: 20 shared + 37 api), `format:check` → OK.
- `pnpm --filter lang-api migrate` trên database dùng chung → đã chạy migration; `migration:generate` lại → "No changes in database schema".
- Chạy bản build (api `:3101`, `next start :3100`), script Node gọi qua rewrite `/api` (31/31 đạt):
  - cookie đủ thuộc tính; email trùng khác hoa thường 409; ngày sinh tương lai, mật khẩu ngắn, field lạ (`systemRole`) → 400;
  - refresh xoay token; dùng lại cookie cũ trong 30 giây → 200; lùi `revoked_at` quá 30 giây rồi dùng lại → 401 và token mới nhất của family cũng 401;
  - đổi mật khẩu: access token cũ 401, token mới 200, phiên thiết bị khác 401 (cookie bị xoá), phiên hiện tại vẫn refresh, mật khẩu cũ không đăng nhập được;
  - **khoá user trong DB → request kế tiếp 401**, refresh 401, login 403; mở khoá không hồi sinh phiên đã thu hồi;
  - DB chỉ lưu sha256, có `ip`/`user_agent`.
- Chrome headless (puppeteer-core cài trong scratchpad, 14/14 đạt): middleware đưa `/admin` về `/login?next=%2Fadmin`; đăng ký → `/me`; **reload vẫn giữ phiên**; 2 tab tải cùng lúc đều giữ phiên; user thường vào `/admin` → `/me`; sửa hồ sơ, reload vẫn còn; đổi mật khẩu; đăng xuất rồi vào `/me` bị chặn; đăng nhập sai hiện lỗi, đúng thì theo `?next=`; System Admin thấy dashboard có tên + email; cờ `must_change_password` bắt đổi mật khẩu rồi vào `/admin`; khoá user → reload về `/login`; mobile 390px không tràn, header cao 68px.
- User test (`step5-test-…@example.com`) tạo trong DB đã xoá hết sau mỗi lần chạy (còn 0).
- Console chỉ có lỗi mong đợi: 401 khi sai mật khẩu/khoá user; 404 `favicon.ico`; 404 prefetch các mục menu `/admin/*` chưa có trang.

**Lưu ý cho các step sau**
- Guard toàn cục: route công khai mới (vd. `GET public/plans`, `public/tenants/:slug`) **phải** gắn `@Public()`.
- Step 6: `GET me/contexts` → thay `contexts` trong `AuthProvider` và bổ sung `destinationAfterLogin`; tạo account (F1-d) dùng `hashPassword` + `must_change_password = true` (guard và `RequireAuth` đã xử lý luồng bắt đổi mật khẩu).
- Step 7: khoá user có hiệu lực ngay nhờ guard kiểm `status`; reset mật khẩu nên tăng `token_version` + thu hồi refresh token. Link sidebar `/admin/*` còn 404 prefetch tới khi có trang.
- Step 8: `/me` đang là bản tạm; chưa có `favicon`.
- bcryptjs cost 12 mất khoảng 0,4 giây mỗi lần hash trên máy dev (bất đồng bộ, không chặn event loop).
- Root layout đọc cookie nên mọi route của lang-app là dynamic (ƒ).
- Script kiểm thử E2E nằm ở scratchpad phiên này (không commit); cần lâu dài thì đưa vào repo ở Step 15.

### Step 4 – Docker & deploy sớm (✅ 2026-09-15)

**Đã làm**
- `Dockerfile` 4 stage: `base` (node:24-bookworm-slim, corepack) → `prune` (`pnpm dlx turbo@2.10.12 prune lang-api lang-app --docker`) → `build` (`pnpm install --frozen-lockfile` với cache mount, `turbo run build` với `BACKEND_INTERNAL_URL=http://127.0.0.1:3002`, `NEXT_PUBLIC_API_URL=/api`, rồi `pnpm --filter lang-api deploy --prod --legacy /out/api`) → `runner` (`TZ=Asia/Ho_Chi_Minh`, `USER node`, `EXPOSE 3000`, HEALTHCHECK `fetch http://127.0.0.1:3000/api/health`, start-period 60s).
- `.dockerignore`; `docker/entrypoint.sh`: migrate (lỗi → thoát) → api `:3002` + app `:3000` (`HOSTNAME=0.0.0.0`), `wait -n` như LC.
- `deploy/docker-compose.yml`: image `ghcr.io/vunguyenquangit/lang-simulator:${IMAGE_TAG:-latest}`, container `lang-simulator-app`, `3001:3000`, network external `${DB_NETWORK}`, logging như LC.
- `deploy/.env.example` + `deploy/.env` trên máy dev (gitignored, chmod 600): `DB_HOST=postgres_db`, `DB_NETWORK=postgres-docker_default` (giống `/opt/lightc/.env`), mật khẩu `lang_simulator` như máy dev, `JWT_SECRET` mới riêng cho VPS.
- Lần deploy đầu (merge PR) lỗi `container is unhealthy`: log `Migration thất bại … getaddrinfo ENOTFOUND postgres-docker` – `DB_HOST` điền sai (đã hỏi người dùng nhưng đáp án là lựa chọn mình đưa ra, chưa kiểm trên VPS). Tên thật lấy từ `.env` của LC: container `postgres_db`. Bài học: giá trị hạ tầng VPS nên đối chiếu `/opt/lightc/.env` hoặc `docker ps` thay vì đưa lựa chọn đoán.
- `.github/workflows/deploy.yml`: PR → build không push; push `main`/chạy tay → build + push (`latest`, `sha-…`) → scp `deploy/docker-compose.yml` lên `/opt/lang-simulator` → ssh: kiểm có `.env`, login GHCR, `docker compose pull`, `up -d --wait`, `image prune`. Actions bản mới chạy node24: checkout@v7, setup-buildx@v4, login@v4, metadata@v6, build-push@v7, scp-action@v1.0.0, ssh-action@v1.2.5 (bỏ `script_stop` đã không còn, dùng `set -e`).
- `docs/setup/deploy.md` (chuẩn bị, deploy, kiểm tra, rollback, sự cố); README mục Deploy; CLAUDE.md mục Docker & deploy.

**Sai khác so với plan (đã cập nhật plan)**
- Workflow tự copy `docker-compose.yml` (người dùng chọn); `.env` VPS soạn sẵn ở `deploy/.env` (người dùng chọn).
- Không Docker local (người dùng chọn): giả lập bằng `turbo prune` + install/build/deploy trong scratchpad; thêm build image khi mở PR.
- `pnpm deploy` cần `--legacy`. Rollback bằng `IMAGE_TAG` trong `.env`.
- Network Postgres là `postgres-docker_default` (plan ghi `postgres_default`).

**Kiểm tra đã chạy**
- `turbo prune --docker` giữ nguyên `catalog`/`allowBuilds`; `pnpm install --frozen-lockfile` trên bản prune OK; build OK; rewrite trong `routes-manifest.json` trỏ `127.0.0.1:3002`; `pnpm deploy` ra `api` 119MB (có `@lang/shared`, resolve `@nestjs/core`, `pg` OK), `web` 52MB.
- Chạy như entrypoint trên layout giả lập (`NODE_ENV=production`, DB VPS qua IP): migrate OK; `/` 200; `/api/health` qua 3000 → 200 `{"status":"ok","database":"up"}`; `/admin` không cookie → 307 `/login?next=%2Fadmin`; CSS `/_next/static/…` 200; lệnh HEALTHCHECK exit 0; log không có lỗi.
- `bash -n docker/entrypoint.sh` OK; YAML workflow + compose parse OK.
- `pnpm build`, `lint`, `typecheck`, `test` (29), `format:check` → OK.
- Trên CI/VPS (PR #1 → merge `main`, 2026-09-15): image build + push GHCR OK (gồm `pnpm dlx turbo`, `COPY --chmod`, cache mount). Deploy lần 1 unhealthy do `DB_HOST` sai; sửa `/opt/lang-simulator/.env` + `docker compose up -d --force-recreate --wait` → healthy (entrypoint, `wait -n` chạy đúng).
- Từ ngoài: `:3001/` 200; `/api/health` 200 `{"status":"ok","database":"up"}`; `/admin` → 307 `/login?next=%2Fadmin`; `/api/xyz` 404; CSS tĩnh 200; LC `:3000/` vẫn 200.

**Lưu ý**
- Lỡ chạy `pnpm deploy --prod` từ repo đã ghi `"dev": false` vào `node_modules/.pnpm-workspace-state-v1.json` → `pnpm exec` đòi cài lại production. Khôi phục bằng `pnpm install --frozen-lockfile` (đã ghi vào CLAUDE.md).
- `deploy/.env` chứa secret thật: không commit, không đưa vào image (`.dockerignore` loại `deploy`, `**/.env`).

### Step 3 – Khung `lang-app` (✅ 2026-09-14)

**Đã làm**
- Next.js 14.2.35 + React 18.3 + Tailwind 3.4, `output: 'standalone'`, `experimental.outputFileTracingRoot` = root monorepo, `transpilePackages` cho `@lang/*`, rewrite `/api/:path*` → `BACKEND_INTERNAL_URL` (mặc định `http://127.0.0.1:3101`, cố định lúc build).
- Copy từ LC: theme `globals.css` (đổi `lc-*` → `ls-*`, bỏ `.md-prose`/highlight.js, giữ style `.exam-*` cho Step 12, thêm `--danger`), `tailwind.config.ts`, fonts (Roboto, Roboto Mono, Noto Sans, Noto Sans JP), `GlobalLoadingBar`, `ui/Modal`, `ConfirmDialog`, `PromptDialog`, `Pagination`, `TagMultiSelect` (id → `string`, placeholder tham số hoá).
- `src/lib/api.ts`: viết lại từ LC – gọi cùng origin `/api`, `credentials: 'include'`, access token **trong bộ nhớ**, 401 → gọi `/auth/refresh` một lần (gộp request đồng thời) rồi thử lại, `onAuthFailure()` cho AuthProvider, `ApiError(status)`, `upload`/`postForm`.
- `DashboardShell` (sidebar 260px, header 68px như LC) + `WorkspaceSwitcher`; menu cấu hình trong `src/config/navigation.ts` theo `NavScope` (`system` / `tenant` + roles, dùng nhóm quyền của `@lang/shared`), tiêu đề header lấy từ mục menu khớp dài nhất.
- `src/i18n/vi.ts` gom chuỗi UI; `Brand` "Lang Simulator"; `StatCard`; `ComingSoon`.
- Route group và trang tạm: `(site)` (`/`, `/login`, `/register`), `(dashboard)` (`/admin`, `/t/[slug]/dashboard`), `(exam)` (`/t/[slug]/attempts/[id]`).
- `src/middleware.ts`: không có cookie `ls_rt` (`REFRESH_TOKEN_COOKIE` trong `@lang/shared`) → redirect `/login?next=…` cho `/me`, `/admin`, `/t/:slug/dashboard`, `/t/:slug/attempts`.
- ESLint: base + `@next/eslint-plugin-next@14` (bọc `fixupPluginRules` của `@eslint/compat` vì ESLint 10 đã bỏ `context.getFilename`) + `react-hooks` (chỉ `rules-of-hooks`, `exhaustive-deps`).
- `next-env.d.ts` được commit (bỏ khỏi `.gitignore`) để `typecheck` chạy được trên checkout sạch.

**Sai khác so với plan**
- Không copy các component kiểu cũ indigo/gray của LC (`button`, `input`, `table`…) – đã ghi vào plan Step 3.
- `lucide-react` khai báo `^1.34.0` (resolve 1.45.0): pnpm 11 chặn bản 1.46.0 vì quá mới (`minimumReleaseAge`), không lách bằng exclude.
- Layout đang truyền `user={null}`, `workspaces={[]}`, tenant tạm dùng roles `[TENANT_OWNER]` – thay bằng dữ liệu thật ở Step 5–8.

**Kiểm tra đã chạy**
- `pnpm build` → Next build OK (7 route + middleware 26.7 kB).
- Standalone server `apps/lang-app/.next/standalone/apps/lang-app/server.js` (cách chạy trong Docker): `/` 200; `/admin`, `/t/demo/attempts/1` không cookie → 307 `/login?next=…`; có cookie → 200, menu hệ thống (Tổng quan, Người dùng, Gói dịch vụ…) và menu tenant (Thành viên, Đề thi, Chấm bài…) đúng; `/api/health` qua rewrite → 200.
- `pnpm dev` ở root: sẵn sàng ~4s, app :3100 và api :3101 chạy song song, các kiểm tra trên đều đạt; dừng xong không còn tiến trình giữ cổng.
- **Chưa kiểm tra bằng mắt** trên trình duyệt (chỉ kiểm tra HTML) – chờ người dùng.

### Step 2 – Khung `lang-api` (✅ 2026-09-14)

**Đã làm**
- NestJS 10.4 + TypeORM 0.3.31 + pg, `nest-cli.json` (`deleteOutDir`, `tsconfig.build.json`), tsconfig kế thừa `@lang/tsconfig/nestjs.json` (thêm `rootDir`/`outDir` ở app).
- `src/main.ts`: prefix `api`, JSON body 2mb, `cookie-parser`, `ValidationPipe` (whitelist, forbidNonWhitelisted, transform), `enableShutdownHooks`, **không bật CORS** (gọi cùng origin qua rewrite).
- `src/config/env.validation.ts`: class-validator, dừng khởi động khi thiếu/sai; biến: `NODE_ENV`, `PORT` (3101), `DB_HOST/PORT/USERNAME/PASSWORD/NAME`, `DB_SCHEMA` (chỉ `[a-z0-9_]`), `DB_LOGGING`, `JWT_SECRET` (≥ 32 ký tự, không fallback).
- `src/database/database.config.ts` (dùng chung app + CLI): `schema`, `synchronize: false`, `migrationsTableName: typeorm_migrations`, `uuidExtension: 'pgcrypto'` + `installExtensions: false` (dùng `gen_random_uuid()` sẵn có từ PG 13, không cần quyền tạo extension).
- `src/database/data-source.ts` (TypeORM CLI, đọc `.env` bằng `process.loadEnvFile`), `src/database/migrate.ts` (`CREATE SCHEMA IF NOT EXISTS` → `runMigrations`, transaction từng migration), thư mục `migrations/` rỗng.
- `AllExceptionsFilter` (`{ statusCode, message }`, lỗi 500 không lộ chi tiết), `PaginationQueryDto` + `Paginated<T>` + `toSkipTake`, `@CurrentUser()` + `RequestUser` (dùng `SystemRole` của `@lang/shared`).
- `GET /api/health`: `SELECT 1`, trả `{ status, database, latencyMs }`, lỗi DB → 503.
- Scripts: `dev`, `build`, `start`, `test`, `migrate` (ts-node), `migrate:prod` (dist), `migration:generate|create|revert`.
- Jest + ts-jest: 11 test (env validation, exception filter, health controller). Chuyển các assert thủ công của Step 1 thành Jest trong `@lang/shared` (18 test).
- `.env.example`; tạo `.env` local (gitignored) với `JWT_SECRET` ngẫu nhiên; tạo database local **`lang_simulator_dev`**.

**Sai khác so với plan**
- Dev dùng **Postgres local** (`lang_simulator_dev`) – người dùng chọn; đã ghi vào plan mục 1.
- Bỏ `incremental` khỏi preset `nestjs.json`: kết hợp `deleteOutDir` làm `dist` thiếu file (lỗi `Cannot find module` khi chạy). Preset cũng bỏ `outDir` (đường dẫn tương đối bị tính theo thư mục preset) và thêm `useDefineForClassFields: false` (an toàn cho TypeORM entity).
- `@CurrentUser` làm ở Step 2 nhưng `RequestUser` có thể đổi khi làm JwtStrategy (Step 5).
- `allowBuilds`: `unrs-resolver: true` (Jest), `@nestjs/core: false`, `@parcel/watcher: false`.

**Kiểm tra đã chạy**
- `pnpm build --force`, `lint`, `typecheck`, `test` (29 test), `format:check` → tất cả OK.
- `migrate` bằng ts-node và bằng `node dist/database/migrate.js` → tạo schema `lang_simulator` + bảng `typeorm_migrations` trên `lang_simulator_dev`; chạy lại báo "đã ở phiên bản mới nhất".
- `node dist/main.js` → `/api/health` 200 `{"status":"ok","database":"up"}`; route lạ → 404 `{"statusCode":404,"message":"Cannot GET …"}`; `JWT_SECRET` rỗng → thoát code 1 với thông báo "Cấu hình môi trường không hợp lệ: JWT_SECRET…"; dừng app không để lại kết nối DB.

**Lưu ý cho các step sau**
- **Step 4 (Docker):**
  - Build lang-app phải truyền `BACKEND_INTERNAL_URL=http://127.0.0.1:3002` (đã khai báo `env` trong `turbo.json`), `NEXT_PUBLIC_API_URL=/api`.
  - Standalone server nằm ở `apps/lang-app/.next/standalone/apps/lang-app/server.js`; cần copy thêm `apps/lang-app/.next/static` và `public/` (nếu có).
  - Entrypoint: `node apps/lang-api/dist/database/migrate.js` (thoát nếu lỗi) → api `PORT=3002` → app `PORT=3000`.
  - Healthcheck nên gọi `http://127.0.0.1:3000/api/health` (kiểm tra cả app, rewrite, api, DB).
  - Máy local **không có Docker** (người dùng chọn kiểm chứng qua CI): workflow nên build image cả khi mở PR, không chỉ khi push `main`.
  - Container trên VPS nối Postgres qua network `postgres_default` (như LC), `DB_HOST` là tên container Postgres, `DB_NAME=lang-simulator`, `DB_SCHEMA=public`.
  - DB dùng chung với máy dev: migration chạy từ máy dev sẽ đi trước code trên VPS → migration phải tương thích ngược.
- **Step 5:**
  - Bảng `users` cần email unique không phân biệt hoa thường: plan ghi `citext` nhưng cần quyền tạo extension trên VPS → cân nhắc unique index trên `lower(email)` (hỏi người dùng nếu chọn khác plan).
  - Nối `DashboardShell` với AuthProvider (`user`, `workspaces`, `onLogout`); thay trang tạm `/login`, `/register`.
- **Step 6/8:** roles thật cho menu tenant thay cho `[TENANT_OWNER]` tạm trong `(dashboard)/t/[slug]/dashboard/layout.tsx`.
- Local Postgres đã có sẵn database `lang_simulator` của **dự án khác** (bảng `organizations`, `courses`, `tests`…) – không dùng, không xoá.
- Cảnh báo deprecation khi `pnpm dev` (đã biết, không phải lỗi code dự án, chưa cần xử lý):
  - `DEP0190` từ `nest start --watch` (Nest CLI spawn với `shell: true`; nạp module app trực tiếp không phát sinh);
  - `DEP0060 util._extend` từ proxy rewrite `/api` của Next 14.

### Step 1 – Khởi tạo monorepo (✅ 2026-09-13)

**Đã làm**
- `git init -b main`, `.gitignore`, `.editorconfig`, `.nvmrc` (24), `.prettierrc.json`, `.prettierignore` (bỏ qua `docs/`).
- `pnpm-workspace.yaml`: `apps/*`, `packages/*`, `catalog` phiên bản dùng chung, `allowBuilds`.
- `turbo.json`: tasks `build` (`^build`, outputs `dist`/`.next`), `dev` (persistent), `lint`, `typecheck` (`^build`), `test`, `clean`.
- Root `package.json`: `packageManager: pnpm@11.2.2`, scripts `dev/build/lint/typecheck/test/format/format:check/clean`.
- `packages/tsconfig`: `base.json`, `library.json` (Bundler, noEmit), `nestjs.json`, `nextjs.json`.
- `packages/eslint-config`: `base.js` (flat: `@eslint/js` recommended + `typescript-eslint` recommended + prettier, globals node, no-unused-vars cho phép tiền tố `_`).
- `packages/shared` (`@lang/shared`, tsup ESM + CJS + d.ts): `roles.ts`, `status.ts`, `exam.ts`, `age.ts` (+ `auth.ts` thêm ở Step 3).
- `packages/exam-core` (`@lang/exam-core`): khung rỗng.
- `README.md`, `CLAUDE.md`, file tiến độ này.

**Sai khác so với plan (đã cập nhật vào plan)**
- **Node 24 + pnpm 11** thay cho Node 20 (người dùng chọn): Node 20 EOL 4/2026, pnpm 11 cần Node ≥ 22.13.
- **ESLint 10** thay cho 9: ESLint 9.39 đã bị đánh dấu hết hỗ trợ.
- **TypeScript 5.9.3** (không lên 7.x): `typescript-eslint` chỉ hỗ trợ TS < 6.1.
