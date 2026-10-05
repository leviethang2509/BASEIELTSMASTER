# LỊCH SỬ CÔNG VIỆC: ĐỒNG BỘ .NET 8, BỔ SUNG ROUTE PRODUCTION VÀ CHUẨN HÓA PORT AUTH TRONG APIGATEWAY

## 1. Nội dung công việc
* **Nhiệm vụ:**
  1. **Đồng bộ TargetFramework:** Hạ `TargetFramework` từ `net9.0` về `net8.0` trong `IELTSMaster.ApiGateway.csproj` và cập nhật các package liên quan tương thích .NET 8 để toàn bộ Solution đồng nhất 100% trên .NET 8 LTS.
  2. **Bổ sung Route & Cluster cho môi trường Production:** Cập nhật `appsettings.Production.json` bổ sung đầy đủ `auth-route`, `business-route`, `auth-cluster`, `business-cluster` để tránh lỗi 404 khi chạy Production.
  3. **Chuẩn hóa Port chuyển tiếp đến AuthService:** Đổi port `auth-cluster` từ `7190` sang `7024` (khớp chính xác với port khai báo trong `IELTSMaster.AuthService/Properties/launchSettings.json`).

## 2. Thời gian thực hiện
* **Thời gian:** 23:04 - 23:10, Ngày 03/10/2026.

## 3. Các file cần thực hiện
1. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.ApiGateway\IELTSMaster.ApiGateway.csproj`:
   - Hạ `TargetFramework` về `net8.0`.
   - Cập nhật package `Microsoft.Extensions.ServiceDiscovery.Yarp` về phiên bản tương thích .NET 8 (`9.5.0` tương đương Aspire 9.5 đang dùng trong solution).
2. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.ApiGateway\appsettings.Development.json`:
   - Sửa `auth-cluster` từ `https://localhost:7190/api` thành `https://localhost:7024/api`.
3. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.ApiGateway\appsettings.Production.json`:
   - Thêm `auth-route` và `business-route` vào `ReverseProxy:Routes`.
   - Thêm `auth-cluster` (`https://localhost:7024/api`) và `business-cluster` (`https://localhost:7195/api`) vào `ReverseProxy:Clusters`.

## 4. Cách thực hiện
1. Sửa file `IELTSMaster.ApiGateway.csproj`.
2. Sửa file `appsettings.Development.json`.
3. Sửa file `appsettings.Production.json`.
4. Chạy `dotnet restore` và `dotnet build IELTSMaster.ApiGateway\IELTSMaster.ApiGateway.csproj` để xác minh.
5. Chạy `dotnet build IELTSMaster.sln` để xác minh toàn bộ solution.
6. Cập nhật kết quả vào tài liệu lịch sử này.

## 5. Kết quả thực hiện
1. **Đồng bộ TargetFramework .NET 8 LTS:**
   - `IELTSMaster.ApiGateway.csproj` đã được chuyển sang `<TargetFramework>net8.0</TargetFramework>`.
   - Gói `Microsoft.Extensions.ServiceDiscovery.Yarp` được đồng bộ sang version `9.5.0` hoàn toàn tương thích và đồng bộ với .NET Aspire 9.5 trong toàn hệ thống.
2. **Chuẩn hóa Port chuyển tiếp đến AuthService:**
   - Đã cập nhật `auth-cluster` trong cả `appsettings.Development.json` và `appsettings.Production.json` trỏ về `https://localhost:7024/api` (khớp hoàn toàn với port chạy `https://localhost:7024` trong `launchSettings.json` của `AuthService`).
3. **Bổ sung Route & Cluster cho môi trường Production:**
   - Đã thêm đầy đủ `auth-route`, `business-route` và `auth-cluster`, `business-cluster` vào `appsettings.Production.json`.
4. **Kiểm tra biên dịch:**
   - `dotnet build IELTSMaster.ApiGateway` $\rightarrow$ **Thành công 100% (0 Error)**.
   - `dotnet build IELTSMaster.sln` $\rightarrow$ **Thành công 100% (0 Error)**.
* Tuân thủ quy định `rule.md`.
