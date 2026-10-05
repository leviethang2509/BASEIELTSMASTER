# LỊCH SỬ CÔNG VIỆC: TRIỂN KHAI EF CORE CODE-FIRST VỚI CƠ CHẾ TỰ ĐỘNG PHÁT HIỆN THAY ĐỔI VÀ UPDATE CƠ SỞ DỮ LIỆU

## 1. Nội dung công việc
* **Nhiệm vụ:**
  1. Triển khai **Phương án 1 (Entity Framework Core Code-First)** cho toàn bộ hệ thống (`IELTSMaster.AuthService` và `IELTSMaster.BusinessService`) trên hệ quản trị CSDL **PostgreSQL** (`lang-simulator`).
  2. Thiết lập cơ chế **tự động phát hiện (Auto-diff) mọi thay đổi trên toàn bộ các bảng/Entity** mà lập trình viên **không cần phải khai báo, liệt kê hay gõ lệnh thêm/sửa bảng thủ công**.
  3. Cung cấp 2 cơ chế tự động hóa:
     * **Cơ chế 1 - Tự động đồng bộ bằng Script 1-Click (`scripts/sync-database.ps1`)**: Tự động so sánh code C# với CSDL, nếu có thay đổi (thêm bảng, thêm cột, sửa kiểu dữ liệu, index, quan hệ...) sẽ tự động sinh migration và update thẳng vào PostgreSQL; nếu không có thay đổi sẽ tự động hủy migration rỗng.
     * **Cơ chế 2 - Tự động đồng bộ khi khởi động ứng dụng (Runtime Auto-Migration)**: Cấu hình `await db.Database.MigrateAsync()` trong `Program.cs` của từng microservice để tự động cập nhật CSDL ngay khi chạy ứng dụng (F5 / `dotnet run`).
  4. Đánh dấu Baseline Migration cho các bảng đã tồn tại sẵn trong schemas `auth` và `business` để tránh xung đột khi áp dụng migration.
  5. Kiểm thử thực tế bằng việc thêm trường `thumbnail_url` vào Entity `Course` và kiểm tra CSDL PostgreSQL.

## 2. Thời gian thực hiện
* **Thời gian:** 21:45 - 21:56, Ngày 03/10/2026.

## 3. Các file đã thay đổi / tạo mới

### A. Công cụ và cấu hình gói
1. `dotnet-tools.json`: Đã cài đặt công cụ CLI `dotnet-ef` phiên bản 10.0.12 cấp giải pháp.
2. `IELTSMaster.AuthService/IELTSMaster.AuthService.csproj` (Chỉnh sửa): Bổ sung package `Microsoft.EntityFrameworkCore.Design` (8.0.11) để kích hoạt công cụ migration.

### B. Cấu hình Runtime Auto-Migration
3. `IELTSMaster.AuthService/Program.cs` (Chỉnh sửa): Bổ sung khối lệnh khởi tạo `await db.Database.MigrateAsync()` trước `app.Run()`.
4. `IELTSMaster.BusinessService/Program.cs` (Chỉnh sửa): Bổ sung khối lệnh khởi tạo `await db.Database.MigrateAsync()` trước `app.Run()`.

### C. Khởi tạo Baseline Migrations
5. `IELTSMaster.AuthService/Migrations/20261003144735_Initial_Auth_Schema.cs` (Tạo mới): Snapshot khởi tạo cấu trúc 6 bảng của schema `auth`.
6. `IELTSMaster.BusinessService/Migrations/20261003144801_Initial_Business_Schema.cs` (Tạo mới): Snapshot khởi tạo cấu trúc các bảng của schema `business`.
7. `Database/PostgreSql/02_baseline_ef_migrations.sql` (Tạo mới): Script PostgreSQL khởi tạo bảng `__EFMigrationsHistory` và đánh dấu 2 migration ban đầu đã áp dụng (tránh lỗi `table already exists`).

### D. Script tự động hóa 1-Click
8. `scripts/sync-database.ps1` (Tạo mới): Script PowerShell tự động quét toàn bộ DbContext của các dịch vụ, auto-diff thay đổi, tự sinh migration và tự update CSDL PostgreSQL. Hỗ trợ chạy toàn bộ hoặc từng dịch vụ riêng biệt.

### E. Kiểm thử thực tế (Test Feature)
9. `IELTSMaster.BusinessService/Entities/Course.cs` (Chỉnh sửa): Bổ sung thuộc tính `ThumbnailUrl`.
10. `IELTSMaster.BusinessService/Infrastructure/Data/BusinessDbContext.cs` (Chỉnh sửa): Ánh xạ `thumbnail_url` (varchar 1024).
11. `IELTSMaster.BusinessService/Migrations/20261003145455_AutoSync_20261003_215444.cs` (Tự động sinh): Migration do script tự động phát hiện và sinh ra.

## 4. Lý do thay đổi
* Người dùng yêu cầu sử dụng Code-First (Phương án 1) nhưng mong muốn trải nghiệm phát triển tối ưu: mỗi lần có thay đổi trong Entity C#, hệ thống phải tự động kiểm tra hết tất cả các bảng và tự động cập nhật vào CSDL, không bắt lập trình viên phải nhớ bảng nào thay đổi hoặc gõ lệnh thêm bảng thủ công.
* Tuân thủ quy tắc làm việc trong `rule.md`.

## 5. Cách xử lý
1. **Kích hoạt EF Core Tools & Design Packages**: Cài đặt `dotnet-ef` vào local tool manifest và thêm `Microsoft.EntityFrameworkCore.Design` vào các project microservice.
2. **Khởi tạo Baseline Migration**: Sinh migration ban đầu cho `AuthService` và `BusinessService`, sau đó chèn vào `__EFMigrationsHistory` trên PostgreSQL `lang-simulator` để làm mốc đối soát gốc.
3. **Thêm cơ chế Auto-Migrate khi App khởi động**: Gọi `db.Database.MigrateAsync()` trong `Program.cs`. Khi chạy ứng dụng ở môi trường phát triển, mọi migration chưa áp dụng sẽ tự động được chạy.
4. **Phát triển Script `sync-database.ps1`**:
   * Tự động gọi `dotnet-ef migrations add`.
   * Kiểm tra file migration sinh ra: Nếu phương thức `Up()` trống (không có `migrationBuilder`), tự động xóa migration rỗng và thông báo "Không có thay đổi".
   * Nếu phương thức `Up()` có lệnh thay đổi (thêm bảng, cột, khóa...), tự động chạy `dotnet-ef database update` để đẩy thay đổi vào PostgreSQL.
   * Định dạng UTF-8 with BOM để script hoạt động mượt mà trên Windows PowerShell 5.1 và PowerShell 7.
5. **Kiểm thử thực tế**:
   * Kiểm thử 1: Chạy script khi chưa có thay đổi -> Báo "Không có thay đổi", CSDL ở trạng thái mới nhất.
   * Kiểm thử 2: Thêm trường `ThumbnailUrl` vào `Course.cs` -> Chạy script -> Script tự động phát hiện thay đổi trên bảng `courses`, sinh migration `20261003145455_AutoSync_20261003_215444`, tự động chạy update vào schema `business`.
   * Kiểm thử 3: Truy vấn trực tiếp PostgreSQL `\d business.courses` -> Cột `thumbnail_url character varying(1024)` đã xuất hiện trong bảng.
   * Kiểm thử 4: Chạy lại script -> Xác nhận nhận diện không còn thay đổi tồn đọng, hệ thống hoàn toàn đồng bộ.

## 6. Kết quả sau khi thực hiện
* **Tự động hóa hoàn toàn**: Lập trình viên chỉ cần chỉnh sửa Entity trong C# (thêm property, thêm bảng, sửa kiểu dữ liệu...), sau đó chỉ cần chạy `.\scripts\sync-database.ps1` hoặc chạy ứng dụng (`dotnet run`). Hệ thống sẽ tự động đối soát toàn bộ thay đổi và cập nhật vào PostgreSQL.
* **Không cần gõ SQL thủ công**: Không cần viết `ALTER TABLE`, không cần nhớ liệt kê bảng nào bị sửa.
* **Cấu trúc phân tách schemas an toàn**:
  * `auth` schema: do `AuthDbContext` quản lý.
  * `business` schema: do `BusinessDbContext` quản lý.
* **Trạng thái PostgreSQL**: Bảng `business.courses` đã được cập nhật thêm cột `thumbnail_url` thành công.
* **Tuân thủ quy tắc `rule.md`**: Đã thực hiện đầy đủ 5 bước và lưu lại lịch sử chi tiết.
