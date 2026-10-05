# Kiểm Tra Code Và Phân Tích Lại Hệ Thống Phân Quyền AuthService & ELearning

## 1. Nội dung công việc
* Rà soát sâu toàn bộ mã nguồn thực tế (Deep Code Audit) trên cả 2 nền tảng:
  - Backend .NET: `IELTSMaster.AuthService`, `IELTSMaster.Shared`, `IELTSMaster.ApiGateway`, `IELTSMaster.BusinessService`.
  - Frontend & API Node.js: `IELTSMaster.ELearning/apps/lang-api`, `apps/lang-app`, `packages/shared`.
* Phân tích, đối soát hiện trạng thực tế trong code với tài liệu kiến trúc: `Document/PHAN_TICH_THONG_NHAT_PHAN_QUYEN_AUTHSERVICE_ELEARNING.md`.
* Bổ sung mục đánh giá thực tế (Code Reality Audit) và 5 phát hiện chí mạng cùng giải pháp khắc phục.

## 2. Thời gian thực hiện
* Ngày: 05/10/2026

## 3. Danh sách File đã thay đổi / tạo mới
* `Document/PHAN_TICH_THONG_NHAT_PHAN_QUYEN_AUTHSERVICE_ELEARNING.md`: Bổ sung phần kiểm tra code thực tế, 5 phát hiện rủi ro chí mạng, sơ đồ mermaid và bảng đánh giá độ rủi ro.
* `WORKHISTORY/2026-10-05_kiem_tra_code_va_phan_tich_lai_he_thong_authservice_elearning.md`: Ghi lại nhật ký kiểm tra và phân tích hệ thống.

## 4. Lý do thay đổi
* Người dùng yêu cầu kiểm tra code và phân tích lại hệ thống hiện tại để đảm bảo tài liệu phản ánh chính xác 100% hiện trạng mã nguồn thay vì chỉ dừng ở các nhận định lý thuyết.
* Phát hiện các điểm nghẽn kỹ thuật thực tế (về database schema, truy vấn local DB, hiệu năng network roundtrips, thiếu endpoint) để lập kế hoạch xử lý dứt điểm.

## 5. Kết quả kiểm tra code thực tế - 5 Phát hiện chí mạng
1. **Phân mảnh Schema Database (`auth` vs `public`)**:
   - `AuthService` cấu hình `modelBuilder.HasDefaultSchema("auth")` -> ghi vào `auth.users`, `auth.tenants`, `auth.memberships`.
   - `lang-api` cấu hình `DB_SCHEMA=public` -> đọc và ghi trực tiếp vào `public.users`, `public.tenants`, `public.memberships`.
   - *Hệ quả*: 2 service đang kết nối cùng database `lang-simulator` nhưng thao tác trên 2 schema độc lập, dễ dẫn đến mất đồng bộ dữ liệu người dùng.
2. **Endpoint `GET /auth/me` của `lang-api` vẫn đọc local database**:
   - Tại `apps/lang-api/src/auth/auth.service.ts` dòng 84-88: hàm `getMe` truy vấn `this.users.findOneBy({ id: userId })` từ bảng `public.users`.
   - *Hệ quả*: User đăng ký mới trên AuthService (`auth.users`) khi đăng nhập xong gọi `/auth/me` sẽ bị lỗi 401 do chưa có bản ghi trong `public.users`.
3. **Double Network Roundtrips không có Cache tại Route Guards**:
   - `JwtAuthGuard` gọi `POST /api/auth/introspect`.
   - `TenantGuard` ngay sau đó gọi tiếp `GET /api/auth/contexts`.
   - `IdentityProviderClient` không có cơ chế cache (In-memory/Redis), dẫn đến mỗi request tenant phải chịu 2 lần gọi HTTP nội bộ sang AuthService.
4. **Dual Write Path vẫn tồn tại ở ELearning**:
   - `AdminUsersService` và `MembershipsService` vẫn tự sinh mật khẩu, tự hash bcrypt cục bộ, và tự lưu TypeORM vào schema `public`.
5. **AuthService chưa xây dựng `TenantsController` và `MembershipsController`**:
   - Thư mục `IELTSMaster.AuthService/Controllers/` mới chỉ có `AuthController`, `UsersController`, `RolesController`, `MenusController`, `SystemGroupsController`, `AuditLogsController`.
   - Cần bổ sung 2 controller này trên AuthService trước khi chuyển đổi write path của `lang-api`.

## 6. Kế hoạch và hướng xử lý tiếp theo
1. **Khắc phục ngay bug `getMe`**: Sửa `apps/lang-api/src/auth/auth.service.ts` để `getMe` gọi `this.identity.me` hoặc trích xuất từ `authContext` của `JwtAuthGuard`.
2. **Hợp nhất Schema Database**: Chuyển các bảng `public.users`, `public.tenants`, `public.memberships` thành PostgreSQL Views trỏ sang schema `auth` để các module của `lang-api` đọc được dữ liệu thật.
3. **Bổ sung Caching trong `IdentityProviderClient`**: Áp dụng in-memory cache TTL 30-60 giây cho các hàm `introspect` và `contexts`.
4. **Viết `TenantsController` và `MembershipsController` trên AuthService**: Bổ sung đầy đủ REST API trong AuthService cho Phase 3.
