# Quy ước code – Lang Simulator

Quy ước chung cho **mọi** trợ lý AI (Claude, Gemini, Codex…) và người làm trong repo. File khởi tạo của từng công cụ (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md` ở gốc repo) chỉ trỏ về đây và [module-notes.md](module-notes.md), không chép lại nội dung.

- Quy ước viết code, quy trình, quy tắc chung → **file này**.
- Kiến thức theo module/tính năng (service nào làm gì, hàm dùng chung, quy tắc nghiệp vụ) → [module-notes.md](module-notes.md).
- Hai file mâu thuẫn với nhau hoặc với code: hỏi lại người dùng, sửa file sai cho khớp.

## 1. Quy trình làm việc

### Bắt đầu phiên

1. Đọc `req-N-progress.md` của requirement **đang làm** để biết step hiện tại, việc dở dang và lưu ý. Chưa có requirement đang làm; gần nhất: [req-5-progress.md](../requirements/req-5-progress.md) (định dạng đề bằng AI – Gemini, xong 2026-10-01), trước đó [req-4-progress.md](../requirements/req-4-progress.md) (giao diện & theme, xong 2026-09-25), [req-3-progress.md](../requirements/req-3-progress.md).
2. Đọc phần tương ứng trong `req-N-plan.md` (quyết định mục 1, giả định mục 2, thiết kế DB mục 4, phân quyền mục 5, route mục 6, step mục 7): [req-5-plan.md](../requirements/req-5-plan.md), [req-4-plan.md](../requirements/req-4-plan.md), [req-3-plan.md](../requirements/req-3-plan.md). Nền tảng req-1 (tài khoản, tenant, đề thi, thi & chấm) ở [req-1-plan.md](../requirements/req-1-plan.md).
3. Chỉ mở các file `req-N-question*.md` khi cần lý do của một quyết định.
4. Nghiệm thu tổng theo từng vai trò (dùng lại sau mỗi lần deploy): [req-3-acceptance.md](../requirements/req-3-acceptance.md) cho chức năng, [req-4-acceptance.md](../requirements/req-4-acceptance.md) cho 3 theme, [req-5-acceptance.md](../requirements/req-5-acceptance.md) cho Định dạng bằng AI.

Requirement mới đi theo chuỗi `req-N.md` → `req-N-question.md` (hỏi người dùng) → câu trả lời → `req-N-plan.md` → `req-N-progress.md`.

### Trong lúc làm

- Làm theo từng step trong plan. Kết thúc step, cả 5 lệnh phải pass:

  ```bash
  pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm format:check
  ```

  rồi đạt tiêu chí nghiệm thu (**chạy thử thật**, không chỉ build) và **cập nhật `req-N-progress.md`** (trạng thái, việc đã làm, sai khác so với plan, lưu ý cho step sau).
- Yêu cầu chưa rõ hoặc mâu thuẫn: **hỏi lại người dùng, không suy đoán**. Thay đổi quyết định đã chốt thì cập nhật cả plan.
- Thêm/đổi module → cập nhật [module-notes.md](module-notes.md); thêm quy ước chung → cập nhật file này.
- Thêm/đổi tính năng, quyền, giới hạn, env hay quy trình deploy → cập nhật tài liệu `/user-manual` (mục 8).

### Git

- **Chỉ commit/push khi người dùng yêu cầu.** Push `main` = deploy production.
- Không commit secret: `.env`, `deploy/.env` gitignored; chỉ commit file `*.example` (giá trị giả).

## 2. Dự án tham chiếu & môi trường

- `/Users/vunguyen/Projects/lightc-general` (LC): nguồn copy giao diện, Plate exam editor, simulator, grading, R2 upload, Docker/deploy.
- **Không copy** các tính năng không liên quan của LC (vocabulary, jp-\*, md-docs, gcp, labs) và **không copy giá trị trong `.env.example`/README của LC** (chứa mật khẩu thật).
- Database (schema `public`): máy dev dùng Postgres **local** `lang_simulator_dev` (user `lang_simulator_dev`); container :3001 dùng database `lang-simulator` trên Postgres của VPS. Máy dev **không** kết nối DB VPS (cấu hình cũ để comment `# VPS:` trong `apps/lang-api/.env`). Database `lang_simulator` trên Postgres local là của dự án khác — **không đụng**.
- Máy dev **không có Docker** (xem mục 9).

## 3. Cấu trúc monorepo

| Đường dẫn                | Nội dung                                                                        |
| ------------------------ | ------------------------------------------------------------------------------- |
| `apps/lang-api`          | Backend NestJS + TypeORM (Postgres), cổng 3002 trong image                      |
| `apps/lang-app`          | Frontend Next.js (App Router), gọi API cùng origin `/api`                       |
| `packages/shared`        | `@lang/shared`: kiểu, enum, hàm thuần dùng chung API + app                      |
| `packages/exam-core`     | `@lang/exam-core`: logic thuần dữ liệu của đề (không React/platejs)             |
| `packages/eslint-config` | `@lang/eslint-config/base` (flat config dùng chung)                             |
| `packages/tsconfig`      | tsconfig dùng chung                                                             |
| `docs/`                  | `requirements/` (req, plan, progress), `setup/` (deploy), `dev/` (quy ước code) |

- pnpm 11 + Turborepo, Node 24. Package nội bộ tên `@lang/*`, phụ thuộc bằng `workspace:*`; phiên bản dùng chung qua `catalog:` trong `pnpm-workspace.yaml`.
- Package mới có build script → khai báo trong `allowBuilds`. Không thêm `minimumReleaseAgeExclude` để lách bản phát hành quá mới; hạ version range thay thế.
- Package trong `packages/*` build bằng tsup ra ESM (Next.js) + CJS (NestJS); app phải build package trước (turbo `dependsOn: ["^build"]` đã lo). Đổi code `packages/*` rồi chạy app/test thì build lại package.
- Logic thuần dùng ở cả API lẫn app (tính điểm, lịch, quyền…) đặt ở `@lang/shared` (hoặc `@lang/exam-core` nếu thuộc đề) kèm unit test `*.spec.ts` cạnh file.

## 4. TypeScript & phong cách chung

- TypeScript 5.9 **strict**. Không dùng `any` khi có kiểu cụ thể; dùng `import type` / `type X` trong import cho kiểu.
- Prettier: single quote, trailing comma `all`, 2 space, LF, có newline cuối file (`.prettierrc.json`, `.editorconfig`). Chạy `pnpm format` trước khi kết thúc.
- ESLint 10 flat config (`@lang/eslint-config/base` = `@eslint/js` + `typescript-eslint` recommended + prettier). Biến/tham số không dùng đặt tiền tố `_`. Lint bằng `eslint .`.
- **Enum dùng chung**: object `as const` + union type trong `@lang/shared`, **không dùng TS `enum`**; giá trị trùng với giá trị lưu DB.

  ```ts
  export const ClassroomStatus = {
    UPCOMING: 'upcoming',
    ONGOING: 'ongoing',
  } as const;
  export type ClassroomStatus =
    (typeof ClassroomStatus)[keyof typeof ClassroomStatus];
  ```

- **Tiếng Việt** cho comment, message lỗi, chuỗi UI (giống LC). Tên biến/hàm/file bằng tiếng Anh.
- Comment ngắn, giải thích **tại sao** / quy tắc nghiệp vụ, thường trỏ về plan (`plan mục 5`). JSDoc một dòng `/** … */` cho hàm/class export.
- Hằng số message lỗi đặt đầu file dạng `const HOLIDAY_NOT_FOUND = 'Không tìm thấy ngày nghỉ';`.
- Đặt tên:
  - File: kebab-case (`class-schedule.ts`, `tenant-settings.service.ts`); component React: PascalCase (`ClassLogList.tsx`).
  - Hàm/biến: camelCase; hằng số: `UPPER_SNAKE_CASE`; class/type: PascalCase.
  - Hàm chuyển đổi `toXxx` (`toAuthUser`, `toHolidayView`), hàm kiểm tra ném lỗi `assertXxx`, hàm trả boolean `isXxx`/`canXxx`/`hasXxx`, hàm nạp dữ liệu `loadXxx`/`findXxx`.
- Ngày giờ nghiệp vụ theo giờ Việt Nam `+07:00` qua helper của `@lang/shared` (`trainingDateOf`, `trainingDateTimeToIso`…), không tự cộng offset.

## 5. lang-api (NestJS)

### Cấu trúc module

- Mỗi module một thư mục: `xxx.module.ts`, `xxx.controller.ts`, `xxx.service.ts`, `xxx.entity.ts`, `dto/*.dto.ts`, `xxx.mapper.ts` (entity → kiểu `@lang/shared`), hàm thuần `xxx.ts`, test `xxx.spec.ts` cạnh file.
- Controller mỏng: lấy `@TenantCtx()` / `@CurrentUser()` / `@Body()` rồi gọi service, khai báo kiểu trả về là kiểu của `@lang/shared`. Không trả entity ra client (vd. dùng `toAuthUser`, không trả `User`).
- Param uuid dùng `ParseIdPipe()`.

### Env

- Env mới: thêm vào `src/config/env.validation.ts` (kiểm tra lúc khởi động, **không có giá trị dự phòng cho secret**) **và** `apps/lang-api/.env.example`. Cần ở production thì thêm cả `deploy/.env.example`, `deploy/staging/.env.example` và nhắc người dùng cập nhật `.env` trên VPS.

### Database & migration

- Schema theo env `DB_SCHEMA` (`public`), PK uuid (`gen_random_uuid`, không tự tạo extension), tên bảng/cột snake_case, entity đặt tên `*.entity.ts`.
- **Chỉ dùng migrations** (không `synchronize`); **không sửa migration đã chạy**. DB trên VPS chỉ đổi khi deploy (container chạy migration rồi mới chạy code mới) nên migration đổi tên/xoá cột làm trong 1 bước được, nhưng phải chạy được trên dữ liệu đang có.
- Quy trình: `migration:generate` rồi **đọc lại**; index/constraint entity không khai báo được (vd. unique `lower(email)`) thì thêm tay và gắn `@Index(name, { synchronize: false })` trên entity. Chạy bằng `pnpm --filter lang-api migrate` (không có `migration:run`). Chạy xong, `migration:generate` lần nữa phải báo "No changes". `migration:revert` gỡ migration **đã chạy** mới nhất.
- Enum lưu `varchar` + `@Check` (dùng `sqlInList`), không dùng Postgres enum.
- Email luôn qua `normalizeEmail` (`@lang/shared`), unique theo `lower(email)` bỏ qua user đã xoá mềm (không dùng citext).
- Thao tác cần nhất quán (giới hạn gói, đổi trạng thái, sửa nội dung) làm trong transaction, **khoá dòng** cha trước khi kiểm/ghi.
- Chuyển trạng thái bằng update có điều kiện trạng thái cũ; không khớp → 409. Sửa nội dung có `baseRevision` lệch → 409.
- Lỗi DB: `isUniqueViolation`/`isForeignKeyViolation` đổi thành 409. Tìm kiếm `LIKE` qua `escapeLike`.

### Xác thực & phân quyền

- `JwtAuthGuard` + `SystemRolesGuard` là **guard toàn cục**: route mặc định cần đăng nhập. Route công khai gắn `@Public()`; route vẫn gọi được khi user còn `must_change_password` gắn `@AllowPendingPasswordChange()`; giới hạn role hệ thống bằng `@SystemRoles(...)`.
- Route tenant `/t/:slug/*`: `@UseGuards(TenantGuard)` + `@TenantRoles(...)` ở controller, đọc `@TenantCtx()` và **luôn lọc theo `ctx.tenantId`**; module import `TenantsModule`. System Owner/Admin không được bỏ qua `TenantGuard`.
- Route admin `/admin/*`: `@SystemRoles(...SYSTEM_MANAGER_ROLES)`; quyền trên tài khoản dùng `canManageUser` (`@lang/shared`) ở cả API lẫn UI.
- Quy tắc quyền chi tiết (đề của mình, lớp mình dạy…) viết thành hàm thuần `canXxx`/`assertXxx` và kiểm ở unit test service.
- **Thêm/đổi route phải thêm dòng vào bảng `ROUTES`** của `src/access-control.e2e.spec.ts` (viết tay theo plan mục 5), thiếu thì test báo lỗi.

### Validation & lỗi

- DTO dùng class-validator; decorator trường dùng chung ở `common/validators/fields.ts` (`EmailField`, `FullNameField`, `PhoneField`…, `composeDecorators`, `isPresent` cho PATCH), transform `trimToNull`/`toEmail`/`emptyToUndefined`, validator `NewPassword`/`IsDateOfBirth`.
- `ValidationPipe` dùng `validationExceptionFactory` (`common/validation.ts`) — message lồng nhau không có tiền tố `field.0.`.
- Ném exception của Nest (`NotFoundException`, `ConflictException`…) với message tiếng Việt. Lỗi trả về dạng `{ statusCode, message }` qua `AllExceptionsFilter`; không lộ chi tiết lỗi 500. Quy ước mã: 400 dữ liệu sai, 403 không có quyền, 404 không thấy / không thuộc tenant, 409 xung đột trạng thái/revision, 422 nội dung đề có lỗi, 501 thiếu cấu hình R2.
- File dùng decorator class-transformer/class-validator mà có thể chạy ngoài Nest (script, CLI, test) phải `import 'reflect-metadata'`.

### Test

- Unit test service dùng `src/testing/in-memory-repository.ts` (**không** kết nối DB dùng chung); service có transaction dùng `in-memory-data-source.ts` (**không rollback**: chỉ kiểm lỗi xảy ra trước khi ghi; repository giả chỉ hỗ trợ các FindOperator đã liệt kê, thêm loại mới thì bổ sung helper).
- `jest.mock('../auth/password')` để khỏi chạy bcrypt thật. Giả giờ bằng `fakeDate()` (`src/testing/fake-clock.ts`, chỉ giả `Date`).
- Service gửi thông báo dùng `testing/fake-notifications.ts`.

### Build

- **Không bật `incremental`** trong tsconfig của Nest (cùng `deleteOutDir` làm `dist` thiếu file). Nếu `dist` thiếu file: xoá `*.tsbuildinfo` và `pnpm build --force`.

## 6. lang-app (Next.js)

### Cấu trúc

- Route group: `(site)` khu vực chính, `(dashboard)` dùng `DashboardShell`, `(exam)` toàn màn hình cho thi, `(docs)` tài liệu nội bộ.
- `src/components/<tính-năng>/` cho component theo tính năng, `src/components/ui` cho component dùng chung, `src/lib/<tính-năng>-api.ts` cho hàm gọi API, `src/config/navigation.ts` cho menu.
- Server component chỉ truyền **dữ liệu thuần** sang client component; menu/icon dựng trong client. Page đọc query bằng prop `searchParams`.
- Component tách phần gọi API (`XxxView`) và phần hiển thị nhận dữ liệu qua prop (`XxxBoard`) khi cần render/kiểm không cần API.
- Logic thuần của UI (kéo thả, lịch, nháp) để ở file `.ts` riêng có unit test (`curriculum-draft.ts`, `calendar-model.ts`).

### Chuỗi UI

- Mọi chuỗi UI trong `src/i18n/vi.ts`, nhóm theo tính năng (`vi.classes`, `vi.grading`…); chuỗi có tham số viết thành hàm. Không viết chuỗi tiếng Việt thẳng trong component.

### Gọi API

- Qua `src/lib/api.ts` (cùng origin `/api`, access token trong bộ nhớ, tự refresh khi 401; mất mạng / 5xx không có body JSON đổi thành `ApiError` tiếng Việt).
- Hiển thị lỗi bằng `errorMessage` (`lib/error-message.ts`) – chỉ hiện message của `ApiError`, lỗi khác dùng thông báo mặc định. Lỗi 422 nội dung đề lấy `issues` bằng `contentIssuesOf`.
- Ngày giờ/giá/số định dạng qua `lib/format.ts`. Chép clipboard qua `lib/clipboard.ts`; uuid ở client không dùng `crypto.randomUUID` (VPS chạy HTTP, không có secure context).
- Ảnh từ R2 hiển thị bằng `<img>`, không dùng `next/image`.

### Màu & theme (req-4)

- 3 theme `light` (mặc định) · `solarized-light` · `dark` khai báo bằng `:root[data-theme='…']` trong `globals.css`; lựa chọn lưu ở cookie `ls_theme` + localStorage (`src/theme/`).
- **Không viết `rgba()`/hex thẳng trong component** – khai báo token trong `globals.css` rồi dùng `var(--…)` (vd. `bg-[var(--warn-soft)]`). ESLint `no-restricted-syntax` chặn; chỉ 3 file bảng màu **người dùng chọn** được miễn (`global-error.tsx`, `catalog-ui.tsx`, `ExamToolbar.tsx`). Class CSS riêng dùng tiền tố `ls-`.
- Sửa màu = sửa **giá trị token**; đổi token phải kiểm lại cả `light`/`solarized-light`/`dark`.
- Màu đến từ **dữ liệu** hoặc bảng màu cố định của `@lang/exam-core` đi qua `.ls-tint*` / `.ls-leaf-*` / `.ls-event` – component chỉ truyền mã màu vào biến CSS (`--tint-raw`, `--leaf-fg`, `--leaf-bg`, `--event-color`), **không** đặt thẳng `color`/`backgroundColor`.
- Vai trò token: `--accent-bg` (+`--accent-hover`) là **nền** nút đặc, luôn đi với `text-white`; `--accent` chỉ cho **chữ/viền**; `--raised`/`--panel` là mặt nổi trên `--card`/`--sidebar`; trạng thái dùng `--ok|warn|danger|info` × `-text`/`-soft`/`-border` và `--on-status` cho chữ trên nền đặc.

### Component dùng chung

- Form: `inputClass`/`labelClass`/`primaryButtonClass`, `PasswordInput`, `FormAlert`, `SectionCard` (`src/components/ui`); nút trong dialog/toolbar dùng `compactPrimaryButtonClass`/`secondaryButtonClass`/`iconButtonClass`.
- Trang danh sách dashboard: `DataTable` (truyền **nguyên văn** class `sm:grid-cols-[…]` để Tailwind quét được) + `SearchInput`/`SelectFilter` + `Pagination`, trạng thái bằng `Badge`, mật khẩu tạm bằng `TemporaryPasswordDialog`.
- Hộp thoại: `Modal`, `ConfirmDialog`, `PromptDialog`. Modal lồng nhau: chỉ modal mở sau cùng nhận Esc.
- Trang cần đăng nhập bọc `RequireAuth`; dashboard dùng `AuthedDashboardShell`; trang tenant lấy tenant/roles qua `useTenantDashboard()`.
- Link tới route middleware chặn (`/me/*`…) ở chỗ khách nhìn thấy phải `prefetch={false}`.

### ESLint

- Plugin `@next/next` bản 14 phải bọc `fixupPluginRules` (ESLint 10); lint bằng `eslint .`, không dùng `next lint`. `react-hooks/rules-of-hooks` là error, `exhaustive-deps` là warn – sửa warning, đừng tắt.

## 7. exam-core

- Logic thuần dữ liệu, **không phụ thuộc platejs/React**; plugin Plate và UI ở lang-app.
- Đổi quy tắc chấm có chủ đích thì sửa cả bản đối chiếu `src/testing/lc-grading.ts` và ghi lý do. Fixture trong `src/__fixtures__` (prettier bỏ qua).
- Chi tiết luồng Save/publish/chấm: [module-notes.md](module-notes.md#exam-core-langexam-core).

## 8. Tài liệu nội bộ `/user-manual`

- Nội dung là JSON trong `apps/lang-api/src/user-manual/content/`, **không** đặt ở `public/` hay bundle vào lang-app.
- **Thêm/đổi tính năng, quyền, giới hạn, env hay quy trình deploy phải cập nhật tài liệu JSON tương ứng** (tên menu/nút đúng `vi.ts`; không ghi secret, IP hay giá trị env) và đổi `updatedAt` trong `user-manual.content.ts`. Đổi chữ heading thì sửa các liên kết `#…` trỏ tới nó (`user-manual.content.spec.ts` kiểm).

## 9. Docker & deploy

- Hướng dẫn: [deploy.md](../setup/deploy.md), staging: [deploy-staging.md](../setup/deploy-staging.md). Image: `turbo prune` → `pnpm install --frozen-lockfile` → `turbo run build` (`BACKEND_INTERNAL_URL=http://127.0.0.1:3002`) → `pnpm --filter lang-api deploy --prod --legacy`; runner chạy `docker/entrypoint.sh` (migrate → api :3002 + app :3000).
- Đổi phiên bản `turbo` trong catalog thì sửa cả `pnpm dlx turbo@…` trong `Dockerfile`.
- Máy dev không có Docker: kiểm Dockerfile bằng PR (workflow chỉ build) hoặc giả lập trong thư mục tạm: `turbo prune --docker` → install/build/deploy trong `out` → chạy các lệnh như entrypoint. **Không chạy `pnpm deploy --prod` từ repo** (ghi `"dev": false` vào `node_modules/.pnpm-workspace-state-v1.json`, sau đó mọi `pnpm exec/run` đòi cài lại bản production). Lỡ chạy thì `pnpm install --frozen-lockfile`.
- Workflow tự copy `deploy/docker-compose.yml` lên `/opt/lang-simulator` mỗi lần deploy; push `main` = deploy, chỉ push khi người dùng yêu cầu.
- Staging: workflow `deploy-staging.yml` **chỉ `workflow_dispatch`**, compose riêng `deploy/staging/`, image tag `staging`/`sha-<commit>` (không đụng `latest`).
- Giá trị hạ tầng VPS (tên container, network, host) lấy từ `.env`/output thật trên VPS, không đoán.

## 10. Checklist trước khi báo xong

- [ ] `pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm format:check` pass.
- [ ] Chạy thử thật luồng vừa làm (API + UI), cả 3 theme nếu đụng giao diện.
- [ ] Route mới có dòng trong `ROUTES` (`access-control.e2e.spec.ts`).
- [ ] Migration mới đã đọc lại, đã chạy, `migration:generate` báo "No changes".
- [ ] Env mới có trong `env.validation.ts` + các file `.env.example`.
- [ ] Chuỗi UI trong `vi.ts`, màu qua token.
- [ ] Đã cập nhật `req-N-progress.md`, [module-notes.md](module-notes.md) và `/user-manual` nếu cần.
- [ ] Không commit/push nếu người dùng chưa yêu cầu.
