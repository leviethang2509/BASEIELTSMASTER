# Requirement 2 – Tiến độ

> Đọc [req-2-plan.md](req-2-plan.md) trước. Trạng thái: ✅ Xong · 🟡 Đang làm · ⬜ Chưa làm · ⛔ Bị chặn

| Step | Nội dung | Trạng thái | Ngày xong | Ghi chú |
|---|---|---|---|---|
| 1 | API & dữ liệu | ✅ | 2026-09-17 | Không có migration, không có env mới |
| 2 | Trang `/user-manual` | 🟡 | | Code xong; **chưa nghiệm thu giao diện khi đã đăng nhập** (xem “Đang chờ”) |
| 3 | Nội dung & hoàn thiện | ✅ | 2026-09-17 | 8 nhóm, 37 trang; CLAUDE.md đã có quy ước duy trì |

## Nhật ký 2026-09-17

**Đã làm**
- `@lang/shared/user-manual.ts`: kiểu `UserManual`/`ManualBlock`, `parseManualInline`, `manualHeadingId`, `manualBlockTexts`, `validateUserManual` (+ spec).
- lang-api: `UserManualModule`, `GET /admin/user-manual` (`SYSTEM_MANAGER_ROLES`), 8 file JSON trong `src/user-manual/content/`, spec kiểm nội dung thật; thêm dòng vào `ROUTES` của test phân quyền. JSON được `nest build` chép vào `dist` (đã kiểm).
- lang-app: `app/(docs)/user-manual/layout.tsx` + `[[...page]]/page.tsx`, `components/user-manual` (`UserManualShell`, `ManualPageView`, `ManualBlocks`), `lib/user-manual.ts` (tìm kiếm bỏ dấu, lọc role, mục lục), `vi.userManual`, mục **Tài liệu nội bộ** trong menu `/admin`, middleware chặn `/user-manual`.

**Kiểm tra**
- `pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm format:check` pass (shared 61, exam-core 49, lang-api 190 test).
- Chạy thật (api `node dist/main.js` :3101, app `next dev` :3100): `GET /api/admin/user-manual` chưa đăng nhập → 401; `/user-manual`, `/user-manual/cham-bai` không cookie → 307 `/login?next=…`; cookie giả → trang tự chuyển `/login?next=%2Fuser-manual%2Fcham-bai`, không có lỗi JS (Chrome headless).
- Phân quyền 403 cho Registered User / 200 cho System Owner, Admin: kiểm bằng `access-control.e2e.spec.ts`.

**Sai khác so với plan**
- Không có.

**Đang chờ**
- Nghiệm thu giao diện khi đăng nhập System Owner/Admin (menu, đổi trang, tìm kiếm, lọc role, mục lục, Trước/Sau, link `page:`, mobile) và Registered User bị chuyển `/me`. Tạo tài khoản thử rồi nâng quyền trên DB dùng chung bị chặn quyền trong phiên → cần người dùng quyết định cách kiểm.
