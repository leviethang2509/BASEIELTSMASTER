# LỊCH SỬ CÔNG VIỆC: BỔ SUNG LAYOUT HIỂN THỊ VAI TRÒ, THÔNG TIN TÀI KHOẢN VÀ GIAO DIỆN PHÂN QUYỀN KẾT NỐI AUTHMIGRATION/AUTSERVICE

## 1. Thông tin chung
- **Thời gian thực hiện:** 04/10/2026.
- **Người thực hiện:** Antigravity AI Assistant.
- **Dự án liên quan:**
  - `IELTSMaster.BusinessService` (`ClientApp` frontend)
  - `IELTSMaster.AuthService` (PostgreSQL Auth Service backend)
  - `IELTSMaster.ApiGateway` (Yarp Reverse Proxy)
  - `IELTSMaster.Shared`

---

## 2. Vấn đề và Yêu cầu đặt ra

1. **Sự cố khóa file build DLL (MSB3026):**
   - Người dùng thông báo lỗi khi build trong Visual Studio:
     ```text
     Could not copy "C:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.Shared\bin\Debug\net8.0\IELTSMaster.Shared.dll" to "bin\Debug\net8.0\IELTSMaster.Shared.dll". Exceeded retry count of 10. Failed. The file is locked by: "IELTSMaster.AuthService (56336)"
     ```
   - **Nguyên nhân:** Tiến trình `IELTSMaster.AuthService` (PID 56336) đang chạy ngầm trên máy trạm và lock file `IELTSMaster.Shared.dll`.

2. **Yêu cầu nâng cấp giao diện & phân quyền:**
   - Trong `IELTSMaster.BusinessService` (`ClientApp`):
     - Bổ sung vào Layout khu vực hiển thị vai trò người dùng đăng nhập một cách trực quan, nổi bật.
     - Cung cấp giao diện xem "Thông tin tài khoản" (Account Info Modal/Popup) gồm: thông tin cá nhân, vai trò hệ thống, cơ sở/trung tâm trực thuộc và trạng thái liên thông E-Learning.
     - Xây dựng giao diện Phân quyền & Vai trò (`/role`) kết nối trực tiếp với backend `IELTSMaster.AuthService` (schema `auth` trên PostgreSQL).

---

## 3. Các File đã tạo mới và chỉnh sửa

### 3.1. Backend `IELTSMaster.AuthService`
1. **[RolePermissionDtos.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/DTOs/RolePermissionDtos.cs)** *(Mới)*:
   - Định nghĩa DTOs cho Vai trò (`SystemRoleInfoDto`), Ma trận quyền hạn (`PermissionCategoryDto`, `PermissionMatrixItemDto`), và Quản lý người dùng (`UserManagementDto`, `UpdateSystemRoleRequest`, `AssignTenantRoleRequest`).
2. **[RolesController.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Controllers/RolesController.cs)** *(Mới)*:
   - `GET /api/roles`: Trả về danh sách vai trò trong hệ thống (`SYSTEM_OWNER`, `SYSTEM_ADMIN`, `TENANT_OWNER`, `CENTER_MANAGER`, `TEACHER`, `STUDENT`).
   - `GET /api/roles/matrix`: Trả về toàn bộ ma trận phân quyền chi tiết của từng vai trò theo từng phân hệ chức năng (Quản trị hệ thống, Trung tâm/Cơ sở, Học vụ, Tài chính, E-Learning, AI Engine).
   - `GET /api/roles/permissions`: Danh mục các quyền theo nhóm.
3. **[UsersController.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Controllers/UsersController.cs)** *(Mới)*:
   - `GET /api/users`: Lấy danh sách tài khoản từ bảng `auth.users` kèm vai trò hệ thống, danh sách cơ sở/tenant trực thuộc, và cờ liên thông E-learning.
   - `GET /api/users/{id}`: Chi tiết thông tin tài khoản.
   - `PUT /api/users/{id}/system-role`: Cập nhật vai trò hệ thống.
   - `POST /api/users/{id}/assign-role`: Gán vai trò tại một cơ sở/trung tâm cụ thể.

### 3.2. Cấu hình `IELTSMaster.ApiGateway`
1. **[appsettings.Development.json](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.ApiGateway/appsettings.Development.json)**:
   - Điều chỉnh cấu hình cluster `auth-cluster`: trỏ đến destination `http://localhost:5000/api` để Gateway chuyển tiếp các request `/auth/*` sang AuthService một cách thông suốt mà không xung đột port.

### 3.3. Frontend `IELTSMaster.BusinessService/ClientApp`
1. **[constants.ts](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/config/constants.ts)**:
   - Chuyển `API_ROUTES.ROLE` sang `/auth/roles` và `API_ROUTES.USER` sang `/auth/users`.
2. **[role-utils.ts](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/lib/role-utils.ts)** *(Mới)*:
   - Hàm tiện ích `getRoleBadgeInfo(role)` cung cấp nhãn tiếng Việt, màu sắc, biểu tượng cảm xúc (👑 Chủ sở hữu, 🛡️ Quản trị viên, 🏢 Giám đốc trung tâm, 🎓 Giảng viên, 📚 Học viên) và class CSS tương ứng.
3. **[user.types.ts](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/features/system/types/user.types.ts)** & **[role.types.ts](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/features/system/types/role.types.ts)** & **[auth.types.ts](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/features/system/types/auth.types.ts)**:
   - Bổ sung định nghĩa TypeScript cho `SystemRole`, `RoleScope`, `RoleCapabilityMatrix`, `UserManagementDto`.
4. **[AuthContext.tsx](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/contexts/AuthContext.tsx)**:
   - Làm giàu đối tượng User đăng nhập: lưu trữ `SystemRole`, `ActiveTenant`, `AvailableTenants`, trạng thái `Elearning`.
   - Cung cấp hàm `switchTenant(tenantId)` cho phép người dùng chuyển đổi ngữ cảnh cơ sở đang làm việc.
5. **[PopupAccountInfo.tsx](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/components/layout/MainLayout/PopupAccountInfo.tsx)** *(Mới)*:
   - Modal hiển thị thông tin tài khoản chuyên nghiệp chia làm 3 tab/khu vực:
     - **Thông tin cơ bản:** Email, Tên hiển thị, Mã tài khoản, Thời điểm tạo, Trạng thái kích hoạt.
     - **Vai trò & Cơ sở:** Vai trò hệ thống cấp cao nhất, các quyền hạn chính được phân bổ, danh sách các cơ sở được phân quyền quản lý.
     - **Tích hợp E-Learning:** Trạng thái tài khoản đồng bộ SSO với cổng E-Learning AI, vai trò trên E-Learning, liên kết chuyển nhanh sang E-Learning.
6. **[MainLayout.tsx](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/components/layout/MainLayout/MainLayout.tsx)**:
   - Bổ sung Badge vai trò người dùng (👑 `Chủ sở hữu hệ thống`) và Badge cơ sở hoạt động (`Cơ sở chính - Hà Nội`) trên thanh Header.
   - Thêm nút tắt mở `PopupAccountInfo` và xem Phân quyền ngay trên thanh công cụ Header và User Profile Dropdown.
7. **[NavUser.tsx](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/components/layout/MainLayout/NavUser.tsx)**:
   - Thể hiện vai trò ngay dưới tên người dùng trong menu Sidebar góc dưới, tích hợp trigger mở modal Thông tin tài khoản.
8. **[app-sidebar.tsx](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/components/layout/MainLayout/app-sidebar.tsx)**:
   - Bổ sung mục điều hướng "Phân quyền & Vai trò" (`/role`) và "Quản lý Người dùng" (`/user`) vào menu Cấu hình hệ thống.
9. **[role.api.ts](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/features/system/api/role.api.ts)**:
   - Triển khai các API call: `getRoles()`, `getMatrix()`, `getPermissions()`, `getUsers()`, `updateUserSystemRole()`, `assignTenantRole()`.
10. **[Role/index.tsx](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/ClientApp/src/features/system/routes/Role/index.tsx)**:
   - Xây dựng giao diện Phân quyền toàn diện với 3 Tab chức năng:
     - **Tab 1 - Ma trận Quyền hạn (Permission Matrix):** Bảng đối chiếu ma trận phân quyền giữa các vai trò hệ thống và các chức năng của toàn bộ giải pháp IELTS Master.
     - **Tab 2 - Phân quyền Người dùng (User Role Assignment):** Danh sách người dùng kết nối trực tiếp `auth.users`, cho phép xem vai trò hệ thống, cơ sở trực thuộc và sửa đổi quyền hạn.
     - **Tab 3 - Kiến trúc Phân quyền (RBAC Architecture):** Sơ đồ và tài liệu trực quan giải thích mô hình RBAC Đa tầng (Multi-tenant + System Level) và cơ chế SSO chia sẻ token với E-Learning.

---

## 4. Kiểm tra và Kết quả kiểm thử

1. **Giải phóng tiến trình khóa file:**
   - Đã kill tiến trình PID 56336 (`IELTSMaster.AuthService.exe`).
   - Chạy `dotnet build IELTSMaster.Shared/IELTSMaster.Shared.csproj` -> **Thành công (0 Error(s))**.
   - Chạy `dotnet build IELTSMaster.AuthService/IELTSMaster.AuthService.csproj` -> **Thành công (0 Error(s))**.
   - Chạy `dotnet build IELTSMaster.BusinessService/IELTSMaster.BusinessService.csproj` -> **Thành công (0 Error(s))**.
2. **Kiểm tra Frontend Build:**
   - Chạy `npm run build` trong `IELTSMaster.BusinessService/ClientApp` -> **Build thành công (TypeScript 0 error, Vite build 1.42s)**.
3. **Kiểm tra tương thích API:**
   - Kết nối giữa ClientApp -> ApiGateway -> AuthService hoạt động chính xác qua route `/auth/roles` và `/auth/users`.

---

## 5. Lưu ý cho nhà phát triển
- Khi sử dụng Visual Studio để build solution, nếu gặp lại lỗi MSB3026 (file locked), cần đảm bảo các tiến trình dịch vụ chạy nền trước đó đã được dừng (Stop Debugging hoặc đóng cửa sổ console dịch vụ).
- Backend AuthService lưu trữ người dùng và vai trò trong schema `auth` trên PostgreSQL (database `lang-simulator`), đồng bộ hoàn toàn với hệ thống E-Learning và BusinessService.
