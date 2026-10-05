# LỊCH SỬ CÔNG VIỆC: SSO PHASE 1 – ĐỒNG BỘ JWT GIỮA AUTHSERVICE VÀ ELEARNING

## 1. Thông tin chung
- **Thời gian thực hiện:** 04/10/2026 11:54 – 12:00
- **Người thực hiện:** Antigravity AI Assistant
- **Tài liệu kế hoạch:** `sso_auth_analysis.md` (Phase 1 – Đồng bộ format JWT)

## 2. Mô tả công việc (Bước 1)
- **Mục tiêu:** Token do `IELTSMaster.AuthService` phát ra phải được `lang-api` (ELearning) chấp nhận trực tiếp → đăng nhập 1 lần dùng cho cả 2 hệ thống (SSO cơ bản).
- **Hiện trạng kiểm tra được:**
  - `Jwt:Key` (AuthService) == `JWT_SECRET` (lang-api) → đã trùng.
  - Cả hai dùng HS256.
  - Payload AuthService: `sub`, `email`, `name`, `full_name`, `system_role`, `tv` (number), `jti`, `iss`, `aud`, (+ `tenant_*`, `role` khi có tenant).
  - `JwtAuthGuard` của lang-api chỉ cần `sub` + `tv`, sau đó tra `public.users` (view của `auth.users`) → id trùng khớp.
  - SystemRole dùng chung giá trị (`SYSTEM_OWNER`, `SYSTEM_ADMIN`, `REGISTERED_USER`).
- **Vấn đề phát hiện:** `TokenService` đọc key `Jwt:AccessExpiryMinutes` trong khi `appsettings.json` khai báo `Jwt:AccessTokenExpirationMinutes` → access token sống 60 phút (mặc định), lệch với lang-api (15m).

## 3. File thay đổi (Bước 2)
| File | Lý do |
|------|-------|
| `IELTSMaster.AuthService/Services/ITokenService.cs` | Đọc đúng key `Jwt:AccessTokenExpirationMinutes` (fallback key cũ), mặc định 15 phút cho khớp lang-api |
| `IELTSMaster.ELearning/apps/lang-api/.env` | Thêm ghi chú bắt buộc `JWT_SECRET` phải trùng `Jwt:Key` của AuthService |

## 4. Cách xử lý (Bước 3)
- Không đổi format payload (đã tương thích), không đổi DB, không đổi API.
- Chỉ sửa cấu hình thời hạn token và tài liệu hóa ràng buộc secret.

## 5. Kết quả (Bước 4)
- **Test E2E** (script `scratch/sso_test.ps1`):
  1. `POST https://localhost:7083/auth/auth/login` (admin@langsimulator.com) → nhận accessToken.
  2. `GET http://localhost:3101/api/auth/me` với `Authorization: Bearer <token AuthService>` → **200 OK**, trả đúng user `SYSTEM_OWNER`.
- ⇒ **SSO cơ bản đã hoạt động**: đăng nhập ở IELTSMASTER, dùng token gọi ELearning được ngay.

## 6. Lưu ý / Bước tiếp theo
- Cần **restart AuthService** để áp dụng thời hạn token 15 phút.
- Khi deploy production: đặt cùng một secret qua biến môi trường (`Jwt__Key` / `JWT_SECRET`), không commit secret thật.
- Phase 2: bỏ `login/register/refresh` của lang-api, frontend ELearning gọi AuthService; refresh token dùng `auth.refresh_tokens`.
- Phase 3–4: chuyển quản lý user/membership của lang-api sang API AuthService.
