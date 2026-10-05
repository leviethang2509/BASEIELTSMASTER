# LỊCH SỬ CÔNG VIỆC: TÁCH DATABASE SCHEMA TRÊN POSTGRESQL VÀ KHỞI TẠO BUSINESS SERVICE

## 1. Nội dung công việc
* **Nhiệm vụ:**
  1. Chuẩn hóa môi trường cơ sở dữ liệu về đúng **PostgreSQL** (`lang-simulator` trên `127.0.0.1:5432`) - hệ quản trị CSDL gốc tương thích 100% với `AuthService` và hệ sinh thái `lang-simulator`.
  2. Thực hiện tách biệt Database Schema trên cùng Database PostgreSQL `lang-simulator`:
     * **Schema `auth`**: Dành riêng cho `IELTSMaster.AuthService` (users, tenants, service_plans, memberships, membership_roles, refresh_tokens).
     * **Schema `business`**: Dành riêng cho `IELTSMaster.BusinessService` (classrooms, courses, curricula, exams, lessons, class_sessions, v.v. - 39 bảng).
     * **Schema `public`**: Tự động tạo các View tương thích ngược trỏ sang `auth.*` và `business.*` để các module NestJS/Next.js (`lang-api`, `lang-app`) không bị gãy khi gọi truy vấn.
  3. Khởi tạo microservice `IELTSMaster.BusinessService` chạy trên .NET 8.0, sử dụng `Npgsql.EntityFrameworkCore.PostgreSQL`, ánh xạ vào schema `business`.
  4. Cấu hình lại `IELTSMaster.AuthService` trỏ về PostgreSQL (`DatabaseProvider = PostgreSQL`).

## 2. Thời gian thực hiện
* **Thời gian:** 21:28 - 21:35, Ngày 03/10/2026.

## 3. Các file đã thay đổi / tạo mới

### A. Database Scripts PostgreSQL
1. `Database/PostgreSql/01_separate_schemas_auth_business.sql` (Tạo mới): Script PostgreSQL thực hiện tạo schema `auth`, `business`, di chuyển 6 bảng auth và 39 bảng nghiệp vụ sang các schema tương ứng; tạo toàn bộ Views trong `public` để bảo toàn tương thích ngược 100%.

### B. Microservice AuthService (PostgreSQL)
2. `IELTSMaster.AuthService/Infrastructure/Data/AuthDbContext.cs` (Chỉnh sửa): Ánh xạ schema `auth`, sử dụng hàm thời gian chuẩn PostgreSQL `now()`.
3. `IELTSMaster.AuthService/appsettings.json` & `appsettings.Development.json` (Chỉnh sửa): Cấu hình `DatabaseProvider: "PostgreSQL"` và chuỗi kết nối: `Host=127.0.0.1;Port=5432;Database=lang-simulator;Username=postgres`.

### C. Microservice BusinessService (PostgreSQL)
4. `IELTSMaster.BusinessService/IELTSMaster.BusinessService.csproj` (Chỉnh sửa): Bổ sung gói `Npgsql.EntityFrameworkCore.PostgreSQL`.
5. `IELTSMaster.BusinessService/Entities/Classroom.cs`, `Course.cs`, `Exam.cs` (Tạo mới): Các entity nghiệp vụ đào tạo ánh xạ vào bảng PostgreSQL.
6. `IELTSMaster.BusinessService/Infrastructure/Data/BusinessDbContext.cs` (Tạo mới): DbContext kế thừa Npgsql, cấu hình default schema `"business"`.
7. `IELTSMaster.BusinessService/Controllers/TrainingController.cs` (Tạo mới): Cung cấp các API nghiệp vụ: tổng quan, khóa học, lớp học, đề thi.
8. `IELTSMaster.BusinessService/Program.cs` (Tạo mới): Cấu hình `builder.Services.AddDbContext<BusinessDbContext>(options => options.UseNpgsql(...))`.
9. `IELTSMaster.BusinessService/appsettings.json` & `appsettings.Development.json` (Tạo mới): Cấu hình connection string trỏ tới PostgreSQL `lang-simulator`.

### D. Tích hợp Hệ sinh thái
10. `IELTSMaster.sln`: Đã tích hợp `IELTSMaster.BusinessService`.
11. `IELTSMaster.AppHost/AppHost.cs`: Đã đăng ký `BusinessService` vào .NET Aspire.
12. `IELTSMaster.ApiGateway/appsettings.Development.json` & `Program.cs`: Đã định tuyến route `/business/{**catch-all}`.
13. `DATABASE_LOGIN_INFO.md`: Cập nhật tài liệu cấu hình PostgreSQL schemas.

## 4. Lý do thay đổi
* Người dùng lưu ý `AuthService` và hệ sinh thái đào tạo `lang-simulator` vốn chỉ tương thích và thiết kế chuẩn chỉ cho **PostgreSQL**.
* Việc chuyển sang SQL Server ở bước trước là nhầm lẫn do thấy có các bảng backup cũ trong SQL Server. Do đó, cần khôi phục lại chuẩn PostgreSQL, sử dụng database `lang-simulator` có sẵn và phân chia schemas `auth` và `business` trực tiếp trên PostgreSQL.

## 5. Cách xử lý
1. **Kiểm tra hiện trạng PostgreSQL**: Xác nhận database `lang-simulator` trên PostgreSQL có đủ 46 bảng phục vụ cho cả xác thực và đào tạo.
2. **Viết kịch bản PL/pgSQL**: Tạo schema `auth`, schema `business`, duyệt mảng tên bảng để `ALTER TABLE SET SCHEMA`, đồng thời tạo `CREATE OR REPLACE VIEW public.<table> AS SELECT * FROM <schema>.<table>` để tương thích ngược.
3. **Cập nhật AuthService & BusinessService**: Đồng bộ cả 2 microservice sử dụng Npgsql Entity Framework Core trỏ tới đúng 2 schema trên database `lang-simulator`.
4. **Kiểm tra biên dịch**: Chạy lệnh `dotnet build` xác nhận `IELTSMaster.BusinessService` build thành công với 0 Errors.
5. **Kiểm tra dữ liệu**: Chạy query `psql` xác nhận các bảng và view hoạt động chính xác.

## 6. Kết quả sau khi thực hiện
* **PostgreSQL `lang-simulator` (Local port 5432):**
  * Schema `auth`: 6 bảng (`users`, `tenants`, `service_plans`, `memberships`, `membership_roles`, `refresh_tokens`). Tài khoản tối cao: `admin@langsimulator.com` (`SYSTEM_OWNER` / `Admin@123`).
  * Schema `business`: 39 bảng nghiệp vụ (`classrooms`, `courses`, `exams`, `lessons`, `curricula`, v.v.).
  * Schema `public`: 1 bảng (`typeorm_migrations`) + 45 Views trỏ sang `auth` và `business`.
* **Biên dịch `IELTSMaster.BusinessService`**: Thành công 100% (0 Errors).
* **Kiến trúc hệ thống**: Thống nhất chuẩn PostgreSQL, tương thích hoàn toàn với Next.js và NestJS của dự án gốc `lang-simulator`.
