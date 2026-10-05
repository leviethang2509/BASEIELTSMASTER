# LỊCH SỬ CÔNG VIỆC: HƯỚNG DẪN XỬ LÝ LỖI "A PROJECT WITH AN OUTPUT TYPE OF CLASS LIBRARY CANNOT BE STARTED DIRECTLY"

## 1. Nội dung công việc
* **Nhiệm vụ:**
  - Giải thích nguyên nhân xuất hiện hộp thoại lỗi Visual Studio: `"A project with an Output Type of Class Library cannot be started directly. In order to debug this project, add an executable project to this solution which references the library project. Set the executable project as the startup project."` khi người dùng bấm F5 / Run.
  - Hướng dẫn thao tác đặt lại Startup Project chuẩn xác trong Solution Explorer.

## 2. Thời gian thực hiện
* **Thời gian:** 23:16 - 23:18, Ngày 03/10/2026.

## 3. Các file liên quan
1. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.AppHost\IELTSMaster.AppHost.csproj`
2. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.ServiceDefaults\IELTSMaster.ServiceDefaults.csproj`
3. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.Shared\IELTSMaster.Shared.csproj`

## 4. Nguyên nhân và cách xử lý
* **Nguyên nhân:**
  - Trong Visual Studio, dự án được in đậm (Startup Project) hiện tại đang là một Class Library (`IELTSMaster.ServiceDefaults` hoặc `IELTSMaster.Shared`).
  - Class Library là thư viện DLL không chứa hàm `Main` khởi chạy độc lập nên không thể bấm F5 trực tiếp.
* **Cách xử lý:**
  - Trong Solution Explorer: Chuột phải vào `IELTSMaster.AppHost` -> Chọn "Set as Startup Project".
  - Bấm F5 để khởi chạy toàn bộ hệ thống qua .NET Aspire.

## 5. Kết quả
* Đã lập tài liệu hướng dẫn và phản hồi trực quan, dễ hiểu cho người dùng.
* Tuân thủ quy định `rule.md`.
