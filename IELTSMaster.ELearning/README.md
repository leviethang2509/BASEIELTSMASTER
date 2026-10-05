# Lang Simulator

Nền tảng multi-tenant quản lý trung tâm ngoại ngữ: tài khoản & phân quyền, tenant/membership, soạn đề thi (Plate.js), giả lập thi và chấm điểm.

- Yêu cầu: [docs/requirements/req-1.md](docs/requirements/req-1.md)
- Kế hoạch: [docs/requirements/req-1-plan.md](docs/requirements/req-1-plan.md)
- Tiến độ: [docs/requirements/req-1-progress.md](docs/requirements/req-1-progress.md)

## Yêu cầu môi trường

- Node **24** (`nvm use`, xem `.nvmrc`)
- pnpm **11** (`corepack enable` hoặc `npm i -g pnpm@11`)
- Truy cập database `lang-simulator` trên Postgres của VPS (≥ 13, dùng `gen_random_uuid()` có sẵn). Máy dev và bản chạy trên VPS dùng chung database này.

## Chạy local lần đầu

```bash
pnpm install

# Cấu hình lang-api: điền DB_HOST, DB_PASSWORD (hỏi người quản trị), JWT_SECRET
cp apps/lang-api/.env.example apps/lang-api/.env
openssl rand -base64 48   # dán kết quả vào JWT_SECRET

# Chạy migration (schema public đã có sẵn)
pnpm build
pnpm --filter lang-api migrate

pnpm dev
```

### Tài khoản

- Người dùng thường tự đăng ký tại http://localhost:3100/register.
- System Owner đầu tiên tạo bằng seed. Database dùng chung nên **chỉ cần chạy một lần** từ máy dev; chạy lại không tạo trùng, không đổi mật khẩu:
  ```bash
  # Điền SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD, SEED_OWNER_NAME, SEED_OWNER_DOB (YYYY-MM-DD) trong apps/lang-api/.env
  pnpm --filter lang-api seed:owner
  ```
  Seed xong nên xoá `SEED_OWNER_PASSWORD` khỏi `.env`.
- Trung tâm (tenant): người đủ 18 tuổi đăng ký tại `/me/tenants/new`, chọn một trong 3 gói dịch vụ (`basic` 100 / `standard` 500 / `pro` 1000 thành viên, tạo sẵn bằng migration), chờ System Admin duyệt; bị từ chối thì sửa và gửi lại từ `/me`. Tenant Owner/Admin quản lý thành viên ở `/t/{slug}/dashboard/members`: thêm theo email hoặc tạo account mới với mật khẩu tạm (bắt đổi ở lần đăng nhập đầu), phân vai trò, ngừng kích hoạt, gắn phụ huynh. Trung tâm vượt giới hạn sau khi hạ gói được gợi ý Học viên/Phụ huynh lâu không vào để ngừng kích hoạt.
- Sau đăng nhập: nhiều ngữ cảnh (quản trị hệ thống, các trung tâm) hoặc chưa có → `/me`; chỉ quản trị hệ thống → `/admin`; một trung tâm → dashboard (Owner/Admin/Giáo viên) hoặc trang trung tâm `/t/{slug}` (Học viên/Phụ huynh). Chuyển ngữ cảnh bằng switcher trên sidebar dashboard.
- Quản trị hệ thống `/admin` (System Owner/Admin): thống kê; người dùng (tạo, sửa, khoá, reset mật khẩu – tài khoản quản trị và đổi vai trò chỉ System Owner thao tác); trung tâm (duyệt, từ chối, tạm khoá, đổi gói); gói dịch vụ.
- Phiên: access token 15 phút (trong bộ nhớ trình duyệt) + refresh token 30 ngày (cookie httpOnly `ls_rt`). Đổi thời hạn bằng `JWT_ACCESS_EXPIRES_IN`, `REFRESH_EXPIRES_IN`; khi có HTTPS đặt `COOKIE_SECURE=true`.

### Đề thi, làm bài & chấm bài

- Danh mục, loại đề & mẫu bài học: hệ thống (`/admin/categories`, `/admin/exam-blueprints`, `/admin/lesson-blueprints`, seed sẵn TOEIC, IELTS, JLPT N2) và riêng từng trung tâm (`/t/{slug}/dashboard/categories`, `exam-blueprints`, `lesson-blueprints`; Giáo viên chỉ xem).
- Soạn đề (`/t/{slug}/dashboard/exams`, Owner/Admin/Giáo viên): tạo từ loại đề → mỗi module thành 1 section (tab) → soạn bằng Plate → Lưu → Publish khi không còn lỗi. Lưu khi version hiện tại đã có bài làm thì tạo version mới; khôi phục version ở trang Version. Giáo viên chỉ sửa đề mình tạo. Media của đề upload lên R2 (`/t/{slug}/dashboard/media`).
- Làm bài (mọi thành viên): `/t/{slug}` → chọn đề → từng section có màn hình hướng dẫn và đồng hồ riêng (tính ở server, hết giờ tự nộp), câu đánh số từ 1 mỗi section. Chấm trắc nghiệm ở server, học viên không nhận đáp án; kết quả hiện số câu đúng theo section.
- Chấm tay Writing/Speaking (`/t/{slug}/dashboard/grading`, Owner/Admin/Giáo viên, không chấm bài của mình): điểm 0–10 bước 0,5 + nhận xét, học viên thấy ngay khi chấm.
- **Ghi âm Speaking cần HTTPS hoặc localhost** (trình duyệt chặn micro trên HTTP). Trên VPS đang chạy `http://<ip>:3001`: thử bằng Chrome `chrome://flags/#unsafely-treat-insecure-origin-as-secure` thêm địa chỉ đó. Ghi âm lưu ở bucket R2 private, nghe qua link có hạn.
- Upload media và ghi âm cần 6 biến `R2_*` (xem `apps/lang-api/.env.example`); thiếu thì các chức năng này trả 501, phần còn lại vẫn chạy.

- Khu vực chính: http://localhost:3100
- API: http://localhost:3101/api/health (hoặc qua rewrite http://localhost:3100/api/health)
- `lang-app` không cần file `.env` khi dev (mặc định rewrite `/api` tới `127.0.0.1:3101`, xem `apps/lang-app/.env.example`).
- `/me`, `/admin`, `/t/{slug}/dashboard`… cần đăng nhập; `/admin` chỉ dành cho System Owner/Admin; trang trung tâm `/t/{slug}` công khai phần giới thiệu.

## Cấu trúc

```
apps/
  lang-app/            Next.js 14 – khu vực chính + dashboard
  lang-api/            NestJS 10 – REST API /api
packages/
  shared/              @lang/shared – enum role/trạng thái, hằng số, helper dùng chung
  exam-core/           @lang/exam-core – cấu trúc đề, parse đáp án, chấm điểm
  tsconfig/            @lang/tsconfig – preset base / library / nestjs / nextjs
  eslint-config/       @lang/eslint-config – ESLint flat config dùng chung
docs/requirements/     yêu cầu, câu hỏi, kế hoạch, tiến độ
docs/setup/            hướng dẫn deploy
Dockerfile             image chứa cả lang-api + lang-app
docker/entrypoint.sh   migrate → lang-api :3002 + lang-app :3000
deploy/                docker-compose.yml + .env mẫu cho VPS
.github/workflows/     build image (PR) / build + deploy (push main)
```

## Lệnh thường dùng

```bash
pnpm dev              # chạy toàn bộ ở chế độ dev (app :3100, api :3101)
pnpm build            # build mọi package/app (Turborepo, có cache; thêm --force để bỏ cache)
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm test             # Jest (@lang/shared, @lang/exam-core, lang-api; gồm test e2e phân quyền mọi route, không cần DB)
pnpm format           # Prettier ghi đè / pnpm format:check để kiểm tra
pnpm --filter <package> <script>   # chạy script cho một package, vd. --filter lang-api test
```

### Migration (lang-api)

```bash
pnpm --filter lang-api migrate                                              # tạo schema DB_SCHEMA nếu chưa có + chạy migration
pnpm --filter lang-api migration:generate src/database/migrations/<TenMigration>  # sinh từ thay đổi entity
pnpm --filter lang-api migration:revert                                     # hoàn tác migration cuối
```

Production chạy `node dist/database/migrate.js` khi container khởi động.

## Port

| Môi trường | lang-app                   | lang-api                |
| ---------- | -------------------------- | ----------------------- |
| Local      | 3100                       | 3101                    |
| VPS        | host 3001 → container 3000 | 3002 (nội bộ container) |

## Deploy

Push `main` → GitHub Actions build image `ghcr.io/vunguyenquangit/lang-simulator` và deploy lên VPS (`http://<ip-vps>:3001`). Pull request chỉ build image để kiểm tra Dockerfile. Chuẩn bị VPS, kiểm tra log, rollback: [docs/setup/deploy.md](docs/setup/deploy.md).

## Quản lý phiên bản dependency

Phiên bản dùng chung khai báo một lần trong `catalog` của [pnpm-workspace.yaml](pnpm-workspace.yaml), package dùng `"catalog:"`. Package cần chạy build script (native module…) phải được thêm vào `allowBuilds` (`true`/`false`).
