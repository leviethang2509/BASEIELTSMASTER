# LỊCH SỬ CÔNG VIỆC: PHÂN TÍCH QUAN HỆ SYSTEMSERVICE VÀ AUTHSERVICE - ĐỊNH HƯỚNG LOẠI BỎ SYSTEMSERVICE

## 1. Nội dung công việc
* **Nhiệm vụ:**
  - Làm rõ nhận định của người dùng: "IELTSMaster.SystemService này đã có trên AuthService rồi mà".
  - Phân tích chi tiết sự trùng lặp và khác biệt giữa `IELTSMaster.SystemService` (SQL Server) và `IELTSMaster.AuthService` (PostgreSQL).
  - Khảo sát các điểm ràng buộc hiện tại của Frontend Web (`IELTSMaster.Web`) và `FileService` đối với `SystemService`.
  - Đề xuất giải pháp và lộ trình dỡ bỏ hoàn toàn `SystemService` nếu người dùng quyết định chỉ sử dụng `AuthService` + `BusinessService` trên PostgreSQL.

## 2. Thời gian thực hiện
* **Thời gian:** 23:22 - 23:26, Ngày 03/10/2026.

## 3. Các file khảo sát chi tiết
1. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.AuthService\Controllers\AuthController.cs`
2. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.AuthService\Entities\`: `User.cs`, `Tenant.cs`, `Membership.cs`, `MembershipRole.cs`
3. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.SystemService\Controllers\`: `AuthController.cs`, `UserController.cs`, `MenuController.cs`, `SystemGroupController.cs`, `AuditLogController.cs`
4. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.Web\src\Router.tsx`
5. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.Web\src\config\constants.ts`
6. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.AppHost\AppHost.cs`

## 4. Kết quả phân tích

### 4.1. Nhận định của người dùng là hoàn toàn chính xác về mặt Nghiệp vụ Quản trị User
- `IELTSMaster.AuthService` (PostgreSQL, schema `auth`) **đã bao hàm và vượt trội hơn hẳn** chức năng User/Auth của `SystemService`:
  + Quản lý người dùng (`users`).
  + Quản lý trung tâm/tổ chức đa đơn vị (`tenants` - thay thế cho `system_groups`).
  + Quản lý vai trò & thành viên (`memberships`, `membership_roles` - thay thế cho `roles`).
  + Cơ chế đăng nhập, băm mật khẩu Bcrypt 12 rounds, Refresh Token Rotation, Multi-tenant Switch.

### 4.2. Lý do SystemService vẫn còn trong Solution
1. `SystemService` là tàn dư từ template cũ `AUN_QA` kết nối SQL Server (`localhost\\SQLEXPRESS`).
2. Giao diện Frontend Web (`IELTSMaster.Web`) ban đầu được viết dựa trên `SystemService` với các trang: `/user`, `/role`, `/menu`, `/systemgroup`, `/auditlog`.
3. FileService có 1 filter nhỏ gửi log kiểm toán sang SystemService qua gRPC.

### 4.3. Đề xuất phương án thực hiện (Nếu muốn bỏ SystemService)
- **Phương án A (Khuyên dùng - Chuẩn hóa về PostgreSQL):**
  1. Chuyển cấu hình API của Frontend Web sang gọi `IELTSMaster.AuthService` (`/auth/login`, `/auth/register`).
  2. Với mô hình trung tâm mới của `lang-simulator`, cơ cấu tổ chức được quản lý bởi `tenants`, vai trò quản lý bởi `memberships`/`membership_roles`. Các trang Menu động cũ nếu không dùng đến có thể chuyển sang Menu tĩnh trên giao diện.
  3. Gỡ bỏ hoàn toàn `IELTSMaster.SystemService` khỏi Solution, không còn phụ thuộc vào SQL Server nữa (100% hệ thống chuyển sang PostgreSQL).
