# LỊCH SỬ CÔNG VIỆC: SO SÁNH IELTSMASTER.SERVICEDEFAULTS VÀ IELTSMASTER.SHARED - ĐÁNH GIÁ MỨC ĐỘ CẦN THIẾT

## 1. Nội dung công việc
* **Nhiệm vụ:**
  - Khảo sát và phân tích toàn diện mã nguồn, cấu trúc thư mục, các class và dependencies trong `IELTSMaster.Shared`.
  - So sánh chi tiết sự khác nhau về bản chất, vai trò và mục đích kiến trúc giữa `IELTSMaster.ServiceDefaults` và `IELTSMaster.Shared`.
  - Đánh giá mức độ cần thiết và lý do tồn tại của `IELTSMaster.Shared`.
  - Tuân thủ quy định `rule.md` trong việc khảo sát, phân tích và lập tài liệu.

## 2. Thời gian thực hiện
* **Thời gian:** 23:12 - 23:16, Ngày 03/10/2026.

## 3. Các file khảo sát
1. `IELTSMaster.Shared/IELTSMaster.Shared.csproj`
2. `IELTSMaster.Shared/DTOs/Base/BaseResponse.cs`
3. `IELTSMaster.Shared/DTOs/Base/GetListPagingRequest.cs`
4. `IELTSMaster.Shared/Exceptions/BusinessException.cs`
5. `IELTSMaster.Shared/Security/TenantUserContext.cs`
6. `IELTSMaster.Shared/Security/AuthConstants.cs`
7. `IELTSMaster.Shared/Common/GrpcJwtInterceptor.cs`
8. `IELTSMaster.ServiceDefaults/Extensions.cs`
9. `IELTSMaster.ServiceDefaults/IELTSMaster.ServiceDefaults.csproj`

## 4. Kết quả so sánh chi tiết

### 4.1. Sự khác nhau giữa ServiceDefaults và Shared
| Tiêu chí | IELTSMaster.Shared | IELTSMaster.ServiceDefaults |
| :--- | :--- | :--- |
| **Bản chất** | **Shared Domain / Contract Library** (Thư viện hợp đồng dữ liệu & nghiệp vụ dùng chung). | **Infrastructure / Platform Defaults** (Cấu hình nền tảng hạ tầng & vận hành microservice). |
| **Nhiệm vụ chính** | Định nghĩa format API trao đổi với Frontend (`BaseResponse`), phân trang (`GetListPagingRequest`), ngoại lệ nghiệp vụ (`BusinessException`), phân quyền & User Context (`TenantUserContext`), gRPC Interceptor. | Tích hợp OpenTelemetry (logs/traces/metrics lên Aspire Dashboard), cơ chế chịu lỗi Retry/Circuit Breaker (Polly Resilience), Service Discovery, Health Checks (`/health`, `/alive`). |
| **Cách dùng** | Lập trình viên gọi liên tục trong Controller/Service/Repository hàng ngày. | Chỉ gọi đúng 1 lần duy nhất trong `Program.cs` khi khởi động (`builder.AddServiceDefaults()`). |
| **Độ phủ** | Được tham chiếu bởi 100% các service backend + ApiGateway. | Được tham chiếu bởi 100% các service backend để kết nối với Aspire. |

### 4.2. Mức độ cần thiết của IELTSMaster.Shared
* **Mức độ:** **BẮT BUỘC / SỐNG CÒN (CRITICAL)**.
* **Lý do:**
  1. Nếu không có `Shared`, không thể build được dự án (hàng trăm lỗi biên dịch do thiếu `BaseResponse`, `BaseModel`, `BusinessException`...).
  2. Là cầu nối chuẩn hóa dữ liệu giữa Backend Microservices với Frontend Web React/Vite.
  3. Cung cấp context đăng nhập (`TenantUserContext`) và gRPC token propagation (`GrpcJwtInterceptor`) giữa các microservice.

### 4.3. Kết luận kiến trúc
* Cả 2 project `IELTSMaster.ServiceDefaults` và `IELTSMaster.Shared` đều có vai trò riêng biệt, bổ trợ cho nhau và **bắt buộc phải giữ lại cả hai**:
  - `Shared` lo phần **Dữ liệu & Nghiệp vụ chung (Data & Business Contracts)**.
  - `ServiceDefaults` lo phần **Hạ tầng & Vận hành chung (Observability & Resilience)**.
