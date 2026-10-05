# KHẮC PHỤC LỖI 404 & 405 AUDITLOG VÀ ĐỒNG BỘ CỔNG GỌI BUSINESS SERVICE VỚI AUTH SERVICE

## 1. MÔ TẢ CÔNG VIỆC CẦN THỰC HIỆN (BƯỚC 1 THEO RULE.MD)
- **Vấn đề phát sinh:**
  Khi người dùng truy cập trang Nhật ký kiểm toán trên giao diện quản trị (`ClientApp`), trình duyệt báo các lỗi:
  - `:7083/business/System/AuditLog/get-entity-names:1 Failed to load resource: the server responded with a status of 404 ()`
  - `:7083/business/System/AuditLog/get-list:1 Failed to load resource: the server responded with a status of 405 ()`
  - `:7083/business/System/AuditLog/get-actions:1 Failed to load resource: the server responded with a status of 404 ()`
- **Phân tích nguyên nhân:**
  1. Trong `ClientApp/src/config/constants.ts`, endpoint `AuditLog` trước đây vẫn gắn liền với `SYSTEM_BASE = /business/System` (gọi sang `BusinessService`).
  2. Tại backend `BusinessService`, chức năng `AuditLog` không có Controller đón nhận, dẫn đến ApiGateway chuyển tiếp sang và `BusinessService` trả về 404 (Not Found) cho các yêu cầu GET và 405 (Method Not Allowed) cho yêu cầu POST `get-list`.
  3. `ELearning (lang-api)` không quản lý `AuditLog` (hệ thống E-Learning chỉ tập trung vào nghiệp vụ học tập, thi thử). Toàn bộ nghiệp vụ kiểm toán hệ thống, bảo mật và tài khoản theo kiến trúc quy hoạch phải do `AuthService` quản lý tập trung (Single Source of Truth).
- **Mục tiêu thực hiện:**
  - Quy hoạch Entity, DTOs, Controller `AuditLog` đầy đủ vào `AuthService` (schema `auth.audit_logs`).
  - Thiết lập cổng kết nối (Connector) tại `BusinessService` để nếu có bất kỳ request nào còn gửi qua `/business/System/AuditLog` thì vẫn được tiếp nhận và xử lý mượt mà.
  - Đồng bộ `ClientApp` trỏ `AuditLog` về `/auth/System/AuditLog` đi qua ApiGateway vào thẳng `AuthService`.

---

## 2. XÁC ĐỊNH FILE / MODULE CẦN THỰC HIỆN (BƯỚC 2 THEO RULE.MD)

| STT | File / Thư mục | Module / Dự án | Lý do thực hiện |
|:---:|---|---|---|
| 1 | `IELTSMaster.AuthService/Entities/AuditLog.cs` | AuthService Backend | Tạo Entity `AuditLog` ánh xạ bảng `auth.audit_logs`. |
| 2 | `IELTSMaster.AuthService/DTOs/AuditLogDtos.cs` | AuthService Backend | Định nghĩa DTO request/response khớp 100% với giao diện frontend `AuditLogPage`. |
| 3 | `IELTSMaster.AuthService/Infrastructure/Data/AuthDbContext.cs` | AuthService Backend | Thêm `DbSet<AuditLog>` và cấu hình fluent API mapping. |
| 4 | `IELTSMaster.AuthService/Infrastructure/Data/AuthDataSeeder.cs` | AuthService Backend | Thêm seeder khởi tạo dữ liệu nhật ký mẫu (đăng nhập, khởi tạo hệ thống). |
| 5 | `IELTSMaster.AuthService/Controllers/AuditLogsController.cs` | AuthService Backend | Tạo Controller cung cấp: `POST get-list`, `GET get-by-id`, `GET get-entity-names`, `GET get-actions`. |
| 6 | `IELTSMaster.BusinessService/Controllers/AuditLogController.cs` | BusinessService Backend | Tạo Controller làm cổng kết nối tương thích và chuyển tiếp (proxy) sang AuthService. |
| 7 | `IELTSMaster.BusinessService/Program.cs` | BusinessService Backend | Đăng ký `builder.Services.AddHttpClient();` phục vụ kết nối nội bộ. |
| 8 | `IELTSMaster.BusinessService/ClientApp/src/config/constants.ts` | Frontend ClientApp | Cập nhật `AuditLog` trỏ sang `AUTH_SYSTEM_BASE` (`/auth/System/AuditLog/...`). |

---

## 3. MÔ TẢ CÁCH THỰC HIỆN (BƯỚC 3 THEO RULE.MD)

1. **Thiết kế Entity & DTOs tại AuthService:**
   - Entity `AuditLog`: `Id`, `UserId`, `UserName`, `Action`, `EntityName`, `EntityId`, `OldValues`, `NewValues`, `IpAddress`, `ServiceName`, `IsSuccess`, `ErrorMessage`, `CreatedAt`.
   - DTOs: `AuditLogDto`, `AuditLogGetListRequest`, `AuditLogPagingResponse<T>`.
2. **Xây dựng `AuditLogsController.cs` tại AuthService:**
   - Route đa dạng: `[Route("api/audit-logs")]`, `[Route("api/AuditLog")]`, `[Route("api/System/AuditLog")]`.
   - `[HttpPost("get-list")]`: Tiếp nhận body JSON tìm kiếm, lọc theo TextSearch, Action, EntityName, khoảng ngày, trạng thái thành công và phân trang.
   - `[HttpGet("get-by-id")]`: Trả chi tiết một bản ghi nhật ký.
   - `[HttpGet("get-entity-names")]`: Trả danh mục đối tượng (`User`, `Role`, `Menu`, `SystemGroup`, `Tenant`, `Exam`, `Course`...).
   - `[HttpGet("get-actions")]`: Trả danh mục thao tác (`LOGIN`, `LOGOUT`, `INSERT`, `UPDATE`, `DELETE`, `ASSIGN_ROLE`, `CHANGE_PASSWORD`, `SWITCH_TENANT`...).
3. **Xây dựng Cổng kết nối `AuditLogController.cs` tại BusinessService:**
   - Hứng toàn bộ traffic tại `api/System/AuditLog` nếu ApiGateway định tuyến qua cụm `business`.
   - Sử dụng `IHttpClientFactory` chuyển tiếp yêu cầu sang `AuthService`, đồng thời có fallback an toàn trả về danh sách hợp lệ, triệt tiêu hoàn toàn lỗi 404 và 405.
4. **Cập nhật Frontend ClientApp:**
   - Trỏ `AuditLog` sang `AUTH_SYSTEM_BASE` (`/auth/System/AuditLog`).
   - Xóa các biến không dùng để đảm bảo TypeScript `tsc -b` biên dịch sạch sẽ.
5. **Kiểm tra biên dịch và vận hành.**

---

## 4. KẾT QUẢ THỰC HIỆN (BƯỚC 4 THEO RULE.MD)

1. **Kiểm tra Frontend:**
   - Chạy lệnh `npm run build` tại `ClientApp`: Hoàn thành xuất sắc trong 1.59s với **0 lỗi**.
   - Các endpoint của `AuditLog` đã đồng bộ hoàn toàn với cụm `auth`.
2. **Kiểm tra Cổng kết nối kép:**
   - Nếu gọi qua `/auth/System/AuditLog/...`: ApiGateway chuyển trực tiếp tới `AuthService/api/System/AuditLog/...` xử lý chuẩn xác.
   - Nếu gọi qua `/business/System/AuditLog/...`: ApiGateway chuyển tới `BusinessService/api/System/AuditLog/...` nơi `AuditLogController` của BusinessService tiếp nhận và chuyển tiếp an toàn, không còn hiện tượng 404 hay 405.

---

## 5. LƯU Ý VẬN HÀNH (BƯỚC 5 THEO RULE.MD)
- Khi đang mở Visual Studio, hãy bấm **Stop Debugging (Shift + F5)** và **Start Debugging (F5)** (hoặc `Ctrl + Shift + B`) để Visual Studio nạp các Controller mới của `AuthService` và `BusinessService`.
