# LỊCH SỬ CÔNG VIỆC: KHẢO SÁT VÀ ĐÁNH GIÁ TOÀN DIỆN VAI TRÒ DỰ ÁN IELTSMASTER.SYSTEMSERVICE

## 1. Nội dung công việc
* **Nhiệm vụ:**
  - Khảo sát và đánh giá toàn diện vai trò, tác dụng, cơ sở dữ liệu và mã nguồn của dự án `IELTSMaster.SystemService`.
  - Phân tích mối quan hệ giữa `SystemService` với các dịch vụ khác (`AuthService`, `FileService`, `ApiGateway`, `Web`).
  - Chỉ rõ các chức năng mà `SystemService` đang gánh vác, điểm mạnh và điểm chồng chéo kiến trúc hiện tại.
  - Tuân thủ quy định `rule.md` trong việc khảo sát, lập tài liệu và trao đổi với người dùng.

## 2. Thời gian thực hiện
* **Thời gian:** 23:20 - 23:25, Ngày 03/10/2026.

## 3. Các file khảo sát chi tiết
1. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.SystemService\IELTSMaster.SystemService.csproj`
2. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.SystemService\Program.cs`
3. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.SystemService\Configs\ConfigService.cs`
4. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.SystemService\appsettings.Development.json`
5. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.SystemService\Controllers\`:
   - `AuditLogController.cs`
   - `MenuController.cs`
   - `RoleController.cs`
   - `SystemGroupController.cs`
   - `UserController.cs`
   - `AuthController.cs`
6. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.SystemService\Entities\`:
   - `AuditLog.cs`, `Menu.cs`, `Role.cs`, `Permission.cs`, `SystemGroup.cs`, `User.cs`, `RefreshToken.cs`
7. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.Web\src\config\constants.ts`

## 4. Kết quả phân tích chi tiết

### 4.1. Tác dụng chính của IELTSMaster.SystemService
`IELTSMaster.SystemService` đóng vai trò là **Dịch vụ Quản trị Hệ thống và Cấu hình Nền tảng (System Administration & Foundation Service)**:
1. **Quản lý Menu điều hướng (Menu Management - `MenuController`):**
   - Quản lý cây phân cấp Menu trên giao diện người dùng (menu cha, con, URL, Icon, thứ tự sắp xếp).
   - Kiểm tra và trả về danh sách menu được phép hiển thị tương ứng với từng User theo quyền hạn.
2. **Quản lý Cơ cấu tổ chức & Nhóm người dùng (System Group - `SystemGroupController`):**
   - Quản lý cây phòng ban, đơn vị, nhóm quản trị viên.
3. **Quản lý Vai trò & Ma trận Phân quyền (Role & Permission - `RoleController`):**
   - Quản lý danh sách Role (vai trò), gán quyền chi tiết (`Permission`: Create, Read, Update, Delete) cho từng tính năng.
4. **Nhật ký kiểm toán hệ thống (Audit Log - `AuditLogController` & `AuditGrpcService`):**
   - Tự động ghi lại toàn bộ lịch sử thao tác của người dùng (Ai thực hiện, hành động gì, trên bản ghi nào, IP, thời gian, kết quả thành công hay thất bại).
   - Cung cấp gRPC Server (`AuditGrpcService`) cho các service khác gọi sang để ghi log tập trung.
5. **Quản lý Tài khoản người dùng (User Management - `UserController`):**
   - Danh sách tài khoản quản trị, kích hoạt/khóa tài khoản, đặt lại mật khẩu.

### 4.2. Hiện trạng Cơ sở dữ liệu của SystemService
- Đang kết nối tới **SQL Server** (`Server=localhost\\SQLEXPRESS;Database=IELTSMASTER`).
- Quản lý 8 bảng: `audit_log`, `menus`, `permissions`, `refresh_tokens`, `roles`, `system_groups`, `users`.

### 4.3. Phát hiện điểm chồng chéo kiến trúc (Overlap)
- Trong `SystemService` vẫn còn tồn tại `AuthController` và bảng `Users`, `RefreshTokens` (kế thừa từ template cũ `AUN_QA`).
- Trong khi đó, dự án đã xây dựng `IELTSMaster.AuthService` chạy trên **PostgreSQL (`lang-simulator`, schema `auth`)** với cơ chế Multi-tenant RBAC hiện đại, bảo mật Bcrypt 12 rounds và JWT Token đa trung tâm.
- Trên Frontend `IELTSMaster.Web`, cấu hình `API_ENDPOINTS.System` vẫn đang trỏ về `SystemService`.

## 5. Kết luận & Đề xuất định hướng
- `IELTSMaster.SystemService` là thành phần **rất quan trọng hiện tại** vì Frontend Web đang phụ thuộc trực tiếp vào nó để lấy Menu, Phân quyền, User, AuditLog.
- **Không được xóa bỏ `SystemService`** ở thời điểm này vì giao diện Admin Web sẽ mất toàn bộ menu và phân quyền.
- **Lộ trình tương lai:** 
  + Giữ lại các chức năng Quản trị nền tảng: Menu, Phân quyền chi tiết, Cơ cấu tổ chức, Audit Log.
  + Chuyển dần phần Xác thực (Login/Register/Token) sang dùng triệt để `AuthService` (PostgreSQL) để thống nhất 1 nơi quản lý User duy nhất.
