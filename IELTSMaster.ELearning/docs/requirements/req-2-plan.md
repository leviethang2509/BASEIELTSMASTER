# Requirement 2 – Kế hoạch implement

> Nguồn: [req-2.md](req-2.md) và câu trả lời trong [req-2-question.md](req-2-question.md).

## 1. Quyết định đã chốt

| Mục | Quyết định |
|---|---|
| Nội dung | File JSON trong repo (`apps/lang-api/src/user-manual/content/*.json`), **không** đặt ở `public/` hay bundle vào lang-app |
| Phục vụ | `GET /api/admin/user-manual` (`@SystemRoles(...SYSTEM_MANAGER_ROLES)`); không có DB, không migration, không env mới |
| Route | `/user-manual` (trang đầu) và `/user-manual/{pageId}`; layout riêng kiểu docs; chặn bằng middleware (cookie) + `RequireAuth systemManager` + API |
| Lối vào | Mục "Tài liệu nội bộ" trong menu dashboard `/admin` |
| Định dạng | Khối có cấu trúc (xem mục 3); chuỗi hỗ trợ inline `**đậm**`, `` `mã` ``, liên kết `[chữ](page:id)` / `[chữ](page:id#heading)` |
| Phạm vi | Hướng dẫn theo role, nghiệp vụ & khái niệm, ma trận phân quyền, vận hành kỹ thuật (không chứa secret, IP hay giá trị env) |
| Tính năng | Sidebar nhóm trang, tìm kiếm (client), lọc theo role, mục lục trong trang (màn hình rộng), Trước/Sau, sidebar thu gọn trên mobile |
| Ảnh | Không, chỉ văn bản |
| Duy trì | Quy tắc trong CLAUDE.md + test kiểm cấu trúc JSON (id trang/heading duy nhất, block hợp lệ, liên kết `page:` không gãy, role hợp lệ) |

## 2. Giả định

1. Nội dung viết cho người đọc nội bộ (System Owner/Admin) nhưng mô tả thao tác của **mọi** role để họ hỗ trợ người dùng.
2. Tên menu/nút trong tài liệu lấy đúng theo `apps/lang-app/src/i18n/vi.ts`.
3. Trang có `roles` rỗng là trang chung, luôn hiện khi lọc theo role.
4. Tìm kiếm không phân biệt hoa thường và dấu tiếng Việt, trên tiêu đề, tóm tắt và toàn bộ chữ trong block.

## 3. Cấu trúc dữ liệu (`@lang/shared` – `user-manual.ts`)

```
UserManual   { title, updatedAt (YYYY-MM-DD), groups: ManualGroup[] }
ManualGroup  { id, title, pages: ManualPage[] }
ManualPage   { id, title, summary, roles: ManualRole[], blocks: ManualBlock[] }
ManualRole   = SystemRole | TenantRole
ManualBlock  =
  | { type: 'heading', text, level: 2 | 3 }            // id = manualHeadingId(text), dùng cho mục lục + #anchor
  | { type: 'paragraph', text }
  | { type: 'list', items: string[], ordered?: boolean }
  | { type: 'steps', items: { title, text? }[] }
  | { type: 'table', columns: string[], rows: string[][] }
  | { type: 'callout', tone: 'info' | 'tip' | 'warning', title?, text }
  | { type: 'roles', roles: ManualRole[] }             // dải badge "Áp dụng cho"
  | { type: 'code', text }
```

Mỗi file JSON trong `content/` là một `ManualGroup`; `user-manual.content.ts` ghép theo thứ tự.

## 4. Mục lục nội dung

| Nhóm | Trang |
|---|---|
| Giới thiệu | Tổng quan hệ thống · Thuật ngữ · Vai trò · Ma trận phân quyền |
| Hướng dẫn theo vai trò | System Owner · System Admin · Người dùng · Chủ sở hữu · Quản trị viên · Giáo viên · Học viên · Phụ huynh |
| Tài khoản | Đăng ký & đăng nhập · Hồ sơ & mật khẩu · Không gian của tôi |
| Quản trị hệ thống | Tổng quan · Người dùng · Trung tâm · Gói dịch vụ · Danh mục & loại đề hệ thống |
| Trung tâm | Đăng ký trung tâm · Dashboard trung tâm · Thành viên · Danh mục & loại đề của trung tâm · Thư viện media |
| Đề thi | Vòng đời đề thi · Trình soạn đề · Dạng câu hỏi & cách chấm · Version |
| Thi & chấm bài | Làm bài thi · Kết quả & lịch sử · Chấm bài |
| Vận hành kỹ thuật | Kiến trúc · Deploy & môi trường · Giới hạn hệ thống · Sự cố thường gặp · Ngoài phạm vi hiện tại |

## 5. Các step

### Step 1 – API & dữ liệu
- `@lang/shared`: kiểu `UserManual…`, `MANUAL_ROLES`, `manualHeadingId`, `MANUAL_PAGE_LINK_PATTERN`.
- lang-api: `UserManualModule` (`user-manual/`), controller `admin/user-manual`, nội dung JSON, `validateUserManual` + spec kiểm nội dung thật; thêm dòng `GET /admin/user-manual` vào `ROUTES` của `access-control.e2e.spec.ts`.
- Nghiệm thu: `GET /api/admin/user-manual` 200 với System Owner, 401 khi chưa đăng nhập, 403 với Registered User; file JSON có trong `dist`.

### Step 2 – Trang `/user-manual`
- `app/(docs)/user-manual/layout.tsx` (`RequireAuth systemManager` + tải dữ liệu 1 lần) và `[[...page]]/page.tsx`.
- `components/user-manual`: shell (header, sidebar, tìm kiếm, lọc role, mobile), renderer block + inline, mục lục, Trước/Sau.
- Chuỗi UI trong `vi.userManual`; menu admin thêm "Tài liệu nội bộ"; middleware chặn `/user-manual`.
- Nghiệm thu (chạy thật): Owner xem được mọi trang, click menu đổi nội dung + URL, tìm kiếm/lọc role/mục lục/Trước-Sau hoạt động, link `page:` chuyển đúng trang; user thường bị chuyển về `/me`; khách bị chuyển `/login`; mobile mở/đóng sidebar.

### Step 3 – Nội dung & hoàn thiện
- Viết đủ nội dung mục 4 dựa trên code hiện tại (req-1).
- CLAUDE.md: quy ước duy trì tài liệu.
- Kiểm tra: `pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm format:check`; cập nhật [req-2-progress.md](req-2-progress.md).
