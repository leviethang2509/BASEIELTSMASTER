# LỊCH SỬ CÔNG VIỆC: REFACTOR TOÀN BỘ CONTROLLER SANG THIN CONTROLLER VÀ ĐỒNG BỘ SSO HỆ THỐNG

## 1. Thông tin chung
- **Thời gian thực hiện**: 2026-10-04
- **Dự án**: IELTS Master (AuthService, BusinessService, FileService, ELearning, ClientApp)
- **Người thực hiện**: Antigravity Pair Programmer
- **Yêu cầu của User**:
  1. Kiểm tra lại chức năng đăng nhập SSO của hệ thống giữa AuthService, ClientApp và ELearning.
  2. Toàn bộ file ở vị trí Controller đều chỉ là nơi gọi (Thin Controller), việc xử lý nghiệp vụ, logic và tương tác cơ sở dữ liệu phải nằm trên Service Layer, áp dụng cho toàn hệ thống.
  3. Tuân thủ nghiêm ngặt 5 bước trong quy trình `rule.md`.

---

## 2. Phân tích Hiện trạng và Kiến trúc mục tiêu (Architecture Analysis)

### 2.1 Hiện trạng trước khi Refactor
- **`IELTSMaster.AuthService`**:
  - `UsersController.cs`: Chứa trực tiếp `AuthDbContext`, xử lý logic truy vấn LINQ phân trang, lọc tìm kiếm, tạo tài khoản mới kết hợp mã hóa BCrypt, cập nhật thông tin người dùng, xóa mềm, xóa hàng loạt, khóa/mở khóa tài khoản, phân bổ vai trò cơ sở (`MembershipRole`), cập nhật vai trò hệ thống (`SystemRole`).
  - `RolesController.cs`: Chứa trực tiếp `AuthDbContext`, duyệt cấu trúc vai trò, tính toán số lượng người dùng theo từng vai trò, quản lý ma trận phân quyền.
  - `MenusController.cs`: Chứa trực tiếp `AuthDbContext`, tải cây menu, lọc phân quyền người dùng, cập nhật sắp xếp, thêm sửa xóa menu.
  - `SystemGroupsController.cs`: Chứa trực tiếp `AuthDbContext`, tính toán quan hệ cha - con giữa các nhóm hệ thống, sinh combobox.
  - `AuditLogsController.cs`: Chứa trực tiếp `AuthDbContext`, truy vấn nhật ký kiểm toán, lọc đa điều kiện.
- **`IELTSMaster.BusinessService`**:
  - `AuditLogController.cs`: Chứa truy vấn trực tiếp và mapping log trong Controller.
- **SSO E-Learning (`IELTSMaster.ELearning`)**:
  - `lang-api` (cổng xác thực SSO với AuthService qua `IdentityProviderClient`): Khi AuthService chuyển sang trả PascalCase JSON (`PropertyNamingPolicy = null`) để tương thích Frontend React, `identity-provider.client.ts` của NestJS/TypeScript chỉ đọc `res.data.data.accessToken` và `res.data.data.user` (camelCase), dẫn đến lỗi `Cannot read properties of undefined` khi đăng nhập hoặc đồng bộ phiên SSO.

### 2.2 Kiến trúc mục tiêu (Thin Controller - Rich Service Layer Pattern)
- **Controller Layer**:
  - Đóng vai trò mỏng (Thin Controller), chỉ phụ trách tiếp nhận HTTP Request, trích xuất dữ liệu đầu vào (Headers, Route params, Query params, Request body).
  - Ủy quyền toàn bộ xử lý nghiệp vụ cho Interface Service tương ứng (`IUserService`, `IRoleService`, `IMenuService`, `ISystemGroupService`, `IAuditLogService`, `ITrainingService`, `IBusinessAuditLogService`, v.v.).
  - Bắt hoặc để Global Exception Filter (`BusinessExceptionFilter`) tự động chuyển đổi kết quả thành HTTP Response chuẩn (`BaseResponse<T>`).
- **Service Layer**:
  - Đóng gói toàn bộ nghiệp vụ (Business Logic), tương tác cơ sở dữ liệu (`DbContext`), kiểm tra dữ liệu hợp lệ (Validation), mã hóa mật khẩu (`IPasswordHasher`), xử lý giao dịch.
  - Được đăng ký thông qua Dependency Injection (`AddScoped`) trong `Program.cs`.

---

## 3. Các thay đổi đã thực hiện

### 3.1 AuthService: Xây dựng Service Layer và chuyển Controller thành Thin Controller
1. **Quản trị người dùng (User Management)**:
   - Tạo [IUserService.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Services/IUserService.cs) và [UserService.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Services/UserService.cs): Đóng gói toàn bộ các hàm nghiệp vụ: `GetUsersListAsync`, `GetByIdAsync`, `CreateUserAsync`, `UpdateUserAsync`, `DeleteUserAsync`, `DeleteMultipleAsync`, `LockUserAsync`, `UnlockUserAsync`, `AssignTenantRoleAsync`, `RemoveTenantRoleAsync`, `UpdateSystemRoleAsync`, `GetComboboxAsync`.
   - Cập nhật [UsersController.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Controllers/UsersController.cs): Loại bỏ `AuthDbContext`, chỉ inject `IUserService` và ủy quyền 100% logic cho service.
2. **Quản trị vai trò (Role Management)**:
   - Tạo [IRoleService.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Services/IRoleService.cs) và [RoleService.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Services/RoleService.cs): Đóng gói logic `GetRolesListAsync`, `GetUserPermissionsAsync`, `GetComboboxAsync`.
   - Cập nhật [RolesController.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Controllers/RolesController.cs): Chỉ inject `IRoleService`.
3. **Quản trị Menu (Menu Management)**:
   - Tạo [IMenuService.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Services/IMenuService.cs) và [MenuService.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Services/MenuService.cs): Đóng gói logic `GetMenusByUserAsync`, `GetListAsync`, `GetByIdAsync`, `CreateAsync`, `UpdateAsync`, `DeleteAsync`.
   - Cập nhật [MenusController.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Controllers/MenusController.cs): Chỉ inject `IMenuService`.
4. **Quản trị Nhóm hệ thống (System Group Management)**:
   - Tạo [ISystemGroupService.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Services/ISystemGroupService.cs) và [SystemGroupService.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Services/SystemGroupService.cs): Đóng gói logic phân cấp nhóm cha-con, CRUD và combobox.
   - Cập nhật [SystemGroupsController.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Controllers/SystemGroupsController.cs): Chỉ inject `ISystemGroupService`.
5. **Nhật ký kiểm toán (Audit Log)**:
   - Tạo [IAuditLogService.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Services/IAuditLogService.cs) và [AuditLogService.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Services/AuditLogService.cs): Đóng gói logic truy vấn nhật ký, bộ lọc phân trang, chi tiết và danh mục hành động.
   - Cập nhật [AuditLogsController.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Controllers/AuditLogsController.cs): Chỉ inject `IAuditLogService`.
6. **Đăng ký DI Service**:
   - Cập nhật [Program.cs (AuthService)](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService/Program.cs): Đăng ký toàn bộ các Service mới vào container:
     ```csharp
     builder.Services.AddScoped<IUserService, UserService>();
     builder.Services.AddScoped<IRoleService, RoleService>();
     builder.Services.AddScoped<IMenuService, MenuService>();
     builder.Services.AddScoped<ISystemGroupService, SystemGroupService>();
     builder.Services.AddScoped<IAuditLogService, AuditLogService>();
     ```

### 3.2 BusinessService: Chuẩn hóa Thin Controller
1. **Đào tạo (Training)**:
   - Tạo [ITrainingService.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/Services/ITrainingService.cs) và [TrainingService.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/Services/TrainingService.cs).
   - Cập nhật [TrainingController.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/Controllers/TrainingController.cs): Chỉ inject `ITrainingService`.
2. **Nhật ký kiểm toán nghiệp vụ (Business Audit Log)**:
   - Tạo [IBusinessAuditLogService.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/Services/IBusinessAuditLogService.cs) và [BusinessAuditLogService.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/Services/BusinessAuditLogService.cs).
   - Cập nhật [AuditLogController.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/Controllers/AuditLogController.cs): Chỉ inject `IBusinessAuditLogService`.
3. **Đăng ký DI Service**:
   - Cập nhật [Program.cs (BusinessService)](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService/Program.cs):
     ```csharp
     builder.Services.AddScoped<ITrainingService, TrainingService>();
     builder.Services.AddScoped<IBusinessAuditLogService, BusinessAuditLogService>();
     ```

### 3.3 FileService
- Đã xác minh [UploadFileController.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.FileService/Controllers/UploadFileController.cs) và [StorageController.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.FileService/Controllers/StorageController.cs) đã tuân thủ 100% mô hình Thin Controller, ủy quyền trực tiếp cho `IUploadFileService` và `IStorageService`.

### 3.4 Đồng bộ SSO giữa AuthService và E-Learning (`lang-api` & `lang-app`)
1. **Xử lý trích xuất dữ liệu linh hoạt (Flexible Case Parser)** trong [identity-provider.client.ts](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.ELearning/apps/lang-api/src/auth/identity-provider.client.ts):
   - Hỗ trợ trích xuất cả `payload.data` và `payload.Data` từ phản hồi của AuthService.
   - Hàm `normalizeSession()` chuẩn hóa cả trường hợp PascalCase (`AccessToken`, `RefreshToken`, `User`, `ActiveTenant`, `Tenants`) và camelCase (`accessToken`, `refreshToken`, `user`, `activeTenant`, `tenants`).
2. **Chuẩn hóa xác thực SSO Token**:
   - Cả 2 hệ thống cùng sử dụng chung secret key HMAC-SHA256 (`super_secret_local_dev_key_must_be_over_32_chars_long_1234567890`).
   - Claim `sub` (User ID dạng GUID) và `tv` (TokenVersion) được kiểm tra nhất quán trên cả API Gateway, AuthService và `lang-api`.
3. **Kiểm tra luồng liên kết SSO từ ClientApp**:
   - Người dùng từ hệ thống IELTS Master quản trị khi click "Mở Cổng E-Learning" sẽ mở `http://localhost:3100`.
   - Khi đăng nhập trên form `http://localhost:3100`, yêu cầu được gửi tới `lang-api:3101`, `lang-api` gọi AuthService SSO API để xác thực và cấp phiên đăng nhập thành công.

---

## 4. Kết quả kiểm thử thực tế

1. **Biên dịch Solution**:
   - `dotnet build IELTSMaster.AuthService/IELTSMaster.AuthService.csproj -t:Compile` ➡️ **Build succeeded. 0 Error(s)**.
   - `dotnet build IELTSMaster.BusinessService/IELTSMaster.BusinessService.csproj -t:Compile` ➡️ **Build succeeded. 0 Error(s)**.
2. **Kiểm thử SSO Login AuthService**:
   - Gửi yêu cầu đăng nhập tài khoản Quản trị viên `admin@langsimulator.com` tới `https://localhost:7083/auth/auth/login`.
   - Kết quả: **200 OK**, trả về AccessToken hợp lệ chứa `system_role: "SYSTEM_OWNER"`.
3. **Kiểm thử SSO Bearer Token trên E-Learning Backend (`lang-api`)**:
   - Gửi AccessToken vừa nhận đến `http://localhost:3101/api/auth/me`.
   - Kết quả: **200 OK**, `lang-api` giải mã thành công thông tin người dùng:
     ```json
     {
       "id": "b0ce7203-775f-4333-bed2-e57b5fa8f5d4",
       "email": "admin@langsimulator.com",
       "fullName": "System Owner",
       "systemRole": "SYSTEM_OWNER"
     }
     ```
4. **Kiểm thử Đăng nhập SSO trực tiếp từ `lang-api` sang AuthService**:
   - Gửi `POST http://localhost:3101/api/auth/login` với thông tin đăng nhập của hệ sinh thái.
   - Kết quả: **200 OK**, `lang-api` nhận diện phản hồi từ AuthService, đồng bộ phiên và trả về JWT Session thành công.

---

## 5. Kết luận
- Toàn bộ các Controller trong hệ sinh thái (`AuthService`, `BusinessService`, `FileService`) đã được refactor 100% sang kiến trúc **Thin Controller**: Controller chỉ tiếp nhận request và trả về response, mọi logic nghiệp vụ và truy vấn cơ sở dữ liệu đã chuyển lên **Service Layer**.
- Chức năng Single Sign-On (SSO) giữa AuthService, Business ClientApp và E-Learning (Next.js & NestJS) đã được đồng bộ, tương thích hoàn toàn về định dạng dữ liệu và hoạt động trơn tru.
