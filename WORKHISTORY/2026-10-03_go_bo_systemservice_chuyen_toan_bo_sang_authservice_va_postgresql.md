# LỊCH SỬ CÔNG VIỆC: GỠ BỎ IELTSMASTER.SYSTEMSERVICE VÀ CHUYỂN TOÀN BỘ SANG AUTHSERVICE (POSTGRESQL)

## 1. Nội dung công việc
* **Nhiệm vụ:**
  - Thực hiện gỡ bỏ hoàn toàn dự án `IELTSMaster.SystemService` và `IELTSMaster.SystemService.Tests` (tàn dư SQL Server cũ).
  - Chuẩn hóa toàn bộ hệ thống xác thực, người dùng và phân quyền về một mối duy nhất tại `IELTSMaster.AuthService` trên **PostgreSQL (`lang-simulator`, schema `auth`)**.
  - Độc lập hóa `IELTSMaster.FileService` khỏi `SystemService`.
  - Cập nhật điều phối .NET Aspire trong `IELTSMaster.AppHost/AppHost.cs` và `IELTSMaster.AppHost.csproj`.
  - Cập nhật định tuyến trong `IELTSMaster.ApiGateway` và giải pháp `IELTSMaster.sln`.
  - Cập nhật cấu hình API của `IELTSMaster.Web` trỏ sang `AuthService`.
  - Kiểm tra biên dịch toàn bộ solution đạt 0 Error.

## 2. Thời gian thực hiện
* **Thời gian:** 23:25 - 23:35, Ngày 03/10/2026.

## 3. Các file và module cần thực hiện
1. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.FileService\IELTSMaster.FileService.csproj`:
   - Bỏ reference protobuf sang `SystemService`.
2. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.FileService\Configs\ConfigService.cs`:
   - Bỏ đăng ký gRPC client kết nối tới `SystemService`.
3. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.FileService\Infrastructure\Filters\AuditActionFilter.cs`:
   - Độc lập hóa hoặc ghi log nội bộ thay vì gọi gRPC sang `SystemService`.
4. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.AppHost\AppHost.cs`:
   - Bỏ khai báo `systemService` và các liên kết `WithReference(systemService)`.
5. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.AppHost\IELTSMaster.AppHost.csproj`:
   - Bỏ `<ProjectReference Include="..\IELTSMaster.SystemService\IELTSMaster.SystemService.csproj" />`.
6. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.ApiGateway\appsettings.Development.json` & `appsettings.Production.json`:
   - Bỏ route `system-route` và cluster `system-cluster`.
7. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.sln`:
   - Gỡ bỏ `IELTSMaster.SystemService` và `IELTSMaster.SystemService.Tests`.
8. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.Web\src\config\constants.ts`:
   - Chuyển `API_ENDPOINTS.Auth` sang endpoint của `AuthService` (`/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout`).

## 4. Cách thực hiện
1. Cắt đứt quan hệ phụ thuộc của `FileService` vào `SystemService`.
2. Dọn dẹp `AppHost` và `ApiGateway`.
3. Gỡ bỏ `SystemService` và `SystemService.Tests` khỏi `IELTSMaster.sln`.
4. Cập nhật `constants.ts` trong `IELTSMaster.Web`.
5. Chạy `dotnet build IELTSMaster.sln` xác nhận biên dịch thành công 0 Error.
6. Cập nhật kết quả vào tài liệu lịch sử này.

## 5. Kết quả thực hiện
* **Gỡ bỏ SystemService thành công:**
  1. `IELTSMaster.sln`: Đã gỡ bỏ 2 project `IELTSMaster.SystemService` và `IELTSMaster.SystemService.Tests`.
  2. `IELTSMaster.AppHost`: Đã bỏ liên kết và tham chiếu đến `SystemService`.
  3. `IELTSMaster.FileService`: Đã gỡ bỏ phụ thuộc gRPC client và protobuf audit sang SystemService. `AuditActionFilter` hoạt động độc lập và an toàn.
  4. `IELTSMaster.ApiGateway`: Đã loại bỏ các route `system-route` và cluster `system-cluster` trong cấu hình YARP.
  5. `IELTSMaster.Web`: Cấu hình `API_ENDPOINTS.System.Auth` đã được chuyển hướng trỏ về `IELTSMaster.AuthService` (`/auth/auth/login`, `/auth/auth/register`, `/auth/auth/refresh`, `/auth/auth/logout`, `/auth/auth/me`).
* **Kiểm tra biên dịch:**
  - `npm run build` trên `IELTSMaster.Web`: Thành công 100% (0 Error).
  - `dotnet build IELTSMaster.sln` trên toàn bộ Solution: **Build Succeeded (0 Error)**.
* **Kiến trúc hệ thống mới:**
  - Hoàn toàn thoát ly khỏi Microsoft SQL Server.
  - 100% hệ thống vận hành trên **PostgreSQL (`lang-simulator`)** với 2 schema rõ ràng:
    + Schema `auth`: [IELTSMaster.AuthService](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.AuthService)
    + Schema `business`: [IELTSMaster.BusinessService](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.BusinessService)
* Tuân thủ quy định `rule.md`.
