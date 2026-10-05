# LỊCH SỬ CÔNG VIỆC: ĐÁNH GIÁ CHI TIẾT DỰ ÁN IELTSMASTER.APIGATEWAY VÀ ĐỀ XUẤT TỐI ƯU

## 1. Nội dung công việc
* **Nhiệm vụ:**
  - Thực hiện đánh giá chi tiết chất lượng mã nguồn, cấu hình, kiến trúc, và các điểm bất cập của dự án `IELTSMaster.ApiGateway`.
  - Tuân thủ quy tắc `rule.md`: khảo sát đầy đủ các file, chỉ ra vấn đề hiện tại, nguyên nhân, rủi ro, và đề xuất phương án xử lý trước khi thực hiện.

## 2. Thời gian thực hiện
* **Thời gian:** 22:56 - 22:59, Ngày 03/10/2026.

## 3. Các file khảo sát và đánh giá
1. `IELTSMaster.ApiGateway/IELTSMaster.ApiGateway.csproj`
2. `IELTSMaster.ApiGateway/Program.cs`
3. `IELTSMaster.ApiGateway/Configs/ConfigService.cs`
4. `IELTSMaster.ApiGateway/Middlewares/GlobalExceptionHandler.cs`
5. `IELTSMaster.ApiGateway/appsettings.Development.json`
6. `IELTSMaster.ApiGateway/appsettings.Production.json`
7. `IELTSMaster.ApiGateway/Properties/launchSettings.json`
8. `IELTSMaster.ApiGateway/dotnet-tools.json`

## 4. Kết quả đánh giá chi tiết

### 4.1. Ưu điểm hiện tại
1. **Kiến trúc YARP hiện đại:** Sử dụng `Yarp.ReverseProxy v2.3.0` chính hãng của Microsoft, nhẹ, hiệu năng cao, dễ mở rộng hơn so với Ocelot.
2. **Xử lý Upload dung lượng lớn:** Cấu hình Kestrel và FormOptions nhận tải tới 120MB, phù hợp cho bài thi IELTS Listening (file audio MP3) và tài liệu reading.
3. **Pipeline chuẩn:** Đã có GlobalExceptionHandler, TrustedForwardedHeaders, HealthChecks (`/health`, `/alive`).

### 4.2. Các tồn tại và rủi ro kỹ thuật phát hiện
1. **Xung đột phiên bản TargetFramework (`net9.0` so với `net8.0`):**
   - Solution toàn bộ là .NET 8 (`net8.0`), riêng `ApiGateway` đang chạy `net9.0` và kéo package preview `Microsoft.Extensions.ServiceDiscovery.Yarp 10.0.0`.
   - Nguy cơ: Lỗi build khi chạy trên máy/server chỉ cài .NET 8 SDK.
2. **Thiếu cấu hình định tuyến ở môi trường Production (`appsettings.Production.json`):**
   - Chỉ có route `system` và `file`.
   - **HOÀN TOÀN THIẾU `auth-route` VÀ `business-route`**. Khi triển khai production, mọi chức năng đăng nhập và nghiệp vụ thi cử sẽ báo 404 Not Found.
3. **Lệch Port kết nối đến AuthService:**
   - Trong `appsettings.Development.json`: `auth-cluster` trỏ tới `https://localhost:7190/api`.
   - Trong `IELTSMaster.AuthService/Properties/launchSettings.json`: port chạy thực tế là `https://localhost:7024`.
4. **Namespace còn dính mã nguồn gốc `AUN_QA`:**
   - Cần chuẩn hóa sang `IELTSMaster.ApiGateway` để đồng bộ toàn dự án.
5. **File rác `dotnet-tools.json`:**
   - ApiGateway không chứa database nhưng lại có file cấu hình cài `dotnet-ef 10.0.5`, gây hiểu lầm cho NuGet.

## 5. Đề xuất phương án tối ưu
1. Đồng bộ `TargetFramework` về `net8.0` và package YARP tương thích .NET 8 LTS.
2. Bổ sung ngay `auth-route` và `business-route` vào `appsettings.Production.json`.
3. Đồng bộ port của `AuthService` trong cấu hình Gateway.
4. Xóa bỏ `dotnet-tools.json` không cần thiết.
5. Chuẩn hóa Namespace sang `IELTSMaster.ApiGateway`.
