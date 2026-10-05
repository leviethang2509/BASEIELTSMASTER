# LỊCH SỬ CÔNG VIỆC: CHUẨN HÓA TOÀN DIỆN CODE-FIRST VÀ THIẾT LẬP LỆNH UPDATE DATABASE ĐỘC LẬP TỪNG SERVICE THEO SCHEMA

## 1. Nội dung công việc
* **Nhiệm vụ:**
  1. Chuẩn hóa 100% quy trình cập nhật CSDL theo hướng **Code-First** (Entity Framework Core) cho toàn bộ hệ thống.
  2. Cách ly tuyệt đối bảng lịch sử migration: Cấu hình bảng `__EFMigrationsHistory` nằm độc lập trong từng schema tương ứng (`auth."__EFMigrationsHistory"` cho `AuthService` và `business."__EFMigrationsHistory"` cho `BusinessService`), không còn dùng chung bảng tại schema `public`.
  3. Cung cấp bộ công cụ và lệnh cập nhật **riêng biệt ngay trong từng thư mục của mỗi service**:
     * `UPDATE DB COMMAND.txt`: Bản hướng dẫn chi tiết toàn bộ cú pháp Code-First (.NET CLI, Visual Studio Package Manager Console, PowerShell).
     * `update_db.ps1`: Script PowerShell cập nhật cục bộ cho service.
     * `UPDATE_DB.bat`: File Batch 1-click tiện dụng cho lập trình viên trên Windows, chỉ cần double-click là tự động sinh migration và update đúng schema của service đó.

## 2. Thời gian thực hiện
* **Thời gian:** 22:04 - 22:09, Ngày 03/10/2026.

## 3. Các file đã thay đổi / tạo mới

### A. Tách biệt bảng lịch sử Migration theo Schema
1. `Database/PostgreSql/03_isolate_migrations_history_per_schema.sql` (Tạo mới): Tạo bảng `auth."__EFMigrationsHistory"` và `business."__EFMigrationsHistory"`, lưu vết baseline migration độc lập cho từng schema.
2. `IELTSMaster.AuthService/Program.cs` (Chỉnh sửa): Cấu hình `npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "auth")`.
3. `IELTSMaster.BusinessService/Program.cs` (Chỉnh sửa): Cấu hình `npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "business")`.

### B. Bộ công cụ cập nhật riêng biệt cho AuthService (Schema: auth)
4. `IELTSMaster.AuthService/UPDATE DB COMMAND.txt` (Cập nhật): Chuẩn hóa tập trung 100% vào các cú pháp Code-First cho schema `auth`.
5. `IELTSMaster.AuthService/update_db.ps1` (Tạo mới): Script PowerShell cập nhật riêng cho `AuthService`.
6. `IELTSMaster.AuthService/UPDATE_DB.bat` (Tạo mới): File batch 1-click cho lập trình viên chạy cập nhật `AuthService`.

### C. Bộ công cụ cập nhật riêng biệt cho BusinessService (Schema: business)
7. `IELTSMaster.BusinessService/UPDATE DB COMMAND.txt` (Cập nhật): Chuẩn hóa tập trung 100% vào các cú pháp Code-First cho schema `business`.
8. `IELTSMaster.BusinessService/update_db.ps1` (Tạo mới): Script PowerShell cập nhật riêng cho `BusinessService`.
9. `IELTSMaster.BusinessService/UPDATE_DB.bat` (Tạo mới): File batch 1-click cho lập trình viên chạy cập nhật `BusinessService`.

## 4. Lý do thay đổi
* Người dùng yêu cầu quy trình làm việc chuẩn **Code-First**, và mỗi service phải có lệnh cập nhật riêng biệt tương ứng với schema đã phân chia để tránh ảnh hưởng chéo giữa các service.
* Tuân thủ quy tắc làm việc trong `rule.md`.

## 5. Cách xử lý
1. **Cô lập hoàn toàn EF Core Migrations**: Sử dụng `npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "<schema>")` trong `Program.cs`. Nhờ đó, cả `AuthService` và `BusinessService` đều có snapshot và lịch sử di chuyển tách biệt 100%, không bao giờ tranh chấp hay gây xung đột.
2. **Xây dựng công cụ cập nhật nội bộ cho từng Service**:
   * Đặt file `UPDATE DB COMMAND.txt`, `update_db.ps1` và `UPDATE_DB.bat` ngay trong thư mục của từng project.
   * Lập trình viên phát triển `AuthService`: Chỉ cần double-click `IELTSMaster.AuthService/UPDATE_DB.bat`.
   * Lập trình viên phát triển `BusinessService`: Chỉ cần double-click `IELTSMaster.BusinessService/UPDATE_DB.bat`.
3. **Kiểm thử biên dịch và thực thi**:
   * Biên dịch: Cả 2 service build thành công với 0 Errors.
   * Kiểm thử lệnh cập nhật riêng: Chạy `.\IELTSMaster.BusinessService\update_db.ps1`, xác nhận script chỉ quét và tác động duy nhất vào `BusinessService` và schema `business`.

## 6. Kết quả sau khi thực hiện
* **Chuẩn hóa Code-First**: Toàn bộ luồng phát triển tuân thủ mô hình Code-First chuẩn của .NET 8 / EF Core.
* **Độc lập và an toàn tuyệt đối**:
  * `AuthService` $\leftrightarrow$ Schema `auth` $\leftrightarrow$ Bảng `auth."__EFMigrationsHistory"`.
  * `BusinessService` $\leftrightarrow$ Schema `business` $\leftrightarrow$ Bảng `business."__EFMigrationsHistory"`.
* **Tiện ích tối đa cho lập trình viên**: Có cả file hướng dẫn chi tiết (`UPDATE DB COMMAND.txt`) và file thực thi 1-Click (`UPDATE_DB.bat` / `update_db.ps1`) tại từng thư mục service.
* **Tuân thủ quy tắc `rule.md`**: Thực hiện đủ 5 bước và đã lưu lịch sử vào `WORKHISTORY`.
