# LỊCH SỬ CÔNG VIỆC: KHẮC PHỤC LỖI STARTUP PROJECT APPHOST TRONG PACKAGE MANAGER CONSOLE

## 1. Nội dung công việc
* **Nhiệm vụ:**
  1. Xử lý triệt để thông báo lỗi khi chạy lệnh EF Core trong Package Manager Console (PMC):
     `Your startup project 'IELTSMaster.AppHost' doesn't reference Microsoft.EntityFrameworkCore.Design. This package is required for the Entity Framework Core Tools to work...`
  2. Bổ sung tham số `-StartupProject` vào các file `UPDATE DB COMMAND.txt` để EF Core nhận diện chính xác project khởi động chứa `DbContext` và chuỗi kết nối (`IELTSMaster.AuthService` hoặc `IELTSMaster.BusinessService`), không bị mặc định trỏ nhầm sang dự án điều phối .NET Aspire (`IELTSMaster.AppHost`).

## 2. Thời gian thực hiện
* **Thời gian:** 22:32 - 22:34, Ngày 03/10/2026.

## 3. Các file đã thay đổi
1. `IELTSMaster.AuthService/UPDATE DB COMMAND.txt` (Cập nhật): Bổ sung `-StartupProject IELTSMaster.AuthService`.
2. `IELTSMaster.BusinessService/UPDATE DB COMMAND.txt` (Cập nhật): Bổ sung `-StartupProject IELTSMaster.BusinessService`.
3. `UPDATE DB COMMAND.txt` (Root solution - Cập nhật): Bổ sung cú pháp `$p = (Get-Project).Name; ... -StartupProject $p` để tự động ăn khớp với dropdown Default project.
4. `WORKHISTORY/2026-10-03_khac_phuc_loi_startup_project_apphost_trong_pmc.md` (Tạo mới): Lưu vết lịch sử theo `rule.md`.

## 4. Lý do thay đổi
* Trong Visual Studio, Solution Explorer đang đặt `IELTSMaster.AppHost` làm Startup Project (để chạy F5 toàn bộ hệ thống qua .NET Aspire).
* Khi chạy lệnh EF Core (`Add-Migration`, `Update-Database`) trong PMC mà không chỉ định rõ `-StartupProject`, EF Core sẽ lấy dự án Startup Project hiện tại của Visual Studio (`IELTSMaster.AppHost`). Do `AppHost` chỉ là dự án điều phối, không chứa `DbContext` và không tham chiếu `EntityFrameworkCore.Design` nên sinh ra lỗi.
* Lập trình viên không nên phải đổi Startup Project của Visual Studio qua lại liên tục giữa AppHost và Service. Do đó, việc chỉ định `-StartupProject` trực tiếp trong câu lệnh là phương án chuẩn nhất.

## 5. Cách xử lý
* Cập nhật câu lệnh trong `UPDATE DB COMMAND.txt`:
  * Cho AuthService:
    ```powershell
    Add-Migration ("Update_" + (Get-Date -Format "yyyyMMdd_HHmmss")) -StartupProject IELTSMaster.AuthService; Update-Database -StartupProject IELTSMaster.AuthService
    ```
  * Cho BusinessService:
    ```powershell
    Add-Migration ("Update_" + (Get-Date -Format "yyyyMMdd_HHmmss")) -StartupProject IELTSMaster.BusinessService; Update-Database -StartupProject IELTSMaster.BusinessService
    ```
  * Cho Root (Tự động nhận diện):
    ```powershell
    $p = (Get-Project).Name; Add-Migration ("Update_" + (Get-Date -Format "yyyyMMdd_HHmmss")) -StartupProject $p; Update-Database -StartupProject $p
    ```

## 6. Kết quả sau khi thực hiện
* Lệnh chạy trong PMC hoạt động chuẩn xác, không còn bị phụ thuộc vào việc Visual Studio đang active project nào làm Startup Project.
* Lập trình viên vẫn giữ nguyên `IELTSMaster.AppHost` làm Startup Project trong Solution Explorer để F5 chạy Aspire bình thường.
* Tuân thủ quy tắc `rule.md`.
