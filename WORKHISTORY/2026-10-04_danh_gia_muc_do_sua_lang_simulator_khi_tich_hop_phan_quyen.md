# LỊCH SỬ CÔNG VIỆC: ĐÁNH GIÁ MỨC ĐỘ SỬA LANG-SIMULATOR KHI TÍCH HỢP VÀO IELTSMASTER (TRỌNG TÂM PHÂN QUYỀN)

## 1. Nội dung công việc
* **Yêu cầu:** Nếu tích hợp `C:\A_TRUNGTAMTIENGANH\SOURCE_CODE\lang-simulator` vào IELTSMaster ở thời điểm hiện tại thì `lang-simulator` có phải sửa nhiều không, nhất là phần phân quyền.
* **Loại công việc:** Phân tích / đánh giá. **Không chỉnh sửa code.**

## 2. Thời gian thực hiện
* 01:38 - 01:45, Ngày 04/10/2026.

## 3. File đã khảo sát (không thay đổi)
| Phía | File | Mục đích |
|---|---|---|
| lang-simulator | `packages/shared/src/roles.ts` | Định nghĩa SystemRole / TenantRole / nhóm role |
| lang-simulator | `apps/lang-api/src/auth/guards/jwt-auth.guard.ts` | Xác thực JWT toàn cục |
| lang-simulator | `apps/lang-api/src/auth/guards/system-roles.guard.ts` | Kiểm tra `@SystemRoles()` |
| lang-simulator | `apps/lang-api/src/tenants/tenant.guard.ts` | Kiểm tra membership + `@TenantRoles()` |
| lang-simulator | `apps/lang-api/src/auth/auth.service.ts`, `password.ts`, `auth.module.ts` | Payload token, bcrypt, `JWT_SECRET` |
| lang-simulator | `apps/lang-api/src/database/database.config.ts`, `users/user.entity.ts` | Schema, mapping bảng `users` |
| lang-simulator | `apps/lang-app/src/middleware.ts`, `lib/api.ts`, `next.config.mjs` | Cookie refresh, gọi `/api/auth/refresh`, rewrite |
| IELTSMaster | `IELTSMaster.Shared/Security/AuthConstants.cs` | Hằng số role |
| IELTSMaster | `IELTSMaster.AuthService/Services/ITokenService.cs` | Sinh access token |
| IELTSMaster | `IELTSMaster.AuthService/Entities/User.cs`, `Tenant.cs`, `Infrastructure/Data/AuthDbContext.cs` | Mapping schema `auth` |

## 4. Kết quả phân tích

### 4.1. Những phần KHÔNG cần sửa trong lang-simulator
1. **Giá trị role trùng khớp 1:1**: `SYSTEM_OWNER/SYSTEM_ADMIN/REGISTERED_USER`, `TENANT_OWNER/TENANT_ADMIN/TEACHER/STUDENT/PARENT` và các nhóm (`TENANT_MANAGER_ROLES`, `EXAM_AUTHOR_ROLES`, `GRADER_ROLES`, `TENANT_DASHBOARD_ROLES`, `ASSIGNABLE_TENANT_ROLES`).
2. **`TenantGuard` không đọc role từ JWT** mà đọc trực tiếp `memberships` + `membership_roles` trong DB theo `slug`. Vì cùng database `lang-simulator`, role do AuthService cấp được lang-api thấy ngay.
3. **`SystemRolesGuard`** dùng `user.systemRole` tải lại từ DB → không phụ thuộc claim.
4. **Hash mật khẩu tương thích**: lang-api dùng `bcryptjs` (12 rounds), AuthService dùng `BCrypt.Net` → cùng định dạng `$2a/$2b$`, user đăng nhập được ở cả hai bên.
5. **Cấu trúc bảng `users`** (cột, độ dài, default, `token_version`) khớp giữa TypeORM entity và `AuthDbContext`.

### 4.2. Điểm vướng (cần xử lý khi tích hợp)
| # | Vấn đề | Mức độ | Sửa ở đâu |
|---|---|---|---|
| 1 | Claim `tv` của AuthService là **chuỗi** (`"0"`), `JwtAuthGuard` so sánh `user.tokenVersion !== payload.tv` (strict, kiểu number) → **luôn 401** | Chặn hoàn toàn | IELTSMaster: `ITokenService.cs` thêm `ClaimValueTypes.Integer32` (1 dòng) |
| 2 | Secret ký token phải trùng: `Jwt:Key` (AuthService) = `JWT_SECRET` (lang-api), ≥ 32 ký tự | Cấu hình | `.env` / `appsettings.json` |
| 3 | Luồng refresh: lang-app gọi `POST /api/auth/refresh` với cookie httpOnly `REFRESH_TOKEN_COOKIE`; nếu chuyển đăng nhập sang AuthService thì tên cookie, path và shape `AuthResponse` phải giống | Trung bình | Chọn 1: giữ auth của lang-api, hoặc AuthService giả lập đúng contract |
| 4 | lang-api dùng `DB_SCHEMA=public` (đi qua các View trỏ sang `auth.*`/`business.*`). Đọc/ghi bảng đơn qua view vẫn chạy, nhưng **migration mới của lang-api `ALTER TABLE` trên view sẽ lỗi** | Rủi ro tương lai | Cấu hình `search_path=business,auth,public` hoặc quy ước migration |
| 5 | Hai nơi cùng ghi `users`/`refresh_tokens`/`memberships` (lang-api có API đăng ký, quản lý thành viên) → cần quy định nguồn ghi chính | Kiến trúc | Quy ước, chưa cần code |

### 4.3. Kết luận
* **Phân quyền: gần như không phải sửa lang-simulator** (0 dòng trong guard/role).
* Khối lượng tối thiểu để token AuthService dùng được ở lang-api: **1 dòng ở IELTSMaster** (`tv` kiểu số) + **đồng bộ secret**.
* Phần cần quyết định thêm là luồng **refresh token/đăng nhập** của lang-app (mục 3) và **schema/migration** (mục 4).

## 5. Lưu ý
* Chưa thực hiện bất kỳ chỉnh sửa nào; chờ người dùng xác nhận phương án trước khi sửa `ITokenService.cs` (theo nguyên tắc rule.md).
* Không có build/test vì không thay đổi code.
