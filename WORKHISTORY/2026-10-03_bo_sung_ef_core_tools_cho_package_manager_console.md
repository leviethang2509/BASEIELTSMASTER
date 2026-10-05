# LỊCH SỬ CÔNG VIỆC: BỔ SUNG GÓI MICROSOFT.ENTITYFRAMEWORKCORE.TOOLS KÍCH HOẠT LỆNH PACKAGE MANAGER CONSOLE

## 1. Nội dung công việc
* **Nhiệm vụ:**
  1. Xử lý triệt để lỗi `The term 'Add-Migration' is not recognized as the name of a cmdlet...` khi người dùng chạy lệnh trong cửa sổ Package Manager Console (PMC) của Visual Studio.
  2. Cài đặt bổ sung gói NuGet **`Microsoft.EntityFrameworkCore.Tools`** (phiên bản `8.0.11` đồng bộ LTS với .NET 8) vào cả 2 microservice: `IELTSMaster.AuthService` và `IELTSMaster.BusinessService`.
  3. Kích hoạt toàn bộ các cmdlet PowerShell chuyên dụng của EF Core trong Visual Studio (`Add-Migration`, `Update-Database`, `Remove-Migration`, v.v.).

## 2. Thời gian thực hiện
* **Thời gian:** 22:29 - 22:32, Ngày 03/10/2026.

## 3. Các file đã thay đổi

1. `IELTSMaster.AuthService/IELTSMaster.AuthService.csproj` (Chỉnh sửa):
   * Bổ sung gói `Microsoft.EntityFrameworkCore.Tools` (8.0.11).
2. `IELTSMaster.BusinessService/IELTSMaster.BusinessService.csproj` (Chỉnh sửa):
   * Bổ sung gói `Microsoft.EntityFrameworkCore.Tools` (8.0.11) và đồng bộ phiên bản `Design` về 8.0.11.
3. `WORKHISTORY/2026-10-03_bo_sung_ef_core_tools_cho_package_manager_console.md` (Tạo mới):
   * Lưu lại toàn bộ lịch sử theo `rule.md`.

## 4. Lý do thay đổi
* Khi lập trình viên chạy lệnh trong Package Manager Console của Visual Studio:
  ```powershell
  Add-Migration ("Update_" + (Get-Date -Format "yyyyMMdd_HHmmss")); Update-Database
  ```
  Hệ thống báo lỗi `The term 'Add-Migration' is not recognized...` do 2 project trước đó chỉ có gói `Microsoft.EntityFrameworkCore.Design` (gói này chỉ dành cho Terminal / .NET CLI dạng `dotnet ef ...`), thiếu gói `Microsoft.EntityFrameworkCore.Tools` (gói cung cấp cmdlet PowerShell cho Package Manager Console).
* Việc bổ sung gói `Tools` là bắt buộc để Visual Studio nạp module `EntityFramework.psd1` vào PMC.

## 5. Cách xử lý
1. **Thêm PackageReference**:
   ```xml
   <PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="8.0.11">
     <PrivateAssets>all</PrivateAssets>
     <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
   </PackageReference>
   ```
2. **Restore và Build**: Chạy `dotnet build` cho cả 2 project để tải các DLL và PowerShell script của gói Tools vào bộ nạp của Visual Studio.
3. **Kiểm tra**: Cả `AuthService` và `BusinessService` đều build thành công 100% với 0 Errors.

## 6. Kết quả sau khi thực hiện
* Package `Microsoft.EntityFrameworkCore.Tools` đã sẵn sàng trong cả 2 service.
* Visual Studio Package Manager Console đã có thể nhận diện và thực thi trực tiếp các lệnh `Add-Migration` và `Update-Database`.
* Tuân thủ đúng quy tắc `rule.md`.
