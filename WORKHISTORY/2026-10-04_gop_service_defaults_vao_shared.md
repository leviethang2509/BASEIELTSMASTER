# Gộp IELTSMaster.ServiceDefaults vào IELTSMaster.Shared

- **Thời gian thực hiện:** 2026-10-04 03:19 (+07)
- **Nội dung công việc:** Tinh gọn giải pháp bằng cách gộp toàn bộ cấu hình hạ tầng Aspire (`Extensions.cs`, OpenTelemetry, HealthChecks, ServiceDiscovery, Resilience) từ `IELTSMaster.ServiceDefaults` vào `IELTSMaster.Shared`. Gỡ bỏ `IELTSMaster.ServiceDefaults` để mỗi microservice chỉ cần reference 1 thư viện `Shared` duy nhất.
- **Người thực hiện:** Antigravity AI
- **Tuân thủ:** rule.md

---

## Bước 1. Mô tả công việc cần thực hiện
- **Vấn đề trước khi xử lý:**
  `IELTSMaster.ServiceDefaults` thực chất chỉ chứa đúng 1 file `Extensions.cs` (~110 dòng). Việc duy trì 1 project riêng khiến mọi microservice (`AuthService`, `BusinessService`, `FileService`) phải tham chiếu 2 project song song (`Shared` và `ServiceDefaults`), làm phân mảnh solution mà không đem lại lợi ích bổ sung nào.
- **Mục tiêu:**
  1. Tích hợp `Extensions.cs` của ServiceDefaults vào thư mục `IELTSMaster.Shared/Aspire/`.
  2. Bổ sung các Package Aspire / OpenTelemetry và `<FrameworkReference Include="Microsoft.AspNetCore.App" />` vào `IELTSMaster.Shared.csproj`.
  3. Gỡ bỏ `ProjectReference` tới `ServiceDefaults` trong `AuthService`, `BusinessService`, `FileService`.
  4. Gỡ bỏ project `IELTSMaster.ServiceDefaults` khỏi Solution `IELTSMaster.sln`.
  5. Xoá bỏ thư mục `IELTSMaster.ServiceDefaults/` sau khi build kiểm tra sạch 100%.

## Bước 2. File/Module đã thực hiện
1. `IELTSMaster.Shared/Aspire/Extensions.cs`:
   - *Lý do:* Tạo mới, chứa các extension methods chuẩn của Aspire (`AddServiceDefaults`, `MapDefaultEndpoints`). Giữ nguyên namespace `AUN_QA.ServiceDefaults` để code trong các file `Program.cs` không bị ảnh hưởng.
2. `IELTSMaster.Shared/IELTSMaster.Shared.csproj`:
   - *Lý do:* Bổ sung `<FrameworkReference Include="Microsoft.AspNetCore.App" />`, `<IsAspireSharedProject>true</IsAspireSharedProject>` và các package: `Microsoft.Extensions.Http.Resilience`, `Microsoft.Extensions.ServiceDiscovery`, `OpenTelemetry.*`.
3. `IELTSMaster.AuthService/IELTSMaster.AuthService.csproj`:
   - *Lý do:* Gỡ bỏ reference tới `ServiceDefaults.csproj` (chỉ giữ `Shared.csproj`).
4. `IELTSMaster.BusinessService/IELTSMaster.BusinessService.csproj`:
   - *Lý do:* Gỡ bỏ reference tới `ServiceDefaults.csproj` (chỉ giữ `Shared.csproj`).
5. `IELTSMaster.FileService/IELTSMaster.FileService.csproj`:
   - *Lý do:* Gỡ bỏ reference tới `ServiceDefaults.csproj` (chỉ giữ `Shared.csproj`).
6. `IELTSMaster.sln`:
   - *Lý do:* Gỡ bỏ project `IELTSMaster.ServiceDefaults` thông qua `dotnet sln remove`.
7. Thư mục `IELTSMaster.ServiceDefaults/`:
   - *Lý do:* Đã được xoá sạch sau khi xác nhận build thành công.

## Bước 3. Chi tiết thực hiện

### 1. Tạo file mở rộng trong `IELTSMaster.Shared`
- File [Extensions.cs](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.Shared/Aspire/Extensions.cs) chứa toàn bộ các phương thức mở rộng cấu hình OpenTelemetry, HealthChecks, HttpClient Resilience.

### 2. Cấu hình `IELTSMaster.Shared.csproj`
```xml
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <RootNamespace>AUN_QA.Shared</RootNamespace>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <IsAspireSharedProject>true</IsAspireSharedProject>
  </PropertyGroup>

  <ItemGroup>
    <FrameworkReference Include="Microsoft.AspNetCore.App" />
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="FluentValidation" Version="11.9.0" />
    <PackageReference Include="Grpc.Net.Client" Version="2.60.0" />
    <PackageReference Include="Microsoft.Extensions.Http.Resilience" Version="9.9.0" />
    <PackageReference Include="Microsoft.Extensions.ServiceDiscovery" Version="9.5.0" />
    <PackageReference Include="OpenTelemetry.Exporter.OpenTelemetryProtocol" Version="1.9.0" />
    <PackageReference Include="OpenTelemetry.Extensions.Hosting" Version="1.9.0" />
    <PackageReference Include="OpenTelemetry.Instrumentation.AspNetCore" Version="1.9.0" />
    <PackageReference Include="OpenTelemetry.Instrumentation.Http" Version="1.9.0" />
    <PackageReference Include="OpenTelemetry.Instrumentation.Runtime" Version="1.9.0" />
  </ItemGroup>
```

### 3. Kiểm tra và dọn dẹp
1. Gỡ bỏ `ProjectReference` trong 3 service: `AuthService`, `BusinessService`, `FileService`.
2. Chạy `dotnet sln remove IELTSMaster.ServiceDefaults\IELTSMaster.ServiceDefaults.csproj`.
3. Chạy `dotnet build IELTSMaster.sln` $\rightarrow$ **Build Succeeded** (0 lỗi).
4. Xoá bỏ thư mục `IELTSMaster.ServiceDefaults`.
5. Chạy lại `dotnet build IELTSMaster.sln` $\rightarrow$ **Build Succeeded (0 Error)**.

---

## Bước 4. Kết quả sau khi thực hiện
- Solution `IELTSMaster.sln` giảm bớt 1 project con rời rạc.
- Thư viện [IELTSMaster.Shared](file:///c:/A_TRUNGTAMTIENGANH/SOURCE_CODE/IELTSMASTER/IELTSMaster.Shared) trở thành thư viện dùng chung duy nhất (cung cấp cả Common DTOs, Security Context và Aspire Infrastructure).
- Các microservice chỉ cần reference 1 project duy nhất `IELTSMaster.Shared`.
- Toàn bộ Solution biên dịch 100% thành công không có bất kỳ lỗi code nào.
