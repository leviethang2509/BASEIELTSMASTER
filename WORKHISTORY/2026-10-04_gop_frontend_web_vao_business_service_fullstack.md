# Gộp Frontend Web vào BusinessService thành dự án Fullstack .NET + React

- **Thời gian thực hiện:** 2026-10-04 03:15 (+07)
- **Nội dung công việc:** Tích hợp mã nguồn Frontend React 19 (`IELTSMaster.Web`) vào bên trong `IELTSMaster.BusinessService` theo mô hình Fullstack SPA (Single Page Application) trong thư mục `ClientApp`. Giữ nguyên `IELTSMaster.Shared` và `IELTSMaster.ServiceDefaults` làm thư viện dùng chung cho các service khác (`AuthService`, `FileService`).
- **Người thực hiện:** Antigravity AI
- **Tuân thủ:** rule.md

---

## Bước 1. Mô tả công việc cần thực hiện
- **Mục tiêu:**
  1. Hợp nhất `IELTSMaster.Web` vào `IELTSMaster.BusinessService` để `BusinessService` vừa phục vụ các API nghiệp vụ đào tạo vừa phục vụ trực tiếp giao diện Frontend React.
  2. Giữ nguyên tính độc lập của `IELTSMaster.Shared` và `IELTSMaster.ServiceDefaults` để `AuthService` và `FileService` không bị phụ thuộc chéo vào Business.
  3. Gỡ bỏ project `IELTSMaster.Web.esproj` khỏi Solution.
  4. Đảm bảo toàn bộ Solution biên dịch thành công 100% với 0 lỗi.

## Bước 2. File/Module đã thực hiện
1. `IELTSMaster.BusinessService/ClientApp/`
   - *Lý do:* Thư mục mới chứa toàn bộ mã nguồn React 19 / Vite của Frontend.
2. `IELTSMaster.BusinessService/IELTSMaster.BusinessService.csproj`
   - *Lý do:* Khai báo `<SpaRoot>ClientApp\</SpaRoot>`, loại trừ `node_modules` và `dist` khỏi quá trình build C#, và cấu hình MSBuild Target `PublishRunWebpack` tự động chạy `npm run build` đóng gói static files vào `wwwroot/` khi `dotnet publish`.
3. `IELTSMaster.BusinessService/Program.cs`
   - *Lý do:* Thêm middleware phục vụ static files và fallback route cho SPA: `UseDefaultFiles()`, `UseStaticFiles()`, `MapFallbackToFile("index.html")`.
4. `IELTSMaster.AppHost/AppHost.cs`
   - *Lý do:* Cập nhật đường dẫn chạy npm Web sang `../IELTSMaster.BusinessService/ClientApp`.
5. `IELTSMaster.sln`
   - *Lý do:* Gỡ bỏ project `IELTSMaster.Web.esproj` thông qua `dotnet sln remove`.
6. Thư mục `IELTSMaster.Web/`
   - *Lý do:* Đã được dọn dẹp sạch sẽ sau khi xác nhận build thành công 100%.

## Bước 3. Chi tiết thực hiện

### 1. Di chuyển mã nguồn Frontend sang BusinessService
- Copy toàn bộ source code từ `IELTSMaster.Web` sang `IELTSMaster.BusinessService/ClientApp`.

### 2. Cấu hình `IELTSMaster.BusinessService.csproj`
```xml
  <PropertyGroup>
    <SpaRoot>ClientApp\</SpaRoot>
    <DefaultItemExcludes>$(DefaultItemExcludes);$(SpaRoot)node_modules\**;$(SpaRoot)dist\**</DefaultItemExcludes>
  </PropertyGroup>

  <Target Name="PublishRunWebpack" AfterTargets="ComputeFilesToPublish">
    <Exec WorkingDirectory="$(SpaRoot)" Command="npm install" />
    <Exec WorkingDirectory="$(SpaRoot)" Command="npm run build" />
    <ItemGroup>
      <DistFiles Include="$(SpaRoot)dist\**" />
      <ResolvedFileToPublish Include="@(DistFiles->'%(FullPath)')" Exclude="@(ResolvedFileToPublish)">
        <RelativePath>wwwroot\%(RecursiveDir)%(FileName)%(Extension)</RelativePath>
        <CopyToPublishDirectory>PreserveNewest</CopyToPublishDirectory>
        <ExcludeFromSingleFile>true</ExcludeFromSingleFile>
      </ResolvedFileToPublish>
    </ItemGroup>
  </Target>
```

### 3. Cấu hình middleware trong `Program.cs`
```csharp
app.UseCors();
app.UseAuthorization();
app.MapControllers();

// Phục vụ Frontend React SPA tĩnh
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");
```

### 4. Cập nhật `AppHost.cs`
```csharp
builder.AddNpmApp("Web", "../IELTSMaster.BusinessService/ClientApp", "dev")
    .WithReference(gateway)
    .WithHttpEndpoint(env: "VITE_DEV_PORT", port: 5173)
    .WithExternalHttpEndpoints();
```

### 5. Kiểm tra và dọn dẹp
1. Chạy `npm run build --prefix IELTSMaster.BusinessService\ClientApp` $\rightarrow$ Thành công tạo bundle `dist/`.
2. Chạy `dotnet sln remove IELTSMaster.Web\IELTSMaster.Web.esproj`.
3. Chạy `dotnet build IELTSMaster.sln` $\rightarrow$ Thành công 0 lỗi.
4. Xoá thư mục cũ `IELTSMaster.Web`.
5. Chạy lại `dotnet build IELTSMaster.sln` $\rightarrow$ **Build Succeeded (0 Error)**.

---

## Bước 4. Kết quả sau khi thực hiện
- `IELTSMaster.BusinessService` hiện tại là một project **Fullstack C# + React** hoàn chỉnh.
- `IELTSMaster.Shared` và `IELTSMaster.ServiceDefaults` được giữ nguyên nguyên vẹn, đảm bảo `AuthService` và `FileService` hoạt động ổn định và độc lập.
- Toàn bộ Solution `IELTSMaster.sln` sạch sẽ, không còn project thừa hay lỗi biên dịch.

## Bước 5. Lưu ý
- Khi phát triển local, Aspire AppHost sẽ tự khởi động dev server của React từ thư mục `BusinessService/ClientApp`.
- Khi publish production, lệnh `dotnet publish IELTSMaster.BusinessService` sẽ tự động biên dịch React vào thư mục `wwwroot` của output, deploy chạy 1 cổng duy nhất.
