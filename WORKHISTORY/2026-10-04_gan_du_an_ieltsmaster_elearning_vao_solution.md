# GẮN DỰ ÁN IELTSMASTER.ELEARNING VÀO SOLUTION VÀ HỆ THỐNG MICROSERVICE

## 1. Thời gian thực hiện
- **Thời gian:** 2026-10-04

---

## 2. Mô tả công việc & Vấn đề hiện tại
- **Vấn đề hiện tại:** 
  Trước đó, thư mục `IELTSMaster.ELearning` (kế thừa từ `lang-simulator`) đã nằm trong thư mục nguồn của hệ thống và đã được tích hợp qua YARP ApiGateway, nhưng **chưa được thêm vào file Solution `IELTSMaster.sln`**. Vì vậy, khi người dùng mở Visual Studio, Solution Explorer chỉ hiển thị 6 project C# (.csproj) và **không nhìn thấy `IELTSMaster.ELearning`**.
- **Yêu cầu & Mục tiêu:**
  Đưa `IELTSMaster.ELearning` thành một project chính thức trong Solution Explorer của Visual Studio để lập trình viên có thể nhìn thấy, quản lý mã nguồn, cấu hình và chạy cùng toàn bộ hệ thống microservice.

---

## 3. Các File/Module thực hiện và Lý do thay đổi

| STT | File thay đổi | Module | Lý do thay đổi |
|---|---|---|---|
| 1 | `IELTSMaster.ELearning/IELTSMaster.ELearning.esproj` | E-Learning | Tạo file project Visual Studio JavaScript/TypeScript SDK (`Microsoft.VisualStudio.JavaScript.Sdk`) tương thích chuẩn với Visual Studio. |
| 2 | `IELTSMaster.sln` | Solution | Đăng ký project `IELTSMaster.ELearning.esproj` vào solution để Solution Explorer hiển thị `7 of 7 projects`. |
| 3 | `IELTSMaster.AppHost/AppHost.cs` | Aspire Orchestration | Cập nhật đường dẫn `AddNpmApp` từ đường dẫn ngoài (`../../lang-simulator/apps/lang-api`) sang đường dẫn nội bộ dự án (`../IELTSMaster.ELearning/apps/lang-api`). |

---

## 4. Phương án và Cách thức xử lý

### 4.1. Tạo cấu hình Project Visual Studio (`.esproj`)
Tạo file `IELTSMaster.ELearning/IELTSMaster.ELearning.esproj`:
```xml
<Project Sdk="Microsoft.VisualStudio.JavaScript.Sdk/1.0.2752196">
  <PropertyGroup>
    <StartupCommand>pnpm run dev</StartupCommand>
    <JavaScriptTestRoot>apps\</JavaScriptTestRoot>
    <JavaScriptTestFramework>Jest</JavaScriptTestFramework>
    <!-- Allows the build (or compile) script located on package.json to run on Build -->
    <ShouldRunBuildScript>false</ShouldRunBuildScript>
    <!-- Folder where production build objects will be placed -->
    <BuildOutputFolder>$(MSBuildProjectDirectory)\dist</BuildOutputFolder>
  </PropertyGroup>
</Project>
```

### 4.2. Thêm vào Solution `IELTSMaster.sln`
Sử dụng lệnh CLI .NET chuẩn:
```powershell
dotnet sln IELTSMaster.sln add IELTSMaster.ELearning\IELTSMaster.ELearning.esproj
```
Visual Studio đã nhận diện định danh Project GUID `54A90642-561A-4BB1-A94E-469ADEE60C69` (JavaScript/TypeScript Project System) cho `IELTSMaster.ELearning`.

### 4.3. Cập nhật điều phối trong `IELTSMaster.AppHost`
Điều chỉnh đường dẫn tương đối trong `AppHost.cs`:
```csharp
var elearning = builder.AddNpmApp("ELearning", "../IELTSMaster.ELearning/apps/lang-api", "dev")
    .WithHttpEndpoint(port: 3101, env: "PORT");
```

---

## 5. Kết quả kiểm tra (Test Results)
1. **Kiểm tra Solution:**
   - Solution `IELTSMaster.sln` đã chứa đủ **7 projects**:
     - `IELTSMaster.ApiGateway`
     - `IELTSMaster.AppHost`
     - `IELTSMaster.AuthService`
     - `IELTSMaster.BusinessService`
     - `IELTSMaster.ELearning`
     - `IELTSMaster.FileService`
     - `IELTSMaster.Shared`
2. **Kiểm tra biên dịch:**
   - Chạy `dotnet build IELTSMaster.sln`: Thành công, **0 Lỗi** (`0 Error(s)`).
   - Chạy `dotnet build IELTSMaster.AppHost\IELTSMaster.AppHost.csproj`: Thành công, **0 Lỗi**.
