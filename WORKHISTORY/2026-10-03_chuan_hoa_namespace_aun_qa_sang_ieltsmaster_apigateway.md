# LỊCH SỬ CÔNG VIỆC: CHUẨN HÓA TOÀN BỘ NAMESPACE AUN_QA.APIGATEWAY THÀNH IELTSMASTER.APIGATEWAY

## 1. Nội dung công việc
* **Nhiệm vụ:**
  - Chuẩn hóa toàn bộ các khai báo `AUN_QA.ApiGateway` thành `IELTSMaster.ApiGateway` theo yêu cầu của người dùng.
  - Đồng bộ `RootNamespace` và namespace trong các file C# của dự án API Gateway để thống nhất kiến trúc và thương hiệu với toàn bộ giải pháp IELTSMaster.
* **Mục tiêu:**
  - Không còn bất kỳ tham chiếu nào mang tên `AUN_QA.ApiGateway`.
  - Dự án build thành công, không phát sinh lỗi biên dịch.

## 2. Thời gian thực hiện
* **Thời gian:** 23:00 - 23:05, Ngày 03/10/2026.

## 3. Các file cần thực hiện
1. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.ApiGateway\IELTSMaster.ApiGateway.csproj`:
   - Đổi `<RootNamespace>AUN_QA.ApiGateway</RootNamespace>` thành `<RootNamespace>IELTSMaster.ApiGateway</RootNamespace>`.
2. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.ApiGateway\Program.cs`:
   - Đổi `using AUN_QA.ApiGateway.Configs;` và `using AUN_QA.ApiGateway.Middlewares;` thành `using IELTSMaster.ApiGateway.Configs;` và `using IELTSMaster.ApiGateway.Middlewares;`.
3. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.ApiGateway\Configs\ConfigService.cs`:
   - Đổi `namespace AUN_QA.ApiGateway.Configs` thành `namespace IELTSMaster.ApiGateway.Configs`.
4. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.ApiGateway\Middlewares\GlobalExceptionHandler.cs`:
   - Đổi `namespace AUN_QA.ApiGateway.Middlewares` thành `namespace IELTSMaster.ApiGateway.Middlewares`.

## 4. Cách thực hiện
1. Dùng công cụ thay thế file content để cập nhật lần lượt 4 file trên.
2. Chạy lệnh `dotnet build IELTSMaster.ApiGateway\IELTSMaster.ApiGateway.csproj` để kiểm tra biên dịch.
3. Chạy lệnh `dotnet build IELTSMaster.sln` để xác nhận toàn bộ solution tương thích hoàn toàn.
4. Ghi nhận kết quả và báo cáo người dùng.

## 5. Kết quả thực hiện
* Đã thay thế thành công 100% các vị trí từ `AUN_QA.ApiGateway` thành `IELTSMaster.ApiGateway`:
  1. `IELTSMaster.ApiGateway.csproj`: Cập nhật `<RootNamespace>IELTSMaster.ApiGateway</RootNamespace>`.
  2. `Program.cs`: Cập nhật các câu lệnh using.
  3. `Configs/ConfigService.cs`: Cập nhật namespace.
  4. `Middlewares/GlobalExceptionHandler.cs`: Cập nhật namespace.
* Kết quả kiểm tra:
  - Lệnh `dotnet build IELTSMaster.ApiGateway\IELTSMaster.ApiGateway.csproj` thành công 100% với **0 Error**.
  - Lệnh `dotnet build IELTSMaster.sln` toàn bộ solution thành công với **0 Error**.
* Tuân thủ quy định `rule.md`.
