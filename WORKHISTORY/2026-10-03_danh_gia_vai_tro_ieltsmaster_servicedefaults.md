# LỊCH SỬ CÔNG VIỆC: KHẢO SÁT VÀ ĐÁNH GIÁ DỰ ÁN IELTSMASTER.SERVICEDEFAULTS

## 1. Nội dung công việc
* **Nhiệm vụ:**
  - Khảo sát và đánh giá toàn diện vai trò, tác dụng của dự án `IELTSMaster.ServiceDefaults` trong toàn bộ giải pháp IELTSMaster.
  - Trả lời thắc mắc của lập trình viên: "Dự án này có tác dụng gì, có bị dư thừa không, có nên giữ lại hay xóa bỏ, vì sao?".
  - Tuân thủ quy định `rule.md` trong việc khảo sát, phân tích các giải pháp và tham vấn trước khi can thiệp mã nguồn.

## 2. Thời gian thực hiện
* **Thời gian:** 23:08 - 23:12, Ngày 03/10/2026.

## 3. Các file khảo sát và liên quan
1. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.ServiceDefaults\IELTSMaster.ServiceDefaults.csproj`
2. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.ServiceDefaults\Extensions.cs`
3. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.SystemService\Program.cs`
4. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.FileService\Program.cs`
5. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.AuthService\Program.cs`
6. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.BusinessService\Program.cs`
7. `c:\A_TRUNGTAMTIENGANH\SOURCE_CODE\IELTSMASTER\IELTSMaster.AppHost\AppHost.cs`

## 4. Kết quả phân tích chi tiết

### 4.1. Tác dụng của IELTSMaster.ServiceDefaults
Project này chứa phương thức mở rộng `builder.AddServiceDefaults()`, được gọi ở `Program.cs` của **tất cả 4 Microservices** (`AuthService`, `BusinessService`, `SystemService`, `FileService`). Nó đảm nhận 4 nhiệm vụ cốt lõi:
1. **OpenTelemetry & Distributed Tracing (Giám sát hệ thống):**
   - Thu thập Log, Metrics (CPU, RAM, GC), và Traces (luồng đi của request giữa các service) gửi về **Aspire Dashboard**.
2. **Service Discovery:**
   - Giúp các service tự động tìm thấy nhau qua tên service mà không phụ thuộc IP cứng.
3. **Resilience & Fault Tolerance (Khả năng chịu lỗi bằng Polly):**
   - Tự động thiết lập Retry (thử lại khi mạng chập chờn) và Circuit Breaker (ngắt mạch khi quá tải).
4. **Health Checks (`/health` và `/alive`):**
   - Kiểm tra trạng thái hoạt động của từng service cho Docker/Kubernetes/Aspire.

### 4.2. Tại sao cảm giác dự án này "bị dư"?
- Dự án chỉ có duy nhất 1 file `Extensions.cs` (~110 dòng code), không có Controller, không có DbContext, nên nhìn bề ngoài dễ gây cảm giác "trống trải" hoặc "thừa thãi".

### 4.3. Đánh giá các phương án:
- **Phương án 1 (Khuyên dùng - Giữ lại):** Đây là chuẩn mực kiến trúc kiến tạo của Microsoft .NET Aspire (`*.AppHost` đi kèm `*.ServiceDefaults`). Giữ cho `IELTSMaster.Shared` thuần khiết (chỉ chứa DTOs/Enums), không bị kéo theo các thư viện OpenTelemetry/Hosting nặng nề.
- **Phương án 2 (Gộp vào Shared):** Chuyển `Extensions.cs` vào `IELTSMaster.Shared` và xóa project `ServiceDefaults`. Giảm được 1 project nhưng làm bẩn thư viện DTO.
- **Phương án 3 (Xóa bỏ hoàn toàn):** Không khuyến khích vì sẽ làm tê liệt toàn bộ hệ thống quan sát (Observability/Logging) trên Aspire Dashboard và mất khả năng chịu lỗi mạng giữa các service.

### 4.4. Tồn tại phát hiện:
- Namespace trong `Extensions.cs` vẫn đang là `AUN_QA.ServiceDefaults`. Cần đổi về `IELTSMaster.ServiceDefaults`.
