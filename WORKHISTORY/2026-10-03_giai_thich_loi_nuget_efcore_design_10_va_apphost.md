# LỊCH SỬ CÔNG VIỆC: GIẢI THÍCH NGUYÊN NHÂN LỖI NUGET EF CORE DESIGN VÀ HƯỚNG DẪN XỬ LÝ APPHOST

## 1. Nội dung công việc
* **Nhiệm vụ:**
  1. Phân tích nguyên nhân lỗi: `Package Microsoft.EntityFrameworkCore.Design 10.0.12 is not compatible with net8.0 (.NETCoreApp,Version=v8.0)`.
  2. Giải thích lý do **KHÔNG CẦN và KHÔNG ĐƯỢC** cài gói `Microsoft.EntityFrameworkCore.Design` vào `IELTSMaster.AppHost`.
  3. Cung cấp giải pháp đúng đắn để chạy cập nhật database mà không bị phụ thuộc vào `IELTSMaster.AppHost`.

## 2. Thời gian thực hiện
* **Thời gian:** 22:42 - 22:45, Ngày 03/10/2026.

## 3. Các file liên quan
1. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\UPDATE DB COMMAND.txt`
2. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.AppHost\IELTSMaster.AppHost.csproj`
3. `WORKHISTORY/2026-10-03_giai_thich_loi_nuget_efcore_design_10_va_apphost.md` (Tạo mới).

## 4. Nguyên nhân và giải pháp
* **Nguyên nhân 1 (Lỗi tương thích version 10.0.12):**
  - Hệ thống IELTSMaster được cấu hình chạy trên nền tảng **.NET 8.0 (`net8.0`)**.
  - Khi thao tác cài đặt NuGet mà không chỉ định rõ phiên bản, NuGet tự động tải bản mới nhất hiện có trên server là `10.0.12` (dành cho .NET 10 preview), do đó gây xung đột phiên bản.
* **Nguyên nhân 2 (Bản chất của project AppHost):**
  - `IELTSMaster.AppHost` là project điều phối ứng dụng của .NET Aspire, hoàn toàn không chứa `DbContext` hay các bảng cơ sở dữ liệu.
  - Cả 2 gói `Microsoft.EntityFrameworkCore.Design` và `Microsoft.EntityFrameworkCore.Tools` (bản 8.0.11) đã được tích hợp đầy đủ trong `IELTSMaster.AuthService` và `IELTSMaster.BusinessService`.
* **Cách xử lý đúng:**
  - Không cài package vào `AppHost`.
  - Sử dụng câu lệnh tự động nhận diện `StartupProject` ở dòng 12 file `UPDATE DB COMMAND.txt`:
    `$p = (Get-Project).Name; Add-Migration ("Update_" + (Get-Date -Format "yyyyMMdd_HHmmss")) -StartupProject $p; Update-Database -StartupProject $p`
  - Hoặc nếu muốn dùng câu lệnh ngắn `Add-Migration...; Update-Database`, cần chuột phải vào Service trong Solution Explorer chọn "Set as Startup Project".

## 5. Kết quả
* Đã lập tài liệu chi tiết và giải thích tận tường cho người dùng.
* Tuân thủ quy định `rule.md`.
